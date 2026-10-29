import { describe, expect, it } from 'vitest';
import { diag, rotation, type Vec2 } from './mat2';
import { nearEigendirection } from './probe';

function direction(degrees: number): Vec2 {
  const angle = degrees * Math.PI / 180;
  return [Math.cos(angle), Math.sin(angle)];
}

describe('nearEigendirection', () => {
  it('uses a two-degree tolerance around either eigenline', () => {
    const m = diag(3, 1);
    expect(nearEigendirection(m, direction(1.9))).toBe(true);
    expect(nearEigendirection(m, direction(2.1))).toBe(false);
    expect(nearEigendirection(m, direction(88.1))).toBe(true);
    expect(nearEigendirection(m, direction(87.9))).toBe(false);
  });

  it('ignores vector length, sign and the sign of the eigenvalue', () => {
    const m = { a: 1, b: 2, c: 2, d: 1 };
    expect(nearEigendirection(m, [4, 4])).toBe(true);
    expect(nearEigendirection(m, [-4, -4])).toBe(true);
    expect(nearEigendirection(m, [-0.01, 0.01])).toBe(true);
    expect(nearEigendirection(m, [1, 0])).toBe(false);
  });

  it('includes the kernel direction when the image is zero', () => {
    expect(nearEigendirection(diag(2, 0), [0, -3])).toBe(true);
  });

  it('only accepts the single eigenline of a defective matrix', () => {
    const m = { a: 1, b: 1, c: 0, d: 1 };
    expect(nearEigendirection(m, [-2, 0])).toBe(true);
    expect(nearEigendirection(m, [1, 1])).toBe(false);
  });

  it('accepts every nonzero direction for scalar matrices', () => {
    for (const scale of [0, 1, -2]) {
      expect(nearEigendirection(diag(scale, scale), [2, 3])).toBe(true);
      expect(nearEigendirection(diag(scale, scale), [0, 0])).toBe(false);
    }
  });

  it('rejects rotations even when the image is nearly parallel', () => {
    expect(nearEigendirection(rotation(Math.PI / 2), [1, 0])).toBe(false);
    expect(nearEigendirection(rotation(Math.PI / 180), [1, 0])).toBe(false);
  });
});
