export interface Token {
  id: string;
  name: string;
  symbol: string;
  chains: string[];
}

export interface TokenChainResponse {
  chain: string;
  totalSupply: number;
  totalBorrow: number;
  apySupply: number;
  apyBorrow: number;
  utilizationRate: number;
  chartData: {
    time: number;
    totalSupply: number;
    totalBorrow: number;
    totalSupplyUsd: number;
    totalBorrowUsd: number;
    supplyUsers: number;
    borrowUsers: number;
  }[];
  userData: {
    address: string;
    nickname: string | null;
    amountSupply: number;
    amountBorrow: number;
  }[];
}

export interface TokenResponse {
  id: string;
  name: string;
  symbol: string;
  priceUSD: number;
  totalSupply: number;
  totalBorrow: number;
  chains: string[];
  chainDetails: TokenChainResponse[];
}

export interface LendingDataResposne {
  chartData: {
    time: number;
    totalSupplyUsd: number;
    totalBorrowUsd: number;
    supplyUsers: number;
    borrowUsers: number;
  }[];
  currentValues: {
    totalBorrowUsd: number;
    totalSupplyUsd: number;
  };
  tokenData: TokenResponse[];
}
