import { describe, expect, it } from 'vitest';
import { classify } from './classify';
import { diag, IDENTITY, rotation } from './mat2';

describe('matrix classification', () => {
  it('keeps identity concise despite its overlapping properties', () => {
    expect(classify(IDENTITY)).toEqual(['identity']);
    expect(classify(rotation(2 * Math.PI))).toEqual(['identity']);
  });

  it('recognizes rotations and reflections, including their overlaps', () => {
    expect(classify(rotation(Math.PI / 3))).toEqual(['rotation']);
    expect(classify(diag(-1, -1))).toEqual(['rotation', 'scaling', 'symmetric']);
    expect(classify({ a: 0, b: 1, c: 1, d: 0 })).toEqual(['reflection', 'symmetric']);
    expect(classify(diag(1, -1))).toEqual(['reflection', 'scaling', 'symmetric']);
  });

  it('recognizes shears along the axes or a rotated line', () => {
    expect(classify({ a: 1, b: 2, c: 0, d: 1 })).toEqual(['shear']);
    expect(classify({ a: 1, b: 0, c: -3, d: 1 })).toEqual(['shear']);
    // A-I = [2,-2; 2,-2], whose square is zero.
    expect(classify({ a: 3, b: -2, c: 2, d: -1 })).toEqual(['shear']);
  });

  it('recognizes orthogonal and oblique projections and their singularity', () => {
    expect(classify(diag(1, 0))).toEqual(['projection', 'scaling', 'symmetric', 'singular']);
    expect(classify({ a: 0.5, b: 0.5, c: 0.5, d: 0.5 }))
      .toEqual(['projection', 'symmetric', 'singular']);
    expect(classify({ a: 1, b: 2, c: 0, d: 0 })).toEqual(['projection', 'singular']);
    expect(classify(diag(0, 0))).toEqual(['projection', 'scaling', 'symmetric', 'singular']);
  });

  it('recognizes signed scaling, other symmetric matrices and rank loss', () => {
    expect(classify(diag(-2, 3))).toEqual(['scaling', 'symmetric']);
    expect(classify({ a: 2, b: 1, c: 1, d: 3 })).toEqual(['symmetric']);
    expect(classify({ a: 1, b: 2, c: 2, d: 4 })).toEqual(['symmetric', 'singular']);
    expect(classify({ a: 1, b: 2, c: 3, d: 6 })).toEqual(['singular']);
    expect(classify({ a: 0, b: 2, c: 0, d: 0 })).toEqual(['singular']);
  });

  it('leaves generic transformations unclassified and rejects near misses', () => {
    expect(classify({ a: 1.5, b: -0.5, c: 0.5, d: 1 })).toEqual([]);
    expect(classify({ a: 0, b: -1.001, c: 1, d: 0 })).toEqual([]);
    expect(classify({ a: 1, b: 2, c: 0, d: 1.001 })).toEqual([]);
    expect(classify({ a: 1.001, b: 2, c: 0, d: 0 })).toEqual(['singular']);
  });

  it('handles roundoff without treating small invertible scalings as singular', () => {
    expect(classify({ a: 1 + 1e-12, b: 1e-12, c: 0, d: 1 })).toEqual(['identity']);
    for (const scale of [1e-200, 1e200]) {
      expect(classify(diag(scale, 2 * scale))).toEqual(['scaling', 'symmetric']);
      expect(classify({ a: scale, b: 2 * scale, c: 3 * scale, d: 6 * scale }))
        .toEqual(['singular']);
    }
    expect(classify(diag(1e-200, 1e200))).toEqual(['scaling', 'symmetric']);
  });

  it('rejects non-finite entries', () => {
    for (const value of [NaN, Infinity, -Infinity]) {
      expect(() => classify({ ...IDENTITY, b: value })).toThrow('Matrix entries must be finite.');
    }
  });
});
