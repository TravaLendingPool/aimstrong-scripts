import {formatUnits} from 'ethers';
import {IncentiveController__factory} from '../../typechain-types';
import utils = require('../../utils/utils');
import {user} from '../User/User';

const tokens = [
  {
    chain: 'base',
    token: 'usdt',
    incentiveAddress: '0xC1F85284303bC01a834aFf3784505DA8E32945C3',
    decimals: 6,
  },
  {
    chain: 'base',
    token: 'usdc',
    incentiveAddress: '0x6f29fe66eC1fE0e71fdbaD751327FAe01BF40689',
    decimals: 6,
  },
  {
    chain: 'base',
    token: 'eth',
    incentiveAddress: '0xAB46E791065Ce0DBaFCabe41711615e157B5f92A',
    decimals: 6,
  },
  {
    chain: 'arb1',
    token: 'usdc',
    incentiveAddress: '0xB8e234AAc0eea4225b7Afe6A30C21b3362d48bfa',
    decimals: 6,
  },
  {
    chain: 'arb1',
    token: 'usdt',
    incentiveAddress: '0xa08be3C43875C1E1F89EF7Ad4814Ef6f5aa687eB',
    decimals: 6,
  },
  {
    chain: 'arb1',
    token: 'eth',
    incentiveAddress: '0x9E3907a91329df4bf1905B55450c96bA0bf5D5d2',
    decimals: 6,
  },
];

async function getIncentiveDataUser(address: string) {
  let result = [];

  for (const token of tokens) {
    let provider = utils.getProvider(token.chain);
    let contract = IncentiveController__factory.connect(token.incentiveAddress, provider);
    let reward = await contract.viewReward(address);
    result.push({
      chain: token.chain,
      token: token.token,
      reward: Number(formatUnits(reward, token.decimals)),
    });
  }
  return {
    address: address,
    data: result,
  };
}

class Incentive {
  async ViewIncentiveData() {
    let users = await user.getUsers();
    let sleep = 500;
    let batchSize = 2;
    let allResult: any = [];
    for (let i = 0; i < users.length; i += batchSize) {
      console.log(`Processing batch ${i / batchSize + 1} of ${users.length / batchSize}`);
      let batch = users.slice(i, i + batchSize);
      let batchResult = await Promise.all(
        batch.map(async (user) => {
          return await getIncentiveDataUser(user);
        })
      );
      allResult = [...allResult, ...batchResult];
      await utils.sleep(sleep);
    }
    console.log('indexing...');

    let data = [];
    let totalRewardOnBase = 0;
    let totalRewardOnArbitrum = 0;
    for (const dataUser of allResult) {
      let resultUser: any = {
        address: dataUser.address,
        base_usdt: 0,
        base_usdc: 0,
        base_eth: 0,
        arb1_usdc: 0,
        arb1_usdt: 0,
        arb1_eth: 0,
      };
      for (const data of dataUser.data) {
        if (data.chain === 'base') {
          resultUser[`base_${data.token}`] = data.reward;
          totalRewardOnBase += data.reward;
        }
        if (data.chain === 'arb1') {
          resultUser[`arb1_${data.token}`] = data.reward;
          totalRewardOnArbitrum += data.reward;
        }
      }
      data.push(resultUser);
    }
    console.log('Total reward: ', totalRewardOnBase + totalRewardOnArbitrum);
    console.log('Total reward on Base: ', totalRewardOnBase);
    console.log('Total reward on Arbitrum: ', totalRewardOnArbitrum);

    console.table(data);
  }

  async getIncentiveDataUser() {}
}

export const incentive = new Incentive();

async function test() {
  await incentive.ViewIncentiveData();
}

if (require.main === module) {
  test();
}
