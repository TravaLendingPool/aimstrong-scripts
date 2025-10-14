import {incentive} from './services/Incentive/Incentice';
import {lending} from './services/Lending/Lending';
import {price} from './services/Price/Price';
import {user} from './services/User/User';

async function main() {
  // await lending.updateDataToSupabase();
  // let priceBNB = await price.getPrice('bnb');
  // console.log(priceBNB);
  let data = await lending.updateDataToSupabase(false);
  await lending.exportDataFromUpdateDataToSupabase(data);
}

main();
