import { describe, expect, it } from 'vitest';
import {
  IDENTITY,
  apply,
  det,
  diag,
  eigen,
  fromColumns,
  inverse,
  mul,
  rotation,
  svd,
  trace,
  transpose,
  type Mat2,
  type Vec2,
} from './mat2';

const m = (a: number, b: number, c: number, d: number): Mat2 => ({ a, b, c, d });

function expectMat(actual: Mat2, expected: Mat2, digits = 10) {
  expect(actual.a).toBeCloseTo(expected.a, digits);
  expect(actual.b).toBeCloseTo(expected.b, digits);
  expect(actual.c).toBeCloseTo(expected.c, digits);
  expect(actual.d).toBeCloseTo(expected.d, digits);
}

function expectVec(actual: Vec2, expected: Vec2, digits = 10) {
  expect(actual[0]).toBeCloseTo(expected[0], digits);
  expect(actual[1]).toBeCloseTo(expected[1], digits);
}

// small deterministic generator so the property tests are reproducible
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return (s / 0x100000000) * 8 - 4;
  };
}

function randomMatrices(n: number): Mat2[] {
  const next = lcg(42);
  return Array.from({ length: n }, () => m(next(), next(), next(), next()));
}

describe('basics', () => {
  it('reads columns as images of the basis vectors', () => {
    const a = fromColumns([2, 1], [-1, 3]);
    expect(apply(a, [1, 0])).toEqual([2, 1]);
    expect(apply(a, [0, 1])).toEqual([-1, 3]);
  });

  it('multiplies right-to-left', () => {
    // rotate 90 degrees, then stretch x by 2: (1,0) -> (0,1) -> (0,1)
    const rot = m(0, -1, 1, 0);
    const stretch = diag(2, 1);
    expectVec(apply(mul(stretch, rot), [1, 0]), [0, 1]);
    expectVec(apply(mul(rot, stretch), [1, 0]), [0, 2]);
  });

  it('has determinant 1 for rotations and -1 for a reflection', () => {
    expect(det(rotation(0.7))).toBeCloseTo(1, 12);
    expect(det(m(1, 0, 0, -1))).toBe(-1);
  });

  it('det of a product is the product of dets', () => {
    const p = m(2, 1, -1, 3);
    const q = m(0.5, 4, 2, -1);
    expect(det(mul(p, q))).toBeCloseTo(det(p) * det(q), 12);
  });

  it('transposes', () => {
    expect(transpose(m(1, 2, 3, 4))).toEqual(m(1, 3, 2, 4));
  });
});

describe('inverse', () => {
  it('inverts [[2,1],[1,1]] to [[1,-1],[-1,2]]', () => {
    expectMat(inverse(m(2, 1, 1, 1))!, m(1, -1, -1, 2));
  });

  it('gives back the identity', () => {
    for (const a of randomMatrices(50)) {
      const inv = inverse(a);
      if (inv) expectMat(mul(a, inv), IDENTITY, 8);
    }
  });

  it('returns null for singular matrices', () => {
    expect(inverse(m(1, 2, 2, 4))).toBeNull();
    expect(inverse(m(0, 0, 0, 0))).toBeNull();
  });

  it('does not depend on overall scale when judging singularity', () => {
    expect(inverse(m(1e-9, 2e-9, 2e-9, 4e-9))).toBeNull();
    expect(inverse(m(1e-9, 0, 0, 1e-9))).not.toBeNull();
  });
});

describe('eigen: real distinct', () => {
  it('[[2,1],[1,2]] has 3 along (1,1) and 1 along (1,-1)', () => {
    const e = eigen(m(2, 1, 1, 2));
    if (e.kind !== 'real') throw new Error('expected real');
    expect(e.values[0]).toBeCloseTo(3, 12);
    expect(e.values[1]).toBeCloseTo(1, 12);
    const r = Math.SQRT1_2;
    expectVec(e.vectors[0], [r, r]);
    expectVec(e.vectors[1], [r, -r]);
  });

  it('diagonal matrices keep the axes', () => {
    const e = eigen(diag(5, -2));
    if (e.kind !== 'real') throw new Error('expected real');
    expect(e.values).toEqual([5, -2]);
    expectVec(e.vectors[0], [1, 0]);
    expectVec(e.vectors[1], [0, 1]);
  });

  it('[[1,2],[3,4]] has roots (5 +- sqrt 33)/2', () => {
    const e = eigen(m(1, 2, 3, 4));
    if (e.kind !== 'real') throw new Error('expected real');
    expect(e.values[0]).toBeCloseTo((5 + Math.sqrt(33)) / 2, 12);
    expect(e.values[1]).toBeCloseTo((5 - Math.sqrt(33)) / 2, 12);
  });

  it('upper triangular [[2,3],[0,1]]: the line for 1 is (3,-1)/sqrt 10', () => {
    const e = eigen(m(2, 3, 0, 1));
    if (e.kind !== 'real') throw new Error('expected real');
    expect(e.values).toEqual([2, 1]);
    expectVec(e.vectors[0], [1, 0]);
    const n = Math.sqrt(10);
    expectVec(e.vectors[1], [3 / n, -1 / n]);
  });

  it('satisfies A v = lambda v on random matrices', () => {
    for (const a of randomMatrices(200)) {
      const e = eigen(a);
      if (e.kind !== 'real') continue;
      for (let k = 0; k < 2; k++) {
        const v = e.vectors[k]!;
        const lv: Vec2 = [e.values[k]! * v[0], e.values[k]! * v[1]];
        expectVec(apply(a, v), lv, 8);
        expect(Math.hypot(v[0], v[1])).toBeCloseTo(1, 12);
      }
    }
  });
});

describe('eigen: repeated', () => {
  it('shear [[1,1],[0,1]] is defective with the x axis as its only line', () => {
    const e = eigen(m(1, 1, 0, 1));
    if (e.kind !== 'repeated') throw new Error('expected repeated');
    expect(e.value).toBe(1);
    expect(e.defective).toBe(true);
    expect(e.vectors).toHaveLength(1);
    expectVec(e.vectors[0]!, [1, 0]);
  });

  it('[[2,1],[-1,4]] has 3 twice, along (1,1)', () => {
    const e = eigen(m(2, 1, -1, 4));
    if (e.kind !== 'repeated') throw new Error('expected repeated');
    expect(e.value).toBeCloseTo(3, 12);
    expect(e.defective).toBe(true);
    expectVec(e.vectors[0]!, [Math.SQRT1_2, Math.SQRT1_2]);
  });

  it('scalar matrices are not defective', () => {
    const e = eigen(diag(4, 4));
    if (e.kind !== 'repeated') throw new Error('expected repeated');
    expect(e.value).toBe(4);
    expect(e.defective).toBe(false);
    expect(e.vectors).toHaveLength(2);
  });

  it('identity is repeated at 1', () => {
    expect(eigen(IDENTITY).kind).toBe('repeated');
  });

  it('the zero matrix has 0 twice and is not defective', () => {
    const e = eigen(m(0, 0, 0, 0));
    if (e.kind !== 'repeated') throw new Error('expected repeated');
    expect(e.value).toBe(0);
    expect(e.defective).toBe(false);
  });
});

describe('eigen: complex', () => {
  it('quarter turn has +-i with eigenvector (-1, i)/sqrt 2', () => {
    const e = eigen(m(0, -1, 1, 0));
    if (e.kind !== 'complex') throw new Error('expected complex');
    expect(e.re).toBeCloseTo(0, 12);
    expect(e.im).toBeCloseTo(1, 12);
    expectVec(e.vRe, [-Math.SQRT1_2, 0]);
    expectVec(e.vIm, [0, Math.SQRT1_2]);
  });

  it('spiral [[1,-2],[2,1]] has 1 +- 2i', () => {
    const e = eigen(m(1, -2, 2, 1));
    if (e.kind !== 'complex') throw new Error('expected complex');
    expect(e.re).toBeCloseTo(1, 12);
    expect(e.im).toBeCloseTo(2, 12);
  });

  it('rotation by theta has eigenvalues cos + i sin', () => {
    const theta = 0.6;
    const e = eigen(rotation(theta));
    if (e.kind !== 'complex') throw new Error('expected complex');
    expect(e.re).toBeCloseTo(Math.cos(theta), 12);
    expect(e.im).toBeCloseTo(Math.sin(theta), 12);
  });

  it('satisfies A v = lambda v with v and lambda complex', () => {
    for (const a of randomMatrices(200)) {
      const e = eigen(a);
      if (e.kind !== 'complex') continue;
      // (re + i im)(vRe + i vIm) = (re vRe - im vIm) + i (re vIm + im vRe)
      const lvRe: Vec2 = [e.re * e.vRe[0] - e.im * e.vIm[0], e.re * e.vRe[1] - e.im * e.vIm[1]];
      const lvIm: Vec2 = [e.re * e.vIm[0] + e.im * e.vRe[0], e.re * e.vIm[1] + e.im * e.vRe[1]];
      expectVec(apply(a, e.vRe), lvRe, 8);
      expectVec(apply(a, e.vIm), lvIm, 8);
    }
  });
});

describe('eigen: bookkeeping', () => {
  it('eigenvalues sum to the trace and multiply to the determinant', () => {
    for (const a of randomMatrices(100)) {
      const e = eigen(a);
      if (e.kind === 'real') {
        expect(e.values[0] + e.values[1]).toBeCloseTo(trace(a), 9);
        expect(e.values[0] * e.values[1]).toBeCloseTo(det(a), 9);
      } else if (e.kind === 'complex') {
        expect(2 * e.re).toBeCloseTo(trace(a), 9);
        expect(e.re * e.re + e.im * e.im).toBeCloseTo(det(a), 9);
      }
    }
  });
});

describe('svd', () => {
  it('[[3,0],[4,5]] has sigma = 3 sqrt 5 and sqrt 5 (AtA = [[25,20],[20,25]])', () => {
    const { s } = svd(m(3, 0, 4, 5));
    expect(s[0]).toBeCloseTo(3 * Math.sqrt(5), 12);
    expect(s[1]).toBeCloseTo(Math.sqrt(5), 12);
  });

  it('shear [[1,1],[0,1]] has sigma = golden ratio and its reciprocal', () => {
    const { s } = svd(m(1, 1, 0, 1));
    expect(s[0]).toBeCloseTo((1 + Math.sqrt(5)) / 2, 12);
    expect(s[1]).toBeCloseTo((Math.sqrt(5) - 1) / 2, 12);
  });

  it('rotations have sigma = (1, 1)', () => {
    const { s } = svd(rotation(1.1));
    expect(s[0]).toBeCloseTo(1, 12);
    expect(s[1]).toBeCloseTo(1, 12);
  });

  it('a negative diagonal entry becomes a reflection in U, not a negative sigma', () => {
    const { u, s, v } = svd(diag(2, -3));
    expect(s[0]).toBeCloseTo(3, 12);
    expect(s[1]).toBeCloseTo(2, 12);
    expect(det(u) * det(v)).toBeCloseTo(-1, 12);
  });

  it('rank-one [[1,2],[2,4]] has sigma = (5, 0)', () => {
    const { s } = svd(m(1, 2, 2, 4));
    expect(s[0]).toBeCloseTo(5, 12);
    expect(s[1]).toBeCloseTo(0, 12);
  });

  it('zero matrix has sigma = (0, 0)', () => {
    expect(svd(m(0, 0, 0, 0)).s).toEqual([0, 0]);
  });

  it('sigma1 * sigma2 = |det|', () => {
    for (const a of randomMatrices(100)) {
      const { s } = svd(a);
      expect(s[0] * s[1]).toBeCloseTo(Math.abs(det(a)), 9);
    }
  });

  it('reconstructs A = U S Vt with orthogonal U and V', () => {
    for (const a of randomMatrices(200)) {
      const { u, s, v } = svd(a);
      expect(s[0]).toBeGreaterThanOrEqual(s[1]);
      expect(s[1]).toBeGreaterThanOrEqual(0);
      expectMat(mul(mul(u, diag(s[0], s[1])), transpose(v)), a, 9);
      expectMat(mul(transpose(u), u), IDENTITY, 10);
      expectMat(mul(transpose(v), v), IDENTITY, 10);
    }
  });
});
