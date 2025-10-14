import {getPricePyth} from './GetPrice';

class Price {
  /**
   * Get the price for a given symbol.
   * @param symbol The symbol to get the price for.
   * @throws Error if the symbol is not supported.
   */
  async getPrice(symbol: string) {
    const prices: {[key: string]: string} = {
      usdc: 'USDC',
      usdt: 'USDT',
      eth: 'ETH',
      bnb: 'BNB',
      btc: 'BTC',
    };

    const key = symbol.toLowerCase();
    if (!(key in prices)) {
      // Throw error if symbol is not in the supported list
      throw new Error(`Symbol "${symbol}" is not supported`);
    }

    return (await getPricePyth([prices[key]]))[0];
  }
}

export const price = new Price();
