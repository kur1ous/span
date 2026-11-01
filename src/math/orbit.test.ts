import { describe, expect, it } from 'vitest';
import { diag, eigen, type Mat2 } from './mat2';
import { complexOrbit, complexPolar } from './orbit';

describe('complex eigenvalue polar form', () => {
  it.each([
    [{ a: 3, b: -4, c: 4, d: 3 }, 5, Math.atan2(4, 3)],
    [{ a: -1, b: -1, c: 1, d: -1 }, Math.SQRT2, 3 * Math.PI / 4],
    [{ a: 0, b: 0.5, c: -0.5, d: 0 }, 0.5, Math.PI / 2],
    [{ a: 0, b: -4, c: 1, d: 0 }, 2, Math.PI / 2],
  ] as [Mat2, number, number][])( 'gets modulus and principal argument for %o', (m, modulus, angle) => {
    const polar = complexPolar(eigen(m))!;
    expect(polar.modulus).toBeCloseTo(modulus);
    expect(polar.angle).toBeCloseTo(angle);
  });

  it.each([diag(2, 3), diag(1, 1)])('omits polar data for real eigenvalues', (m) => {
    expect(complexPolar(eigen(m))).toBeNull();
  });
});

describe('complex probe orbit', () => {
  it.each([0.5, 1, 2])('traces all thirteen iterates at scale %s', (scale) => {
    const orbit = complexOrbit({ a: 0, b: -scale, c: scale, d: 0 }, [1, 0]);
    expect(orbit).toHaveLength(13);
    orbit.forEach(([x, y], n) => {
      expect(x).toBeCloseTo(scale ** n * Math.cos(n * Math.PI / 2));
      expect(y).toBeCloseTo(scale ** n * Math.sin(n * Math.PI / 2));
    });
  });

  it('applies the matrix rather than assuming a circular orbit', () => {
    const orbit = complexOrbit({ a: 0, b: -4, c: 1, d: 0 }, [1, 2]);
    expect(orbit.slice(0, 4)).toEqual([[1, 2], [-8, 1], [-4, -8], [32, -4]]);
    expect(orbit[12]).toEqual([4096, 8192]);
  });

  it('keeps a zero probe at the origin', () => {
    const orbit = complexOrbit({ a: 0, b: -1, c: 1, d: 0 }, [0, 0]);
    expect(orbit).toHaveLength(13);
    expect(orbit.every(([x, y]) => x === 0 && y === 0)).toBe(true);
  });

  it.each([diag(2, 3), diag(1, 1)])('clears the orbit for real eigenvalues', (m) => {
    expect(complexOrbit(m, [1, 2])).toEqual([]);
  });

  it('stops before an iterate overflows', () => {
    const orbit = complexOrbit({ a: 0, b: -2, c: 2, d: 0 }, [1e308, 0]);
    expect(orbit).toEqual([[1e308, 0]]);
  });
});
