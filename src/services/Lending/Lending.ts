import {ethers, formatUnits} from 'ethers';
import {ERC20__factory, utils} from '../../typechain-types';
import {getProvider, sleep} from '../../utils/utils';
import {user} from '../User/User';

import fs from 'fs';
import path from 'path';
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

  private getTokenPrice(token: string): number {
    const prices: {[key: string]: number} = {
      usdc: 1,
      usdt: 1,
      eth: 3200,
      bnb: 600,
    };
    return prices[token.toLowerCase()] || 1;
  }

  private getTokenName(token: string): string {
    const names: {[key: string]: string} = {
      usdc: 'USD Coin',
      usdt: 'Tether',
      eth: 'Ethereum',
      bnb: 'Binance Coin',
    };
    return names[token.toLowerCase()] || token.toUpperCase();
  }

  private getChainName(chain: string): string {
    const chainNames: {[key: string]: string} = {
      base: 'Base',
      arb1: 'Arbitrum',
      bnb: 'BNB',
    };
    return chainNames[chain.toLowerCase()] || chain;
  }

  private getTokenAPY(token: string): number {
    const apys: {[key: string]: number} = {
      usdc: 2.8,
      usdt: 2.6,
      eth: 3.5,
      bnb: 2.1,
    };
    return apys[token.toLowerCase()] || 2.5;
  }

  private updateDataStructure(existingData: any, newData: any) {
    const currentTime = Date.now();

    // Calculate total values across all tokens
    let totalBorrowUsd = 0;
    let totalSupplyUsd = 0;
    let totalBorrow = 0;
    let totalSupply = 0;
    let supplyUsers = 0;
    let borrowUsers = 0;

    // Update tokenData
    for (const tokenResult of newData) {
      const tokenInfo = TOKEN.find((t) => t.chain === tokenResult.chain && t.token === tokenResult.token);
      if (!tokenInfo) continue;

      const priceUSD = this.getTokenPrice(tokenResult.token);
      const totalSupplyUsdValue = tokenResult.totalDeposit * priceUSD;
      const totalBorrowUsdValue = tokenResult.totalBorrow * priceUSD;

      totalBorrowUsd += totalBorrowUsdValue;
      totalSupplyUsd += totalSupplyUsdValue;
      totalBorrow += tokenResult.totalBorrow;
      totalSupply += tokenResult.totalDeposit;

      // Count unique users
      const uniqueUsers = new Set(tokenResult.data.map((d: any) => d.address));
      supplyUsers += tokenResult.data.filter((d: any) => d.deposit > 0).length;
      borrowUsers += tokenResult.data.filter((d: any) => d.borrow > 0).length;

      // Find or create token in tokenData
      let tokenData = existingData.tokenData.find(
        (t: any) => t.symbol?.toLowerCase() === tokenResult.token.toUpperCase()
      );

      if (!tokenData) {
        tokenData = {
          id: (existingData.tokenData.length + 1).toString(),
          name: this.getTokenName(tokenResult.token),
          symbol: tokenResult.token.toUpperCase(),
          priceUSD: priceUSD,
          totalSupply: tokenResult.totalDeposit,
          totalBorrow: tokenResult.totalBorrow,
          chains: [this.getChainName(tokenResult.chain)],
          chainDetails: [],
        };
        existingData.tokenData.push(tokenData);
      } else {
        // Update existing token totals
        tokenData.totalSupply = tokenResult.totalDeposit;
        tokenData.totalBorrow = tokenResult.totalBorrow;
      }

      // Find or create chain details
      let chainDetail = tokenData.chainDetails.find((c: any) => c.chain === this.getChainName(tokenResult.chain));

      if (!chainDetail) {
        chainDetail = {
          chain: this.getChainName(tokenResult.chain),
          totalSupply: tokenResult.totalDeposit,
          totalBorrow: tokenResult.totalBorrow,
          apy: this.getTokenAPY(tokenResult.token),
          apySupply: this.getTokenAPY(tokenResult.token) * 0.8,
          apyBorrow: this.getTokenAPY(tokenResult.token) * 1.2,
          utilizationRate:
            tokenResult.totalDeposit > 0 ? (tokenResult.totalBorrow / tokenResult.totalDeposit) * 100 : 0,
          chartData: [],
          userData: tokenResult.data.map((user: any) => ({
            address: user.address,
            nickname: null,
            amountSupply: user.deposit,
            amountBorrow: user.borrow,
          })),
        };
        tokenData.chainDetails.push(chainDetail);
      } else {
        // Update existing chain details
        chainDetail.totalSupply = tokenResult.totalDeposit;
        chainDetail.totalBorrow = tokenResult.totalBorrow;
        chainDetail.utilizationRate =
          tokenResult.totalDeposit > 0 ? (tokenResult.totalBorrow / tokenResult.totalDeposit) * 100 : 0;
        chainDetail.userData = tokenResult.data.map((user: any) => ({
          address: user.address,
          nickname: null,
          amountSupply: user.deposit,
          amountBorrow: user.borrow,
        }));

        // Add new chart data point
        chainDetail.chartData.push({
          time: currentTime,
          totalSupply: tokenResult.totalDeposit,
          totalBorrow: tokenResult.totalBorrow,
          totalSupplyUsd: totalSupplyUsdValue,
          totalBorrowUsd: totalBorrowUsdValue,
          supplyUsers: tokenResult.data.filter((d: any) => d.deposit > 0).length,
          borrowUsers: tokenResult.data.filter((d: any) => d.borrow > 0).length,
        });

        // Keep only last 7 data points
        if (chainDetail.chartData.length > 7) {
          chainDetail.chartData = chainDetail.chartData.slice(-7);
        }
      }
    }

    // Update current values
    existingData.currentValues = {
      totalBorrow: totalBorrow,
      totalSupply: totalSupply,
    };

    // Add new chart data point
    existingData.chartData.push({
      time: currentTime,
      totalBorrowUsd: totalBorrowUsd,
      totalSupplyUsd: totalSupplyUsd,
      totalBorrow: totalBorrow,
      totalSupply: totalSupply,
      supplyUsers: supplyUsers,
      borrowUsers: borrowUsers,
    });

    // Keep only last 7 data points
    if (existingData.chartData.length > 7) {
      existingData.chartData = existingData.chartData.slice(-7);
    }
  }

  private async writeFile(data: any) {
    const dataFilePath = path.join(process.cwd(), 'data/data.json');

    // Read existing data or create new structure
    let existingData: any = {};
    if (fs.existsSync(dataFilePath)) {
      try {
        const fileContent = fs.readFileSync(dataFilePath, 'utf8');
        existingData = JSON.parse(fileContent);
      } catch (error) {
        console.log('Error reading existing data file, creating new structure');
        existingData = {
          chartData: [],
          currentValues: {totalBorrow: 0, totalSupply: 0},
          tokenData: [],
        };
      }
    } else {
      existingData = {
        chartData: [],
        currentValues: {totalBorrow: 0, totalSupply: 0},
        tokenData: [],
      };
    }

    // // Update data structure
    // this.updateDataStructure(existingData, data);

    // // Write updated data back to file
    // fs.writeFileSync(dataFilePath, JSON.stringify(existingData, null, 2));
    // console.log('Data updated successfully in data.json');
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
}

export const lending = new Lending();

async function test() {
  let data = await lending.crawlData();
  console.log(data);
}
if (require.main === module) {
  test();
}
