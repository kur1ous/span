/** Fixed two decimals, and never "-0.00". */
export function fmt(n: number): string {
  const s = n.toFixed(2);
  return s === '-0.00' ? '0.00' : s;
}
