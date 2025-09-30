import {IncentiveController, IncentiveController__factory} from '../../typechain-types';
import utils = require('../../utils/utils');

const data = [
  {
    chain: 'base',
    token: 'usdt',
    incentiveAddress: '0xC1F85284303bC01a834aFf3784505DA8E32945C3',
  },
];

async function getRewardBatch(addresses: string[], contract: IncentiveController) {
  const result = [];
  let batch_size = 5;
  for (let i = 0; i < addresses.length; i += batch_size) {
    let batch = addresses.slice(i, i + batch_size);
    const batchPromises = batch.map(async (address) => {
      let reward = await contract.viewReward(address);
      return {address, reward};
    });
    const batchResults = await Promise.all(batchPromises);
    result.push(batchResults);
  }
  return result;
}

async function getAddessBatch(contract: IncentiveController) {
  let userCount = await contract.totalStaker();
  let batchSize = 5;

  for (let i = 0; i < userCount; i += batchSize) {
    let batch = addresses.slice(i, i + batchSize);
    const batchPromises = batch.map(async (address) => {
      let reward = await contract.stakers(address);
      return {address, reward};
    });
    const batchResults = await Promise.all(batchPromises);
    result.push(batchResults);
  }
  return result;
}

async function getIncentiveDataFromPool(data: {chain: string; token: string; incentiveAddress: string}) {
  const {chain, token, incentiveAddress} = data;
  let provider = utils.getProvider(chain);
  let contract = IncentiveController__factory.connect(incentiveAddress, provider);

  let userCount = await contract.totalStaker();

  console.log(userCount);

  // let data2 = await getRewardBatch(userCount, contract);
}

class Incentive {
  async getIncentiveData() {
    await getIncentiveDataFromPool(data[0]);
  }
}

export const incentive = new Incentive();
