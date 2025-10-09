export interface UserTokenChainData {
  user_id: string;
  token_chain_id: string;
  amount_supplied: number;
  amount_borrowed: number;
  amount_supplied_usd: number;
  amount_borrowed_usd: number;
}

export interface TokenChainSnapshotData {
  token_chain_id: string;
  total_supplied: number;
  total_borrowed: number;
  total_supplied_usd: number;
  total_borrowed_usd: number;
  suppliers_count: number;
  borrowers_count: number;
}

export interface TotalIndexSnapshotData {
  total_supplied_usd: number;
  total_borrowed_usd: number;
  suppliers_count: number;
  borrowers_count: number;
}
