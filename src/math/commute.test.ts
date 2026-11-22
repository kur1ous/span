import { expect, it } from 'vitest';
import { commute, diag, IDENTITY, rotation, type Mat2 } from './mat2';

const shear = { a: 1, b: 1, c: 0, d: 1 };

it.each([IDENTITY, diag(0, 0), diag(-3, -3), shear])('commutes with a shear: %o', (b) => {
  expect(commute(shear, b)).toBe(true);
  expect(commute(b, shear)).toBe(true);
});

it('accepts rotations and diagonal pairs', () => {
  expect(commute(rotation(0.3), rotation(-0.7))).toBe(true);
  expect(commute(diag(2, 0), diag(-1, 3))).toBe(true);
});

it.each([1, 1e-200, 1e200])('distinguishes order independently of factor scale %s', (scale) => {
  const scaled = (m: Mat2): Mat2 => ({
    a: scale * m.a, b: scale * m.b, c: scale * m.c, d: scale * m.d,
  });
  // AB = [2,1; 0,1], BA = [2,2; 0,1] before scaling.
  expect(commute(scaled(shear), scaled(diag(2, 1)))).toBe(false);
  expect(commute(scaled(shear), scaled(diag(2, 2)))).toBe(true);
});
