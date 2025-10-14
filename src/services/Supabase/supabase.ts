import {createClient} from '@supabase/supabase-js';
import 'dotenv/config';
import {lending} from '../Lending/Lending';
import {user} from '../User/User';
import {TokenChainData, TokenChainSnapshotData, TotalIndexSnapshotData, UserTokenChainData} from './Types';

export const supabaseData = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

export class SupabaseDatabase {
  async updateUsers(users: string[]) {
    for (const user of users) {
      const {data, error} = await supabaseData.from('users').upsert({address: user});
    }
  }

  async updateUserTokenChain(userTokenChain: UserTokenChainData) {
    const now = new Date().toISOString();
    let payload = {...userTokenChain, updated_at: now};
    const {data, error} = await supabaseData.from('user_token_chain_latest').upsert(payload, {
      onConflict: 'user_id,token_chain_id',
      ignoreDuplicates: false,
    });
    if (error) {
      console.log(error);
      throw error;
    }
    return data;
  }

  async getListUser(limit: number = 0) {
    const {data, error} = await supabaseData.from('users').select('*');
    if (error) {
      throw error;
    }
    if (limit > 0) {
      return data.slice(0, limit);
    }
    return data;
  }

  async getChains() {
    const {data, error} = await supabaseData.from('chain').select('*');
    if (error) {
      throw error;
    }
    return data;
  }

  async getListChain() {
    const {data, error} = await supabaseData.from('chain').select('*');
    if (error) {
      throw error;
    }
    return data;
  }

  async getChain(chain: string) {
    const {data, error} = await supabaseData.from('chain').select('*').eq('name', chain);
    if (error) {
      throw error;
    }
    return data[0];
  }

  async getChainById(id: number) {
    const {data, error} = await supabaseData.from('chain').select('*').eq('id', id);
    if (error) {
      throw error;
    }
    return data[0];
  }

  async getTokens() {
    const {data, error} = await supabaseData.from('token').select('*');
    if (error) {
      throw error;
    }
    return data;
  }

  async getListTokenByChain(chain: string) {
    const {data, error} = await supabaseData.from('token_chain').select('*').eq('chain_id', chain);
    if (error) {
      throw error;
    }
    return data;
  }

  async getToken(token: string) {
    const {data, error} = await supabaseData.from('token').select('*').eq('symbol', token);
    if (error) {
      throw error;
    }
    return data[0];
  }
  async getTokenById(id: number) {
    const {data, error} = await supabaseData.from('token').select('*').eq('id', id);
    if (error) {
      throw error;
    }
    return data[0];
  }

  async addTokenChain(token: string, chain: string, tokenAddress: string, decimals: number) {
    let chainData = await this.getChain(chain);
    let tokenData = await this.getToken(token);
    if (!tokenData) {
      throw new Error('Token not found');
    }
    if (!chainData) {
      throw new Error('Chain not found');
    }
    const {data: tokenChain, error: tokenChainError} = await supabaseData
      .from('token_chain')
      .upsert([
        {
          token_id: tokenData.id,
          chain_id: chainData.id,
          token_address: tokenAddress,
          decimals: decimals,
          total_supplied: 0,
          total_borrowed: 0,
          suppliers_count: 0,
          borrowers_count: 0,
        },
      ])
      .select();
    console.log(tokenChain, tokenChainError);
  }

  async createRecordTokenChainSnapshot(tokenChain: TokenChainSnapshotData) {
    const now = new Date().toISOString();
    let payload = {...tokenChain, created_at: now};
    const {data, error} = await supabaseData.from('token_chain_snapshot').upsert(payload);
    if (error) {
      console.log(error);
      throw error;
    }
    return data;
  }

  async updateRecordTokenChain(tokenChain: TokenChainData) {
    const now = new Date().toISOString();

    tokenChain.created_at = now;
    const {data, error} = await supabaseData.from('token_chain').upsert(tokenChain);
    if (error) {
      console.log(error);
      throw error;
    }
    return data;
  }

  async getListTokenChain() {
    const {data, error} = await supabaseData.from('token_chain').select('*');

    return data;
  }

  async createRecodeTotalIndexSnapshot(totalIndex: TotalIndexSnapshotData) {
    const now = new Date().toISOString();
    let payload = {...totalIndex, created_at: now};
    const {data, error} = await supabaseData.from('total_index_snapshot').upsert(payload);
    if (error) {
      throw error;
    }
  }
}

export const supabase = new SupabaseDatabase();

async function test() {
  let data = await supabase.getListTokenChain();
  console.log(data);
}

if (require.main === module) {
  test();
}
