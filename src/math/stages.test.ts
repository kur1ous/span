import { describe, expect, it } from 'vitest';
import { IDENTITY, det, diag, mul, rotation, svd, transpose, type Mat2, type Svd } from './mat2';
import { stageMatrix } from './stages';

function expectMat(actual: Mat2, expected: Mat2, digits = 10) {
  for (const key of ['a', 'b', 'c', 'd'] as const) {
    expect(actual[key]).toBeCloseTo(expected[key], digits);
  }
}

const matrices: Mat2[] = [
  IDENTITY,
  rotation(-2.4),
  diag(3, 2),
  { a: 1, b: 2, c: 0, d: 1 },
  { a: 0, b: 1, c: 1, d: 0 },
  diag(2, -3),
  { a: 1, b: 2, c: 2, d: 4 },
  diag(0, 0),
];

describe('decomposition stages', () => {
  it.each(matrices)('matches all partial products for %o', (matrix) => {
    const factors = svd(matrix);
    const vt = transpose(factors.v);
    const scaled = mul(diag(...factors.s), vt);
    expect(stageMatrix(factors, 0)).toEqual(IDENTITY);
    expect(stageMatrix(factors, 1)).toEqual(vt);
    expect(stageMatrix(factors, 2)).toEqual(scaled);
    expectMat(stageMatrix(factors, 3), matrix);
  });

  it.each(matrices)('is continuous at the stage boundaries for %o', (matrix) => {
    const factors = svd(matrix);
    for (const time of [1, 2]) {
      const boundary = stageMatrix(factors, time);
      expectMat(stageMatrix(factors, time - 1e-8), boundary, 6);
      expectMat(stageMatrix(factors, time + 1e-8), boundary, 6);
    }
    expectMat(stageMatrix(factors, 1e-8), IDENTITY, 6);
    expectMat(stageMatrix(factors, 3 - 1e-8), matrix, 6);
  });

  it('rotates, stretches, then rotates the accumulated product', () => {
    const quarterTurn = { a: 0, b: -1, c: 1, d: 0 };
    const factors: Svd = { u: quarterTurn, s: [3, 2], v: transpose(quarterTurn) };
    const r = Math.SQRT1_2;
    expectMat(stageMatrix(factors, 0.5), { a: r, b: -r, c: r, d: r });
    expectMat(stageMatrix(factors, 1.5), { a: 0, b: -2, c: 1.5, d: 0 });
    expectMat(stageMatrix(factors, 2.5), { a: -2 * r, b: -3 * r, c: 2 * r, d: -3 * r });
  });

  it('keeps orientation until the final stage, then collapses and reflects', () => {
    const factors = svd(diag(3, -2));
    expectMat(stageMatrix(factors, 1.5), diag(2, 1.5));
    expectMat(stageMatrix(factors, 2), diag(3, 2));
    expectMat(stageMatrix(factors, 2.25), diag(3, 1));
    expectMat(stageMatrix(factors, 2.5), diag(3, 0));
    expectMat(stageMatrix(factors, 2.75), diag(3, -1));
    expect(det(stageMatrix(factors, 2.25))).toBeGreaterThan(0);
    expect(det(stageMatrix(factors, 2.75))).toBeLessThan(0);
  });

  it('rotates while reflecting about a non-axis-aligned line', () => {
    const factors: Svd = { u: { a: 0, b: 1, c: 1, d: 0 }, s: [3, 2], v: IDENTITY };
    const r = Math.SQRT1_2;
    expectMat(stageMatrix(factors, 2.5), { a: 3 * r, b: 0, c: 3 * r, d: 0 });
    expectMat(stageMatrix(factors, 3), { a: 0, b: 2, c: 3, d: 0 });
  });

  it('shrinks a singular axis to zero during scaling', () => {
    const factors = svd(diag(4, 0));
    expectMat(stageMatrix(factors, 1.5), diag(2.5, 0.5));
    expectMat(stageMatrix(factors, 2.5), diag(4, 0));
  });

  it('does not mutate the decomposition', () => {
    const factors = svd({ a: 1, b: 2, c: 3, d: 4 });
    const original = structuredClone(factors);
    for (const time of [0, 0.5, 1, 1.5, 2, 2.5, 3]) stageMatrix(factors, time);
    expect(factors).toEqual(original);
  });

  it.each([-0.1, 3.1, NaN, Infinity, -Infinity])('rejects invalid time %s', (time) => {
    expect(() => stageMatrix(svd(IDENTITY), time)).toThrow(RangeError);
  });
});
