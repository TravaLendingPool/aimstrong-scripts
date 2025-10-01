import {incentive} from './services/Incentive/Incentice';
import {lending} from './services/Lending/Lending';
import {user} from './services/User/User';

async function main() {
  let data = await lending.exportDataLending();
}

main();
