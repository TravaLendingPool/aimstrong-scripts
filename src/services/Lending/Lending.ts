import {ethers, formatUnits} from 'ethers';
import {ERC20__factory, utils} from '../../typechain-types';
import {getProvider, sleep} from '../../utils/utils';

import {supabase} from '../Supabase/supabase';
import {price} from '../Price/Price';
import {TokenChainSnapshotData, UserTokenChainData} from '../Supabase/Types';

export class Lending {
  async crawDataUserWithTokenAndChain(address: string, interestBearingToken: string, debtToken: string, chain: string) {
    let provider = getProvider(chain.toLocaleLowerCase());

    let t = ERC20__factory.connect(interestBearingToken, provider);
    let d = ERC20__factory.connect(debtToken, provider);
    let [balancet, balanced] = await Promise.all([t.balanceOf(address), d.balanceOf(address)]);
    return {
      chain: chain,
      user: address,
      deposit: balancet,
      borrow: balanced,
    };
  }

  async updateDataToSupabase(write: boolean = true, limit: number = 0) {
    let totalIndexData = {
      total_supplied_usd: 0,
      total_borrowed_usd: 0,
      suppliers_count: 0,
      borrowers_count: 0,
      suppliers: new Set<string>(),
      borrowers: new Set<string>(),
    };

    let listUser = await supabase.getListUser();
    if (limit > 0) {
      listUser = listUser.slice(0, Math.min(limit, listUser.length));
    }
    let listTokenChain = await supabase.getListTokenChain();

    let dataByUser = new Map<
      string,
      {
        totalSuppliedUSD: number;
        totalBorrowedUSD: number;
        data: Map<
          string,
          {
            supplied: number;
            borrowed: number;
            suppliedUSD: number;
            borrowedUSD: number;
          }
        >;
      }
    >();

    for (let ii = 0; ii < listTokenChain!.length; ii++) {
      let tokenChain = listTokenChain![ii];

      let tokenData = await supabase.getTokenById(tokenChain.token_id);
      let chainData = await supabase.getChainById(tokenChain.chain_id);
      console.log(`crawling data ${tokenData.symbol} on ${chainData.name} `);
      let priceData = await price.getPrice(tokenData.symbol.toLowerCase());
      let sleepTime = 1000;
      let batchSize = 5;
      let tokenChainDataCache = {
        total_supplied: 0,
        total_borrowed: 0,
        suppliers_count: 0,
        borrowers_count: 0,
      };
      for (let i = 0; i < listUser.length; i += batchSize) {
        let batch = listUser.slice(i, i + batchSize);
        console.log(`crawing ${Math.ceil(i / batchSize)} / ${Math.ceil(listUser.length / batchSize)}`);
        let batchResult = await Promise.all(
          batch.map(async (user) => {
            return {
              user: user,
              data: await lending.crawDataUserWithTokenAndChain(
                user.address,
                tokenChain.interest_bearing_token,
                tokenChain.debt_token,
                chainData.name
              ),
            };
          })
        );
        batchResult.forEach(async (e) => {
          let recordByUser = dataByUser.get(e.user.address);
          if (!recordByUser) {
            recordByUser = {
              totalSuppliedUSD: 0,
              totalBorrowedUSD: 0,
              data: new Map(),
            };
          }
          recordByUser.totalSuppliedUSD += Number(formatUnits(e.data.deposit, tokenChain.decimals)) * priceData;
          recordByUser.totalBorrowedUSD += Number(formatUnits(e.data.borrow, tokenChain.decimals)) * priceData;
          recordByUser.data.set(`${tokenData.symbol}-${chainData.name}`, {
            supplied: Number(formatUnits(e.data.deposit, tokenChain.decimals)),
            borrowed: Number(formatUnits(e.data.borrow, tokenChain.decimals)),
            suppliedUSD: Number(formatUnits(e.data.deposit, tokenChain.decimals)) * priceData,
            borrowedUSD: Number(formatUnits(e.data.borrow, tokenChain.decimals)) * priceData,
          });

          dataByUser.set(e.user.address, recordByUser);

          if (e.data.deposit > 0n || e.data.borrow > 0n) {
            let amount_supplied = Number(formatUnits(e.data.deposit, tokenChain.decimals));
            let amount_borrowed = Number(formatUnits(e.data.borrow, tokenChain.decimals));
            let amount_supplied_usd = amount_supplied * priceData;
            let amount_borrowed_usd = amount_borrowed * priceData;
            let userTokenChainData: UserTokenChainData = {
              user_id: e.user.id,
              token_chain_id: tokenChain.id,
              amount_supplied: amount_supplied,
              amount_borrowed: amount_borrowed,
              amount_supplied_usd: amount_supplied_usd,
              amount_borrowed_usd: amount_borrowed_usd,
            };

            if (write) await supabase.updateUserTokenChain(userTokenChainData);

            tokenChainDataCache.total_supplied += amount_supplied;
            tokenChainDataCache.total_borrowed += amount_borrowed;
            tokenChainDataCache.suppliers_count += e.data.deposit > 0 ? 1 : 0;
            tokenChainDataCache.borrowers_count += e.data.borrow > 0 ? 1 : 0;

            totalIndexData.total_supplied_usd += amount_supplied_usd;
            totalIndexData.total_borrowed_usd += amount_borrowed_usd;
            if (e.data.deposit > 0) totalIndexData.suppliers.add(e.user.address);
            if (e.data.borrow > 0) totalIndexData.borrowers.add(e.user.address);
          }
        });
        await sleep(sleepTime);
      }

      let tokenChainData: TokenChainSnapshotData = {
        token_chain_id: tokenChain.id,
        total_supplied: tokenChainDataCache.total_supplied,
        total_borrowed: tokenChainDataCache.total_borrowed,
        total_supplied_usd: tokenChainDataCache.total_supplied * priceData,
        total_borrowed_usd: tokenChainDataCache.total_borrowed * priceData,
        suppliers_count: tokenChainDataCache.suppliers_count,
        borrowers_count: tokenChainDataCache.borrowers_count,
      };
      if (write) await supabase.createRecordTokenChainSnapshot(tokenChainData);
      if (write)
        await supabase.updateRecordTokenChain({
          ...tokenChain,
          total_supplied: tokenChainDataCache.total_supplied,
          total_borrowed: tokenChainDataCache.total_borrowed,
          total_supplied_usd: tokenChainDataCache.total_supplied * priceData,
          total_borrowed_usd: tokenChainDataCache.total_borrowed * priceData,
          suppliers_count: tokenChainDataCache.suppliers_count,
          borrowers_count: tokenChainDataCache.borrowers_count,
        });
    }

    totalIndexData.suppliers_count = totalIndexData.suppliers.size;
    totalIndexData.borrowers_count = totalIndexData.borrowers.size;
    totalIndexData.total_supplied_usd = totalIndexData.total_supplied_usd;
    totalIndexData.total_borrowed_usd = totalIndexData.total_borrowed_usd;
    if (write)
      await supabase.createRecodeTotalIndexSnapshot({
        total_supplied_usd: totalIndexData.total_supplied_usd,
        total_borrowed_usd: totalIndexData.total_borrowed_usd,
        suppliers_count: totalIndexData.suppliers_count,
        borrowers_count: totalIndexData.borrowers_count,
      });
    return dataByUser;
  }

  async viewFromUpdateDataToSupabase(
    data: Map<
      string,
      {
        totalSuppliedUSD: number;
        totalBorrowedUSD: number;
        data: Map<
          string,
          {
            supplied: number;
            borrowed: number;
            suppliedUSD: number;
            borrowedUSD: number;
          }
        >;
      }
    >,
    exportFile: boolean = false
  ) {
    let result: any[] = [];
    let listChain = await supabase.getListChain();
    let listTokenByChain = new Map<string, string[]>();
    let listTokenById = new Map<number, string>();

    for (let i = 0; i < listChain.length; i++) {
      let getListTokenByChain = await supabase.getListTokenByChain(listChain[i].id);
      // crawl listTokenById
      for (let j = 0; j < getListTokenByChain.length; j++) {
        let have = listTokenById.get(getListTokenByChain[j].token_id);
        if (!have) {
          let dataToken = await supabase.getTokenById(getListTokenByChain[j].token_id);
          listTokenById.set(getListTokenByChain[j].token_id, dataToken.symbol);
        }
      }
      let result: string[] = [];
      getListTokenByChain.forEach((e) => {
        result.push(listTokenById.get(e.token_id)!);
      });
      listTokenByChain.set(listChain[i].name, result);
    }

    console.table(listTokenByChain);

    for (const [key, value] of data) {
      let dataUser: {
        [key: string]: any;
      } = {
        address: key,
        suppliedUSD: value.totalSuppliedUSD,
        borrowedUSD: value.totalBorrowedUSD,
      };
      console.log(value);
      for (let i = 0; i < listTokenByChain.size; i++) {
        let getListTokenByChain = listTokenByChain.get(listChain[i].name);
        for (let j = 0; j < getListTokenByChain!.length; j++) {
          let dataToken = value.data.get(`${getListTokenByChain![j]}-${listChain[i].name}`);
          console.log(`${key} ${getListTokenByChain![j]}-${listChain[i].name} ${dataToken}`);
        }
      }
      result.push(dataUser);
    }
    console.table(result);
  }

  async exportDataFromUpdateDataToSupabase(
    data: Map<
      string,
      {
        totalSuppliedUSD: number;
        totalBorrowedUSD: number;
        data: Map<
          string,
          {
            supplied: number;
            borrowed: number;
            suppliedUSD: number;
            borrowedUSD: number;
          }
        >;
      }
    >
  ) {
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, '../../../dataByUser.json'); // adjust path if needed

    // Chuyển Map thành mảng, bao gồm cả Map bên trong
    const arr: any[] = [];
    for (const [key, value] of data.entries()) {
      // Chuyển đổi Map bên trong thành mảng
      const dataArr: any[] = [];
      for (const [dataKey, dataValue] of value.data.entries()) {
        dataArr.push({
          tokenChain: dataKey,
          ...dataValue,
        });
      }

      arr.push({
        address: key,
        totalSuppliedUSD: value.totalSuppliedUSD,
        totalBorrowedUSD: value.totalBorrowedUSD,
        data: dataArr,
      });
    }

    // Ghi ra file JSON
    fs.writeFileSync(outputPath, JSON.stringify(arr, null, 2), 'utf-8');
    console.log('Đã ghi dataByUser.json:', arr);
  }
}

export const lending = new Lending();

async function test() {
  let data = await lending.updateDataToSupabase(false, 2);
  console.log(data);
}
if (require.main === module) {
  test();
}
