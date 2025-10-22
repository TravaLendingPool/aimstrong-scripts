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
    chain: 'base',
    token: 'btc',
    incentiveAddress: '0x73414Bf6a36eD1d52e8A62458A94fDa046A5C599',
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
  {
    chain: 'arb1',
    token: 'btc',
    incentiveAddress: '0xbCf0DE6f9782A04A953633873C4987c0FC976846',
    decimals: 6,
  },
  {
    chain: 'bnb',
    token: 'usdc',
    incentiveAddress: '0x5943b07E46511B13b0FB167A2a93a8D8dFfB958A',
    decimals: 18,
  },
  {
    chain: 'bnb',
    token: 'usdt',
    incentiveAddress: '0x3Fff357de53C7A08D8002298b7b14818959Ba36B',
    decimals: 18,
  },
  {
    chain: 'bnb',
    token: 'bnb',
    incentiveAddress: '0x05cC1d98bCe5CB60c9c4aD4c6dEA89Ef11fE28F4',
    decimals: 18,
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
    let users = await user.getListUserAndSaveToSupabase();
    let sleep = 500;
    let batchSize = 5;
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
    let totalRewardOnBnb = 0;
    for (const dataUser of allResult) {
      let resultUser: any = {
        address: dataUser.address,
        base_usdt: 0,
        base_usdc: 0,
        base_eth: 0,
        base_btc: 0,
        arb1_usdc: 0,
        arb1_usdt: 0,
        arb1_eth: 0,
        arb1_btc: 0,
        bnb_usdc: 0,
        bnb_usdt: 0,
        bnb_bnb: 0,
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
        if (data.chain === 'bnb') {
          resultUser[`bnb_${data.token}`] = data.reward;
          totalRewardOnBnb += data.reward;
        }
      }
      data.push(resultUser);
    }
    console.log('Total reward: ', totalRewardOnBase + totalRewardOnArbitrum + totalRewardOnBnb);
    console.log('Total reward on Base: ', totalRewardOnBase);
    console.log('Total reward on Arbitrum: ', totalRewardOnArbitrum);
    console.log('Total reward on BNB: ', totalRewardOnBnb);
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
