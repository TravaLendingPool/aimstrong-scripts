import {lending} from './Lending';

import fs from 'fs';
import path from 'path';
import {user} from '../User/User';
import {price} from '../Price/Price';
import {LendingDataResposne, Token, TokenChainResponse, TokenResponse} from './Type';

const TOKENS: {
  id: string;
  name: string;
  symbol: string;
  chains: string[];
}[] = [
  {
    id: '1',
    name: 'USD Coin',
    symbol: 'USDC',
    chains: ['Base', 'Arbitrum'],
  },
  {
    id: '2',
    name: 'Tether',
    symbol: 'USDT',
    chains: ['Base', 'Arbitrum'],
  },
  {
    id: '3',
    name: 'Ethereum',
    symbol: 'ETH',
    chains: ['Base', 'Arbitrum'],
  },
];

export async function exportDataLending(): Promise<LendingDataResposne> {
  let result: LendingDataResposne = {
    chartData: [],
    currentValues: {totalBorrowUsd: 0, totalSupplyUsd: 0},
    tokenData: [],
  };

  let dataLending = await readData();
  let dataNow = await lending.crawlData();

  for (const token of TOKENS) {
    let dataTokenUpdate = await getDataTokenUpdated(token, dataNow);
    result.tokenData.push(dataTokenUpdate);
    result.currentValues.totalSupplyUsd += dataTokenUpdate.totalSupply * dataTokenUpdate.priceUSD;
    result.currentValues.totalBorrowUsd += dataTokenUpdate.totalBorrow * dataTokenUpdate.priceUSD;
  }

  let setSupplier: Set<string> = new Set();
  let setBorrower: Set<string> = new Set();

  for (const token of result.tokenData) {
    for (const j of token.chainDetails) {
      for (const k of j.userData) {
        if (k.amountBorrow > 0) setBorrower.add(k.address);
        if (k.amountSupply > 0) setSupplier.add(k.address);
      }
    }
  }

  result.chartData = dataLending.chartData;
  result.chartData.push({
    time: Date.now(),
    totalSupplyUsd: result.currentValues.totalSupplyUsd,
    totalBorrowUsd: result.currentValues.totalBorrowUsd,
    supplyUsers: setSupplier.size,
    borrowUsers: setBorrower.size,
  });
  await writeData(result);
  return result;
}

function getChainCode(chain: string): string {
  const chainNames: {[key: string]: string} = {
    Base: 'base',
    Arbitrum: 'arb1',
    BSC: 'bsc',
  };

  return chainNames[chain] || chain;
}

function getTokenCode(symbol: string): string {
  const tokenCodes: {[key: string]: string} = {
    USDT: 'usdt',
    USDC: 'usdc',
    ETH: 'eth',
  };
  return tokenCodes[symbol] || symbol;
}

async function getDataTokenUpdated(token: Token, data: any) {
  let result: TokenResponse = {
    id: token.id,
    name: token.name,
    symbol: token.symbol,
    chains: token.chains,
    priceUSD: await price.getPrice(token.symbol.toLowerCase()),
    totalSupply: 0,
    totalBorrow: 0,
    chainDetails: [] as TokenChainResponse[],
  };
  for (const chain of token.chains) {
    let dataTokenUpdated = await getDataTokenUpadtedEachChain(token, chain, data);
    result.chainDetails.push(dataTokenUpdated);
    result.totalSupply += dataTokenUpdated.totalSupply;
    result.totalBorrow += dataTokenUpdated.totalBorrow;
  }
  console.log(result);
  return result;
}

async function getDataTokenUpadtedEachChain(token: Token, chain: string, data: any): Promise<TokenChainResponse> {
  let lendingOldData = await readData();
  // Find the token data by symbol, if not found then initialize a new object
  let tokenData = lendingOldData.tokenData.find((t: any) => t.symbol?.toLowerCase() === token.symbol.toLowerCase());

  let priceUSD = await price.getPrice(token.symbol.toLowerCase());

  if (!tokenData) {
    tokenData = {
      symbol: token.symbol,
      chainDetails: [] as TokenChainResponse[],
      id: token.id,
      name: token.name,
      priceUSD: priceUSD,
      totalSupply: 0,
      totalBorrow: 0,
      chains: token.chains,
    };
    lendingOldData.tokenData.push(tokenData);
  }
  let tokenChainData = tokenData.chainDetails.find((c: any) => c.chain?.toLowerCase() === chain.toLowerCase());
  // Find the chain data by chain, if not found then initialize a new object
  if (!tokenChainData) {
    tokenChainData = {
      chain: chain,
      totalSupply: 0,
      totalBorrow: 0,
      apySupply: 0,
      apyBorrow: 0,
      utilizationRate: 0,
      userData: [],
      chartData: [],
    };
  }

  let codeToken = getTokenCode(token.symbol);
  let codeChain = getChainCode(chain);

  console.log('code Token', codeToken);
  console.log('code chain', codeChain);

  const result: {
    totalSupply: number;
    totalBorrow: number;
    apySupply: number;
    apyBorrow: number;
    utilizationRate: number;
    supplyUsers: number;
    borrowUsers: number;
    newChartData: {
      time: number;
      totalSupply: number;
      totalBorrow: number;
      totalSupplyUsd: number;
      totalBorrowUsd: number;
      supplyUsers: number;
      borrowUsers: number;
    };
    userData: {address: string; nickname: string | null; amountSupply: number; amountBorrow: number}[];
  } = {
    totalSupply: 0,
    totalBorrow: 0,
    apySupply: 0,
    apyBorrow: 0,
    utilizationRate: 0,
    supplyUsers: 0,
    borrowUsers: 0,
    newChartData: {
      time: 0,
      totalSupply: 0,
      totalBorrow: 0,
      totalSupplyUsd: 0,
      totalBorrowUsd: 0,
      supplyUsers: 0,
      borrowUsers: 0,
    },
    userData: [],
  };

  for (const userx of data) {
    for (const dataToken of userx.data) {
      if (dataToken.chain === codeChain && dataToken.token === codeToken) {
        result.totalSupply += dataToken.deposit;
        result.totalBorrow += dataToken.borrow;
        result.supplyUsers += dataToken.deposit > 0 ? 1 : 0;
        result.borrowUsers += dataToken.borrow > 0 ? 1 : 0;
        if (dataToken.deposit + dataToken.borrow > 0) {
          result.userData.push({
            address: userx.address,
            nickname: await user.getNickName(userx.address),
            amountSupply: dataToken.deposit,
            amountBorrow: dataToken.borrow,
          });
        }
      }
    }
  }
  result.newChartData.time = Date.now();
  result.newChartData.totalSupply = result.totalSupply;
  result.newChartData.totalBorrow = result.totalBorrow;
  result.newChartData.totalSupplyUsd = result.totalSupply * priceUSD;
  result.newChartData.totalBorrowUsd = result.totalBorrow * priceUSD;
  result.newChartData.supplyUsers = result.supplyUsers;
  result.newChartData.borrowUsers = result.borrowUsers;

  tokenChainData.totalSupply = result.totalSupply;
  tokenChainData.totalBorrow = result.totalBorrow;
  tokenChainData.apySupply = result.apySupply;
  tokenChainData.apyBorrow = result.apyBorrow;
  tokenChainData.utilizationRate =
    tokenChainData.totalSupply > 0 ? (tokenChainData.totalBorrow / tokenChainData.totalSupply) * 100 : 0;
  tokenChainData.chartData.push(result.newChartData);
  tokenChainData.userData = result.userData;
  return tokenChainData;
}

async function getTokenData(token: any) {
  let dataToken = await lending.crawlData();
  console.table(dataToken);
}

async function writeData(data: LendingDataResposne) {
  const dataFilePath = path.join(process.cwd(), 'data/data.json');
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

async function readData(): Promise<LendingDataResposne> {
  const dataFilePath = path.join(process.cwd(), 'data/data.json');
  let existingData: LendingDataResposne = {
    chartData: [],
    currentValues: {totalBorrowUsd: 0, totalSupplyUsd: 0},
    tokenData: [],
  };
  if (fs.existsSync(dataFilePath)) {
    try {
      const fileContent = fs.readFileSync(dataFilePath, 'utf8');
      existingData = JSON.parse(fileContent);
    } catch (error) {
      console.log('Error reading existing data file, creating new structure');
      existingData = {
        chartData: [],
        currentValues: {totalBorrowUsd: 0, totalSupplyUsd: 0},
        tokenData: [],
      };
    }
  } else {
    existingData = {
      chartData: [],
      currentValues: {totalBorrowUsd: 0, totalSupplyUsd: 0},
      tokenData: [],
    };
  }
  return existingData;
}

async function test() {
  // let data = await lending.crawlData();
  // await getDataTokenUpdated(TOKENS[0], data);
  // let data = await lending.crawlData();
  // let data2 = await getDataTokenUpadtedEachChain('USDC', 'Arbitrum', data);
  // console.log(data2);
  //console.log(getChainCode('Arbitrum'));

  let data = await exportDataLending();
  console.log(data);
}

if (require.main === module) {
  test();
}
