import { apply, inverse, type Mat2, type Vec2 } from './mat2';

export function solve(m: Mat2, b: Vec2): Vec2 | null {
  const inv = inverse(m);
  if (!inv) return null;
  const x = apply(inv, b);
  return x.every(Number.isFinite) ? x : null;
}
