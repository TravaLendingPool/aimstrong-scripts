export interface IncentiveUserDataResponse {
  address: string;
  reward: number;
}

export interface IncentiveDataResponse {
  chain: string;
  token: string;
  totalStaker: number;
  totalReward: number;
  users: IncentiveDataResponse[];
}
