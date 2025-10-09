import {ethers, formatUnits} from 'ethers';
import {ERC20__factory, utils} from '../../typechain-types';
import {getProvider, sleep} from '../../utils/utils';
import {user} from '../User/User';

import {exportDataLendingFunc} from './ExportDataLending';
import {supabase} from '../Supabase/supabase';
import {price} from '../Price/Price';
import {TokenChainSnapshotData, UserTokenChainData} from '../Supabase/Types';
const TOKEN = [
  {
    chain: 'base',
    token: 'usdt',
    t: '0x13DBE2E9293B322d374E6eAc3553e7acD7d32DE6',
    d: '0xebb00b2CC0E46C788Af4167CD27F6a6C5d81CbC3',
    decimals: 6,
  },
  {
    chain: 'base',
    token: 'usdc',
    t: '0x0638581B5B904333Ba34A724c38A8E55a5A56e88',
    d: '0x3f202d59D01119f7B4E46db4b28b60f817a3dCe9',
    decimals: 6,
  },
  {
    chain: 'base',
    token: 'eth',
    t: '0x31b21516cD00F34Df53471de1EE9873ea70F61f0',
    d: '0xa3ea4acD965a98A469921d9Fd119216dB5A26f50',
    decimals: 18,
  },
  {
    chain: 'arb1',
    token: 'usdc',
    t: '0x0638581B5B904333Ba34A724c38A8E55a5A56e88',
    d: '0x3f202d59D01119f7B4E46db4b28b60f817a3dCe9',
    decimals: 6,
  },
  {
    chain: 'arb1',
    token: 'usdt',
    t: '0x13DBE2E9293B322d374E6eAc3553e7acD7d32DE6',
    d: '0xebb00b2CC0E46C788Af4167CD27F6a6C5d81CbC3',
    decimals: 6,
  },
  {
    chain: 'arb1',
    token: 'eth',
    t: '0x31b21516cD00F34Df53471de1EE9873ea70F61f0',
    d: '0xa3ea4acD965a98A469921d9Fd119216dB5A26f50',
    decimals: 18,
  },
];

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

  async crawlDataUser(address: string) {
    let result = [];
    for (const token of TOKEN) {
      let provider = getProvider(token.chain);
      let t = ERC20__factory.connect(token.t, provider);
      let d = ERC20__factory.connect(token.d, provider);
      let [balancet, balanced] = await Promise.all([t.balanceOf(address), d.balanceOf(address)]);
      result.push({
        chain: token.chain,
        token: token.token,
        deposit: Number(formatUnits(balancet, token.decimals)),
        borrow: Number(formatUnits(balanced, token.decimals)),
      });
    }
    return {
      address: address,
      data: result,
    };
  }

  async crawlData(limit: number = 0) {
    let users = await user.getUsers();
    if (limit > 0) {
      users = users.slice(0, Math.min(limit, users.length));
    }
    let sleepTime = 1000;
    let batchSize = 3;
    let allResult: any = [];
    for (let i = 0; i < users.length; i += batchSize) {
      console.log(`Processing batch ${i / batchSize + 1} of ${users.length / batchSize}`);
      let batch = users.slice(i, i + batchSize);
      let batchResult = await Promise.all(
        batch.map(async (user) => {
          return await this.crawlDataUser(user);
        })
      );
      allResult = [...allResult, ...batchResult];
      await sleep(sleepTime);
    }
    return allResult;
  }

  async exportDataLending() {
    return await exportDataLendingFunc();
  }

  async updateDataToSupabase() {
    let totalIndexData = {
      total_supplied_usd: 0,
      total_borrowed_usd: 0,
      suppliers_count: 0,
      borrowers_count: 0,
      suppliers: new Set<string>(),
      borrowers: new Set<string>(),
    };

    let listUser = await supabase.getListUser();
    let listTokenChain = await supabase.getListTokenChain();

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

            await supabase.updateUserTokenChain(userTokenChainData);

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
      await supabase.createRecordTokenChainSnapshot(tokenChainData);
    }

    totalIndexData.suppliers_count = totalIndexData.suppliers.size;
    totalIndexData.borrowers_count = totalIndexData.borrowers.size;
    totalIndexData.total_supplied_usd = totalIndexData.total_supplied_usd;
    totalIndexData.total_borrowed_usd = totalIndexData.total_borrowed_usd;
    await supabase.createRecodeTotalIndexSnapshot({
      total_supplied_usd: totalIndexData.total_supplied_usd,
      total_borrowed_usd: totalIndexData.total_borrowed_usd,
      suppliers_count: totalIndexData.suppliers_count,
      borrowers_count: totalIndexData.borrowers_count,
    });
  }
}

export const lending = new Lending();

async function test() {
  let data = await lending.updateDataToSupabase();
}
if (require.main === module) {
  test();
}
