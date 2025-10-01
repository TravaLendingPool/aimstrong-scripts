export async function getPricePyth(symbols: string[]) {
  const ids: Record<string, string> = {
    USDT: 'cfc1303ea9f083b1b4f99e1369fb9d2611f3230d5ea33a6abf2f86071c089fdc',
    USDC: 'eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
    ETH: 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
    WETH: '9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6',
  };

  const url = new URL('https://hermes.pyth.network/v2/updates/price/latest');
  symbols.forEach((symbol) => {
    const id = ids[symbol];
    if (id) {
      url.searchParams.append('ids[]', id);
    }
  });

  const res = await fetch(url.toString(), {
    headers: {Accept: 'application/json'},
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();

  const prices: number[] = [];
  for (let i = 0; i < symbols.length; i++) {
    const rawPrice = data.parsed[i].price.price;
    const exponent = data.parsed[i].price.expo;
    const actualPrice = parseFloat(rawPrice) * Math.pow(10, exponent);
    prices.push(actualPrice);
  }

  return prices;
}
