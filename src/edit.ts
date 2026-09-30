import { columns, fromColumns, type Mat2, type Vec2 } from './math/mat2';

export type Which = 'i' | 'j';

export function getColumn(m: Mat2, which: Which): Vec2 {
  return columns(m)[which === 'i' ? 0 : 1];
}

export function withColumn(m: Mat2, which: Which, v: Vec2): Mat2 {
  const [ci, cj] = columns(m);
  return which === 'i' ? fromColumns(v, cj) : fromColumns(ci, v);
}

/**
 * Pull each coordinate onto the nearest half-integer when it is within `tol`
 * of one. Lets you land exactly on (1, 0) or (0.5, 2) by hand, while leaving
 * everything in between free.
 */
export function snap(v: Vec2, tol = 0.07): Vec2 {
  const one = (n: number) => {
    const r = Math.round(n * 2) / 2;
    return Math.abs(n - r) < tol ? r : n;
  };
  return [one(v[0]), one(v[1])];
}

export function clampTo(v: Vec2, limit: Vec2): Vec2 {
  return [
    Math.max(-limit[0], Math.min(limit[0], v[0])),
    Math.max(-limit[1], Math.min(limit[1], v[1])),
  ];
}

/** Add a step and round away float dust so 0.1 + 0.2 shows as 0.3, not 0.30000000000000004. */
export function nudge(v: Vec2, dx: number, dy: number): Vec2 {
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return [r(v[0] + dx), r(v[1] + dy)];
}
