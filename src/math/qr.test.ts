import { describe, expect, it } from 'vitest';
import { diag, IDENTITY, mul, transpose, type Mat2 } from './mat2';
import { qr } from './qr';

function expectMatrix(actual: Mat2, expected: Mat2) {
  for (const key of ['a', 'b', 'c', 'd'] as const) {
    expect(actual[key]).toBeCloseTo(expected[key], 12);
  }
}

describe('QR decomposition', () => {
  it('matches hand-computed Gram-Schmidt vectors and coefficients', () => {
    const { q, r } = qr({ a: 3, b: 1, c: 4, d: 3 });
    expectMatrix(q, { a: 0.6, b: -0.8, c: 0.8, d: 0.6 });
    expectMatrix(r, { a: 5, b: 3, c: 0, d: 1 });
  });

  it('places a reflection in Q and keeps the diagonal of R nonnegative', () => {
    const { q, r } = qr({ a: 3, b: 4, c: 4, d: 2 });
    expectMatrix(q, { a: 0.6, b: 0.8, c: 0.8, d: -0.6 });
    expectMatrix(r, { a: 5, b: 4, c: 0, d: 2 });
  });

  it.each([2, -2])('completes Q for columns dependent by a factor of %s', (factor) => {
    const { q, r } = qr({ a: 3, b: factor * 3, c: 4, d: factor * 4 });
    expectMatrix(q, { a: 0.6, b: -0.8, c: 0.8, d: 0.6 });
    expectMatrix(r, { a: 5, b: factor * 5, c: 0, d: 0 });
    expect(r.d).toBe(0);
  });

  it('uses the second column when the first is zero', () => {
    const { q, r } = qr({ a: 0, b: 3, c: 0, d: 4 });
    expectMatrix(q, { a: 0.6, b: -0.8, c: 0.8, d: 0.6 });
    expectMatrix(r, { a: 0, b: 5, c: 0, d: 0 });
  });

  it('uses the standard basis for the zero matrix', () => {
    expect(qr(diag(0, 0))).toEqual({ q: IDENTITY, r: diag(0, 0) });
  });

  it.each<Mat2>([
    IDENTITY,
    { a: 3, b: 1, c: 4, d: 3 },
    { a: 3, b: 4, c: 4, d: 2 },
    { a: 3, b: -6, c: 4, d: -8 },
    { a: 0, b: -3, c: 0, d: 4 },
    { a: -3, b: 0, c: 4, d: 0 },
    { a: 0, b: 0, c: 0, d: 0 },
    { a: 1, b: 1, c: 1, d: 1 + 1e-8 },
  ])('reconstructs %j with orthogonal Q and triangular R', (m) => {
    const { q, r } = qr(m);
    expectMatrix(mul(q, r), m);
    expectMatrix(mul(transpose(q), q), IDENTITY);
    expect(r.c).toBe(0);
    expect(r.a).toBeGreaterThanOrEqual(0);
    expect(r.d).toBeGreaterThanOrEqual(0);
  });

  it.each([1e-200, 1e200])('preserves the factors at scale %s', (scale) => {
    const { q, r } = qr({ a: 3 * scale, b: scale, c: 4 * scale, d: 3 * scale });
    expectMatrix(q, { a: 0.6, b: -0.8, c: 0.8, d: 0.6 });
    expectMatrix({ a: r.a / scale, b: r.b / scale, c: r.c, d: r.d / scale },
      { a: 5, b: 3, c: 0, d: 1 });
  });

  it('keeps independent columns with very different magnitudes', () => {
    const m = diag(1e-200, 1e200);
    const { q, r } = qr(m);
    expectMatrix(q, IDENTITY);
    expect(r).toEqual(m);
  });

  it('treats roundoff-sized residuals as dependent', () => {
    expect(qr({ a: 1, b: 1, c: 1, d: 1 + 1e-14 }).r.d).toBe(0);
  });

  it.each([NaN, Infinity, -Infinity])('rejects non-finite entries: %s', (value) => {
    for (const key of ['a', 'b', 'c', 'd'] as const) {
      expect(() => qr({ ...IDENTITY, [key]: value })).toThrow(RangeError);
    }
  });

  it('rejects factors too large to represent', () => {
    expect(() => qr({ a: Number.MAX_VALUE, b: 0, c: Number.MAX_VALUE, d: 1 }))
      .toThrow(RangeError);
  });
});
