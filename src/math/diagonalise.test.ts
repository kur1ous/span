import { describe, expect, it } from 'vitest';
import { diagonalise } from './diagonalise';
import { diag, IDENTITY, inverse, mul, type Mat2 } from './mat2';

describe('diagonalisation', () => {
  it.each<Mat2>([
    { a: 2, b: 1, c: 1, d: 2 },
    { a: 3, b: 1, c: 0, d: 2 },
    { a: 1, b: 1, c: 0, d: 0 },
    diag(-2, 5),
  ])('recovers %o from P D P^-1 and changes coordinates to D', (a) => {
    const { p, d } = diagonalise(a)!;
    const pinv = inverse(p)!;
    const recovered = mul(mul(p, d), pinv);
    const transformed = mul(mul(pinv, a), p);
    for (const key of ['a', 'b', 'c', 'd'] as const) {
      expect(recovered[key]).toBeCloseTo(a[key], 10);
      expect(transformed[key]).toBeCloseTo(d[key], 10);
    }
  });

  it('pairs the oblique eigenvectors with 3 and 2 in order', () => {
    const { p, d } = diagonalise({ a: 3, b: 1, c: 0, d: 2 })!;
    expect(d).toEqual(diag(3, 2));
    expect(p.a).toBeCloseTo(1);
    expect(p.c).toBeCloseTo(0);
    expect(p.b).toBeCloseTo(Math.SQRT1_2);
    expect(p.d).toBeCloseTo(-Math.SQRT1_2);
  });

  it.each([0, 1, -2])('uses the standard basis for the scalar matrix %s I', (value) => {
    expect(diagonalise(diag(value, value))).toEqual({ p: IDENTITY, d: diag(value, value) });
  });

  it.each<Mat2>([
    { a: 1, b: 1, c: 0, d: 1 },
    { a: 0, b: -1, c: 1, d: 0 },
  ])('has no real eigenvector basis for %o', (a) => {
    expect(diagonalise(a)).toBeNull();
  });
});
