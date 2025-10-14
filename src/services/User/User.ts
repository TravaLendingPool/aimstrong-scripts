import {supabase} from '../Supabase/supabase';
import {getListUser} from './CrawlUser';

class User {
  async getUsers() {
    return getListUser();
  }

  async getNickName(address: string) {
    return null;
  }

  async getListUserAndSaveToSupabase() {
    let listUser = await getListUser();
    await supabase.updateUsers(listUser);
    return listUser;
  }
}

export const user = new User();
