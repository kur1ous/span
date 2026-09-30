import { describe, expect, it } from 'vitest';
import { clampTo, getColumn, nudge, snap, withColumn } from './edit';

describe('edit', () => {
  const m = { a: 1, b: 2, c: 3, d: 4 };

  it('reads and replaces columns', () => {
    expect(getColumn(m, 'i')).toEqual([1, 3]);
    expect(getColumn(m, 'j')).toEqual([2, 4]);
    expect(withColumn(m, 'j', [9, 8])).toEqual({ a: 1, b: 9, c: 3, d: 8 });
    expect(withColumn(m, 'i', [7, 6])).toEqual({ a: 7, b: 2, c: 6, d: 4 });
  });

  it('snaps to half-integers only when close', () => {
    expect(snap([1.03, -0.96])).toEqual([1, -1]);
    expect(snap([0.48, 2.5])).toEqual([0.5, 2.5]);
    expect(snap([0.75, 1.2])).toEqual([0.75, 1.2]);
  });

  it('clamps per axis', () => {
    expect(clampTo([9, -9], [5, 4])).toEqual([5, -4]);
    expect(clampTo([1, 2], [5, 4])).toEqual([1, 2]);
  });

  it('nudges without float dust', () => {
    let v: [number, number] = [0, 0];
    for (let k = 0; k < 3; k++) v = nudge(v, 0.1, 0) as [number, number];
    expect(v[0]).toBe(0.3);
  });
});
