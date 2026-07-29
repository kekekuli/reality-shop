export function formatPrice(cents: string) {
  const yuan = Number(cents) / 100;
  return `¥${yuan.toFixed(2)}`;
}

// Lowest price among a product's SKUs, formatted. undefined when it has none.
export function lowestPrice(prices: string[]): string | undefined {
  if (prices.length === 0) return undefined;
  const lowest = prices.reduce((min, p) => (Number(p) < Number(min) ? p : min));
  return formatPrice(lowest);
}
