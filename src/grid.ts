import { inverse, apply, type Mat2, type Vec2 } from './math/mat2';

export interface Extent {
  readonly min: Vec2;
  readonly max: Vec2;
}

/** Hard cap so a near-singular matrix cannot ask for millions of lines. */
const LIMIT = 200;

/**
 * The region of the *source* plane that lands inside `bounds` after A is
 * applied: pull the four corners back through A⁻¹ and take their box. Grid
 * lines outside this box are off screen and are never drawn. When A is
 * singular there is no pre-image, so fall back to a fixed box.
 */
export function sourceExtent(m: Mat2, bounds: Extent): Extent {
  const inv = inverse(m);
  if (!inv) return { min: [-LIMIT / 10, -LIMIT / 10], max: [LIMIT / 10, LIMIT / 10] };
  const corners: Vec2[] = [
    apply(inv, [bounds.min[0], bounds.min[1]]),
    apply(inv, [bounds.max[0], bounds.min[1]]),
    apply(inv, [bounds.min[0], bounds.max[1]]),
    apply(inv, [bounds.max[0], bounds.max[1]]),
  ];
  const xs = corners.map((p) => p[0]);
  const ys = corners.map((p) => p[1]);
  const clamp = (n: number) => Math.max(-LIMIT, Math.min(LIMIT, n));
  return {
    min: [clamp(Math.min(...xs)), clamp(Math.min(...ys))],
    max: [clamp(Math.max(...xs)), clamp(Math.max(...ys))],
  };
}

/**
 * Integer grid positions covering [lo, hi]. If that would be more than `max`
 * lines, thin them out by doubling the step, which keeps the grid readable
 * when the transform squeezes the plane very small.
 */
export function gridStops(lo: number, hi: number, max = 60): number[] {
  let step = 1;
  while ((hi - lo) / step > max) step *= 2;
  const out: number[] = [];
  for (let i = Math.floor(lo / step) * step; i <= hi + step; i += step) out.push(i);
  return out;
}
