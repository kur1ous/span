import { describe, expect, it } from 'vitest';
import { apply, diag, IDENTITY, type Mat2 } from './mat2';
import { nullSpace, rank } from './subspaces';

describe('rank and null space', () => {
  it('distinguishes zero, dependent and independent columns', () => {
    expect(rank(diag(0, 0))).toBe(0);
    expect(rank({ a: 1, b: 2, c: 3, d: 6 })).toBe(1);
    expect(rank(IDENTITY)).toBe(2);
    expect(rank({ a: 1, b: 2, c: 3, d: 4 })).toBe(2);
    expect(nullSpace(IDENTITY)).toEqual([]);
    expect(nullSpace(diag(0, 0))).toEqual([[1, 0], [0, 1]]);
  });

  it.each<Mat2>([
    { a: 1, b: 2, c: 3, d: 6 },
    { a: 0, b: 2, c: 0, d: 3 },
    { a: 2, b: 0, c: 3, d: 0 },
    { a: 0, b: 0, c: 3, d: -4 },
    { a: -3, b: 4, c: 0, d: 0 },
  ])('returns a unit kernel direction for %j', (m) => {
    expect(rank(m)).toBe(1);
    const basis = nullSpace(m);
    expect(basis).toHaveLength(1);
    const v = basis[0]!;
    expect(Math.hypot(...v)).toBeCloseTo(1, 12);
    const image = apply(m, v);
    expect(image[0]).toBeCloseTo(0, 12);
    expect(image[1]).toBeCloseTo(0, 12);
  });

  it('finds the hand-computed kernel perpendicular to the rows', () => {
    const v = nullSpace({ a: 3, b: 4, c: 6, d: 8 })[0]!;
    expect(v[0]).toBeCloseTo(0.8, 12);
    expect(v[1]).toBeCloseTo(-0.6, 12);
  });

  it.each([1e-200, 1e200])('preserves subspaces at scale %s', (scale) => {
    expect(rank(diag(scale, scale))).toBe(2);
    const m = { a: 3 * scale, b: 4 * scale, c: 6 * scale, d: 8 * scale };
    expect(rank(m)).toBe(1);
    const v = nullSpace(m)[0]!;
    expect(v[0]).toBeCloseTo(0.8, 12);
    expect(v[1]).toBeCloseTo(-0.6, 12);
  });

  it('uses the same singularity tolerance as inversion', () => {
    expect(rank({ a: 1, b: 1, c: 1, d: 1 + 1e-14 })).toBe(1);
    expect(rank({ a: 1, b: 1, c: 1, d: 1 + 1e-8 })).toBe(2);
    expect(rank(diag(1e-200, 1e200))).toBe(2);
  });

  it.each([NaN, Infinity, -Infinity])('rejects non-finite entries: %s', (value) => {
    expect(() => rank(diag(value, 1))).toThrow(RangeError);
    expect(() => nullSpace(diag(1, value))).toThrow(RangeError);
  });
});
