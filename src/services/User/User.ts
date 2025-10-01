import {getListUser} from './CrawlUser';

class User {
  async getUsers() {
    return getListUser();
  }

  async getNickName(address: string) {
    return null;
  }
}

export const user = new User();
