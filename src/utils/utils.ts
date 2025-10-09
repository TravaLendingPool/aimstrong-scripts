import {JsonRpcProvider} from 'ethers';
import {config} from 'dotenv';
config({path: '.env'});

const BASE_PROVIDER = new JsonRpcProvider(process.env.BASE_RPC!);

const ARB1_PROVIDER = new JsonRpcProvider(process.env.ARB1_RPC!);

export function getProvider(chain: string) {
  if (chain === 'base') {
    return BASE_PROVIDER;
  }
  if (chain === 'arb1' || chain === 'arbitrum one') {
    return ARB1_PROVIDER;
  }

  throw new Error(`Unsupported chain: ${chain}`);
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
