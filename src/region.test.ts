import { describe, expect, it } from 'vitest';
import { apply, det, type Mat2 } from './math/mat2';
import { centroid, polygonArea, unitSquareImage } from './region';

describe('unit square image', () => {
  it('has area 1 under the identity', () => {
    expect(polygonArea(unitSquareImage({ a: 1, b: 0, c: 0, d: 1 }))).toBe(1);
  });

  it('shoelace area equals the determinant, sign included', () => {
    const samples: Mat2[] = [
      { a: 1.5, b: -0.5, c: 0.5, d: 1 },
      { a: 0, b: 1, c: 1, d: 0 },
      { a: 2, b: 1, c: 4, d: 2 },
      { a: -1, b: 3, c: 2, d: 0.5 },
    ];
    for (const m of samples) {
      expect(polygonArea(unitSquareImage(m))).toBeCloseTo(det(m), 12);
    }
  });

  it('is negative when the columns swap handedness', () => {
    expect(polygonArea(unitSquareImage({ a: 0, b: 1, c: 1, d: 0 }))).toBe(-1);
  });

  it('centres on the image of (1/2, 1/2)', () => {
    const m: Mat2 = { a: 2, b: -1, c: 1, d: 3 };
    const c = centroid(unitSquareImage(m));
    const expected = apply(m, [0.5, 0.5]);
    expect(c[0]).toBeCloseTo(expected[0], 12);
    expect(c[1]).toBeCloseTo(expected[1], 12);
  });
});
