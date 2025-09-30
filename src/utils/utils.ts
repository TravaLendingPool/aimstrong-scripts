import {JsonRpcProvider} from 'ethers';

const BASE_PROVIDER = new JsonRpcProvider('https://base.llamarpc.com');

export function getProvider(chain: string) {
  if (chain === 'base') {
    return BASE_PROVIDER;
  }

  throw new Error(`Unsupported chain: ${chain}`);
}
