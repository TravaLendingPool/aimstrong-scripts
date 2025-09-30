import {getListUser} from './CrawlUser';

class User {
  async getUsers() {
    return getListUser();
  }
}

export const user = new User();
