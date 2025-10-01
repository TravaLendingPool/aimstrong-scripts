class Price {
  async getPrice(symbol: string) {
    const prices: {[key: string]: number} = {
      usdc: 0.997,
      usdt: 0.998,
      eth: 4123,
      bnb: 982,
    };
    return prices[symbol.toLowerCase()] || 0;
  }
}

export const price = new Price();
