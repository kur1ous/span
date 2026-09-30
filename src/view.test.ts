import { describe, expect, it } from 'vitest';
import { SPAN, makeView, toScreen, toWorld, worldBounds } from './view';
import { sourceExtent, gridStops } from './grid';

describe('view', () => {
  const v = makeView(800, 550);

  it('puts the origin at the centre and flips y', () => {
    expect(toScreen(v, [0, 0])).toEqual([400, 275]);
    const [, y] = toScreen(v, [0, 1]);
    expect(y).toBeLessThan(275);
  });

  it('round-trips through toWorld', () => {
    const p = toWorld(v, toScreen(v, [1.25, -3.5]));
    expect(p[0]).toBeCloseTo(1.25, 12);
    expect(p[1]).toBeCloseTo(-3.5, 12);
  });

  it('shows SPAN units along the shorter side', () => {
    const b = worldBounds(v);
    expect(b.max[1] - b.min[1]).toBeCloseTo(SPAN, 12);
    expect(b.max[0] - b.min[0]).toBeGreaterThan(SPAN);
  });
});

describe('grid', () => {
  const bounds = { min: [-6, -4] as const, max: [6, 4] as const };

  it('source extent under the identity is the bounds themselves', () => {
    const e = sourceExtent({ a: 1, b: 0, c: 0, d: 1 }, bounds);
    expect(e.min).toEqual([-6, -4]);
    expect(e.max).toEqual([6, 4]);
  });

  it('a 2x stretch halves the source extent', () => {
    const e = sourceExtent({ a: 2, b: 0, c: 0, d: 2 }, bounds);
    expect(e.max[0]).toBeCloseTo(3, 12);
    expect(e.max[1]).toBeCloseTo(2, 12);
  });

  it('falls back to a finite box when singular', () => {
    const e = sourceExtent({ a: 1, b: 2, c: 2, d: 4 }, bounds);
    expect(Number.isFinite(e.max[0])).toBe(true);
  });

  it('thins the grid instead of drawing thousands of lines', () => {
    expect(gridStops(-3, 3).length).toBeLessThan(12);
    expect(gridStops(-200, 200, 60).length).toBeLessThan(100);
  });
});
