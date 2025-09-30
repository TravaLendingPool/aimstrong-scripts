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

  private async writeFile(data: any) {
    let timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');
    const logDir = path.join(process.cwd(), 'logs/lending'); // thư mục logs ở root project
    const filePath = path.join(logDir, `lending-${timestamp}.json`);

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, {recursive: true});
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  async crawlData() {
    let users = await user.getUsers();
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
    let resultx = [];
    for (const token of TOKEN) {
      let result = {
        chain: token.chain,
        token: token.token,
        totalDeposit: 0,
        totalBorrow: 0,
        data: [] as any[],
      };
      for (const user of allResult) {
        let data = user.data;
        for (const tokenData of data) {
          if (
            tokenData.chain === token.chain &&
            tokenData.token === token.token &&
            (tokenData.deposit > 0 || tokenData.borrow > 0)
          ) {
            result.totalDeposit += tokenData.deposit;
            result.totalBorrow += tokenData.borrow;
            result.data.push({
              address: user.address,
              deposit: tokenData.deposit,
              borrow: tokenData.borrow,
            });
            break;
          }
        }
      }
      resultx.push(result);
    }
    this.writeFile(resultx);
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
