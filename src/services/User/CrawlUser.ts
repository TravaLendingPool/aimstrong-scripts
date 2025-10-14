import {config} from 'dotenv';

config({path: '.env'});
config({path: './addr.env'});
config({path: './events.env'});
import {add, uniq, uniqBy} from 'lodash';

interface ChainConfig {
  name: string;
  chainId: string;
  contractAddress: string;
  fromBlock: string;
}

const chains: ChainConfig[] = [
  {
    name: 'arb1',
    chainId: '42161',
    contractAddress: '0x7c94606f2240E61E242D14Ed984Aa38FA4C79c0C',
    fromBlock: '338332000',
  },
  {
    name: 'base',
    chainId: '8453',
    contractAddress: '0x7c94606f2240E61E242D14Ed984Aa38FA4C79c0C',
    fromBlock: '30479000',
  },
  {
    name: 'bnb',
    chainId: '56',
    contractAddress: '0xA0a61cFa5798976b0064fBbFfc73dc81080d929F',
    fromBlock: '60400000',
  },
];

const TO_BLOCK = 'latest';
const BASE_URL = 'https://api.etherscan.io/v2/api';

async function fetchLogs(chain: ChainConfig, name: string, topic: string): Promise<string[]> {
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');

  let fromBlock = chain.fromBlock;

  const url = new URL(BASE_URL);
  url.searchParams.set('module', 'logs');
  url.searchParams.set('action', 'getLogs');
  url.searchParams.set('chainid', chain.chainId);
  url.searchParams.set('address', chain.contractAddress);
  url.searchParams.set('fromBlock', fromBlock);
  url.searchParams.set('toBlock', TO_BLOCK);
  url.searchParams.set('topic0', topic);
  url.searchParams.set('apikey', process.env.ETHERSCAN_API_KEY!);
  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    let result = data.result.map((item: any) => extractUserFromLog(item, name));
    result = uniq(result);
    return result;
  } catch (err) {
    throw err;
  }
}

const events = ['Deposit'];

export async function getListUser() {
  // Sửa lại để đồng bộ, gom kết quả của tất cả các chain và event, trả về sau khi hoàn thành hết
  const allResults: any[] = [];

  for (const chain of chains) {
    console.log(`\n=== Fetching logs for ${chain.name} (Chain ID: ${chain.chainId}) ===`);
    let dataChain: any = [];
    for (const event of events) {
      const sig = process.env[event];
      if (sig) {
        // Đợi fetchLogs xong mới xử lý tiếp
        let data = await fetchLogs(chain, event, sig);
        dataChain = [...dataChain, ...data];
      }
    }

    allResults.push(...dataChain);
  }
  return uniq(allResults);
}

function extractUserFromLog(log: any, eventName: string): string | null {
  try {
    let rawAddress: string | null = null;

    switch (eventName) {
      case 'Deposit':
        if (log.topics && log.topics[2]) {
          rawAddress = log.topics[2];
        }
        break;

      case 'Withdraw':
      case 'Borrow':
      case 'Repay':
        if (log.topics && log.topics[2]) {
          rawAddress = log.topics[2];
        }
        break;
    }

    if (rawAddress) {
      const hex = rawAddress.replace('0x', '');
      const address = '0x' + hex.slice(-40);
      return address.toLowerCase();
    }

    return null;
  } catch (err) {
    return null;
  }
}

async function test() {
  let users = await getListUser();
  console.log(users);
}

if (require.main === module) {
  test();
}
