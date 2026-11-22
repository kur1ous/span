import { expect, it } from 'vitest';
import { diag } from './mat2';
import { solve } from './solve';

it('solves a coupled system with row-major entries', () => {
  expect(solve({ a: 2, b: 1, c: 1, d: 3 }, [7, 11])).toEqual([2, 3]);
  expect(solve(diag(-2, 4), [6, 8])).toEqual([-3, 2]);
  expect(solve(diag(2, 3), [0, 0])).toEqual([0, 0]);
});

it('rejects both inconsistent and underdetermined singular systems', () => {
  expect(solve(diag(1, 0), [1, 2])).toBeNull();
  expect(solve(diag(1, 0), [1, 0])).toBeNull();
  expect(solve(diag(0, 0), [0, 0])).toBeNull();
  expect(solve({ a: 1, b: 1, c: 1, d: 1 + 1e-14 }, [2, 2])).toBeNull();
});

it('keeps small invertible systems and rejects non-finite results', () => {
  const x = solve(diag(1e-8, 1e-8), [2e-8, 3e-8])!;
  expect(x[0]).toBeCloseTo(2, 12);
  expect(x[1]).toBeCloseTo(3, 12);
  expect(solve(diag(1e-200, 1), [1e200, 1])).toBeNull();
});
