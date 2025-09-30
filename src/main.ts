import {incentive} from './services/Incentive/Incentice';
import {user} from './services/User/User';

async function main() {
  let data = await user.getUsers();
  console.log(data);
}

main();
