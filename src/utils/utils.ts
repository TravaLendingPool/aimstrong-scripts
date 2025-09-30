import {JsonRpcProvider} from 'ethers';

const BASE_PROVIDER = new JsonRpcProvider('https://base.llamarpc.com');

const ARB1_PROVIDER = new JsonRpcProvider('https://arbitrum.drpc.org');

export function getProvider(chain: string) {
  if (chain === 'base') {
    return BASE_PROVIDER;
  }
  if (chain === 'arb1') {
    return ARB1_PROVIDER;
  }

  throw new Error(`Unsupported chain: ${chain}`);
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
