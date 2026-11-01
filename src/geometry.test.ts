import { describe, expect, it } from 'vitest';
import { arrowGeometry, eigenLines, eigenRing, orientationArc, paperGrid, singularAxes, transformedGrid, unitCircleImage } from './geometry';
import type { Vec2 } from './math/mat2';

const view = { width: 200, height: 200, scale: 50 };
const close = (actual: readonly Vec2[], expected: readonly Vec2[]) => {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((p, i) => {
    expect(actual[i]![0]).toBeCloseTo(p[0], 12);
    expect(actual[i]![1]).toBeCloseTo(p[1], 12);
  });
};

describe('singular value semi-axes', () => {
  it('uses left singular directions for a rotated ellipse, independent of source rotation', () => {
    // Both images have radii 3 and 1, rotated with cos = 3/5, sin = 4/5.
    for (const m of [{ a: 1.8, b: -0.8, c: 2.4, d: 0.6 },
      { a: 0.8, b: 1.8, c: -0.6, d: 2.4 }]) {
      const axes = singularAxes(m, view);
      expect(axes[0]!.value).toBeCloseTo(3, 12);
      expect(axes[1]!.value).toBeCloseTo(1, 12);
      close(axes[0]!.segment, [[100, 100], [190, -20]]);
      close(axes[1]!.segment, [[100, 100], [60, 70]]);
    }
  });

  it('keeps reflected radii nonnegative and follows the resized view', () => {
    const axes = singularAxes({ a: 3, b: 0, c: 0, d: -2 },
      { width: 600, height: 400, scale: 100 });
    expect(axes.map((axis) => axis.value)).toEqual([3, 2]);
    close(axes[0]!.segment, [[300, 200], [600, 200]]);
    close(axes[1]!.segment, [[300, 200], [300, 400]]);
  });

  it('keeps zero semi-axes at the origin for rank-one and zero matrices', () => {
    const axes = singularAxes({ a: 1, b: 1, c: 0, d: 0 }, view);
    expect(axes[0]!.value).toBeCloseTo(Math.sqrt(2), 12);
    expect(axes[1]!.value).toBe(0);
    close(axes[0]!.segment, [[100, 100], [100 + 50 * Math.sqrt(2), 100]]);
    close(axes[1]!.segment, [[100, 100], [100, 100]]);
    for (const axis of singularAxes({ a: 0, b: 0, c: 0, d: 0 }, view)) {
      expect(axis.value).toBe(0);
      close(axis.segment, [[100, 100], [100, 100]]);
    }
  });

  it('draws equal perpendicular radii for a circle', () => {
    const axes = singularAxes({ a: 2, b: 0, c: 0, d: 2 }, view);
    expect(axes.map((axis) => axis.value)).toEqual([2, 2]);
    close(axes[0]!.segment, [[100, 100], [200, 100]]);
    close(axes[1]!.segment, [[100, 100], [100, 0]]);
  });
});

describe('unit circle image', () => {
  it('keeps the identity image on the unit circle', () => {
    const points = unitCircleImage({ a: 1, b: 0, c: 0, d: 1 }, view);
    expect(points).toHaveLength(128);
    for (const [x, y] of points) expect(Math.hypot(x - 100, y - 100)).toBeCloseTo(50, 12);
  });

  it('uses both columns for a sheared ellipse, including between the column tips', () => {
    const points = unitCircleImage({ a: 2, b: 1, c: 0, d: 1 }, view);
    close([points[0]!, points[32]!, points[64]!, points[96]!],
      [[200, 100], [150, 50], [0, 100], [50, 150]]);
    close([points[16]!], [[100 + 150 / Math.sqrt(2), 100 - 50 / Math.sqrt(2)]]);
  });

  it('maps a rotated, reflected ellipse into a resized frame', () => {
    const points = unitCircleImage({ a: 0, b: 2, c: 1, d: 0 },
      { width: 600, height: 400, scale: 100 });
    close([points[0]!, points[32]!, points[64]!, points[96]!],
      [[300, 100], [500, 200], [300, 300], [100, 200]]);
  });

  it('collapses to a segment or point without losing finite geometry', () => {
    const points = unitCircleImage({ a: 1, b: 1, c: 0, d: 0 }, view);
    expect(points.every(([x, y]) => Number.isFinite(x) && y === 100)).toBe(true);
    expect(Math.max(...points.map(([x]) => x))).toBeCloseTo(100 + 50 * Math.sqrt(2), 12);
    expect(Math.min(...points.map(([x]) => x))).toBeCloseTo(100 - 50 * Math.sqrt(2), 12);
    expect(unitCircleImage({ a: 0, b: 0, c: 0, d: 0 }, view)
      .every(([x, y]) => x === 100 && y === 100)).toBe(true);
  });
});

describe('eigenlines', () => {
  it('clips horizontal and vertical eigenlines and keeps their eigenvalues', () => {
    const lines = eigenLines({ a: 3, b: 0, c: 0, d: -2 }, view);
    expect(lines.map((line) => line.value)).toEqual([3, -2]);
    close(lines[0]!.segment, [[0, 100], [200, 100]]);
    close(lines[1]!.segment, [[100, 200], [100, 0]]);
    close(lines.map((line) => line.label), [[185, 100], [100, 185]]);
    expect(lines.map((line) => line.anchor)).toEqual(['end', 'middle']);
  });

  it.each([
    { width: 400, height: 200, ends: [[100, 200], [300, 0]] as Vec2[] },
    { width: 200, height: 400, ends: [[0, 300], [200, 100]] as Vec2[] },
  ])('clips diagonal lines in a $width by $height frame', ({ width, height, ends }) => {
    const lines = eigenLines({ a: 2, b: 1, c: 1, d: 2 }, { width, height, scale: 50 });
    close(lines[0]!.segment, ends);
    close(lines[1]!.segment, ends.map(([x, y]) => [x, height - y]));
    expect(lines.map((line) => line.value)).toEqual([3, 1]);
  });

  it('preserves nonorthogonal eigendirections and a zero eigenvalue', () => {
    const lines = eigenLines({ a: 2, b: 6, c: 0, d: 0 }, view);
    expect(lines.map((line) => line.value)).toEqual([2, 0]);
    close(lines[1]!.segment, [[0, 100 - 100 / 3], [200, 100 + 100 / 3]]);
  });

  it.each([
    { m: { a: 1, b: 2, c: 0, d: 1 }, ends: [[0, 100], [200, 100]] as Vec2[] },
    { m: { a: 1, b: 0, c: 2, d: 1 }, ends: [[100, 200], [100, 0]] as Vec2[] },
    { m: { a: 2, b: -1, c: 1, d: 0 }, ends: [[0, 200], [200, 0]] as Vec2[] },
  ])('draws just the eigenspace of a defective matrix $m', ({ m, ends }) => {
    const lines = eigenLines(m, view);
    expect(lines).toHaveLength(1);
    close(lines[0]!.segment, ends);
    expect(lines[0]!.value).toBe(1);
    expect(lines[0]!.caption).toBe('one line only');
    expect(eigenRing(m)).toBeNull();
  });

  it('draws no lines for a complex pair or scalar matrix', () => {
    expect(eigenLines({ a: 0, b: -1, c: 1, d: 0 }, view)).toEqual([]);
    expect(eigenLines({ a: 1, b: 0, c: 0, d: 1 }, view)).toEqual([]);
  });
});

describe('scalar eigenvalue ring', () => {
  it.each([0, 1, -2, 3])('marks every direction for %s times the identity', (value) => {
    const m = { a: value, b: 0, c: 0, d: value };
    const ring = eigenRing(m)!;
    expect(ring.value).toBe(value);
    expect(ring.ticks).toHaveLength(24);
    expect(eigenLines(m, view)).toEqual([]);
    close(ring.ticks[0]!, [[0.85, 0], [1, 0]]);
    close(ring.ticks[6]!, [[0, 0.85], [0, 1]]);
    close(ring.ticks[12]!, [[-0.85, 0], [-1, 0]]);
    close(ring.ticks[18]!, [[0, -0.85], [0, -1]]);
    for (const [inner, outer] of ring.ticks) {
      expect(Math.hypot(...inner)).toBeCloseTo(0.85, 12);
      expect(Math.hypot(...outer)).toBeCloseTo(1, 12);
      expect(inner[0] * outer[1] - inner[1] * outer[0]).toBeCloseTo(0, 12);
    }
  });

  it('does not suggest every direction for distinct or complex eigenvalues', () => {
    expect(eigenRing({ a: 2, b: 0, c: 0, d: 1 })).toBeNull();
    expect(eigenRing({ a: 0, b: -1, c: 1, d: 0 })).toBeNull();
  });
});

describe('orientation arc', () => {
  it.each([
    { j: [100, 40] as Vec2, area: 1.44, sweep: 0, end: [100, 70] as Vec2,
      head: [[94, 70], [102, 66], [102, 74]] as Vec2[] },
    { j: [100, 160] as Vec2, area: -1.44, sweep: 1, end: [100, 130] as Vec2,
      head: [[94, 130], [102, 126], [102, 134]] as Vec2[] },
  ])('uses sweep $sweep for area $area and a tangent arrowhead', ({ j, area, sweep, end, head }) => {
    const arc = orientationArc(view, [160, 100], j, area)!;
    expect(arc.sweep).toBe(sweep);
    expect(arc.radius).toBe(30);
    close([arc.start, arc.end], [[130, 100], end]);
    close(arc.head, head);
  });

  it('keeps the sweep direction across the negative x axis', () => {
    const arc = orientationArc(view, [60, 60], [60, 140], 1.28)!;
    expect(arc.sweep).toBe(0);
    close([arc.start, arc.end], [[80, 80], [80, 120]]);
    expect(orientationArc(view, [60, 140], [60, 60], -1.28)!.sweep).toBe(1);
  });

  it('hides collapsed, small-area and short-radius arcs', () => {
    expect(orientationArc(view, [160, 100], [160, 100], 0)).toBeNull();
    expect(orientationArc(view, [140, 100], [140, 90], 0.16)).toBeNull();
    expect(orientationArc(view, [118, 100], [100, 40], 0.432)).toBeNull();
    expect(orientationArc(view, [100, 100], [100, 40], 0)).toBeNull();
  });
});

describe('vector arrow', () => {
  it('places the head at a translated tip, with the shaft tucked into its base', () => {
    const arrow = arrowGeometry([10, 20], [110, 20])!;
    close(arrow.head, [[110, 20], [95, 26.3], [95, 13.7]]);
    close([arrow.shaftEnd, arrow.label], [[96, 20], [126, 35]]);
  });

  it('rotates the head with a diagonal pointing back toward the origin', () => {
    const arrow = arrowGeometry([40, 50], [10, 10])!;
    close(arrow.head, [[10, 10], [24.04, 18.22], [13.96, 25.78]]);
    close([arrow.shaftEnd], [[18.4, 21.2]]);
  });

  it('shrinks short arrowheads and hides vectors below two pixels', () => {
    close(arrowGeometry([0, 0], [10, 0])!.head, [[10, 0], [4.5, 2.31], [4.5, -2.31]]);
    expect(arrowGeometry([10, 20], [10, 20])).toBeNull();
    expect(arrowGeometry([10, 20], [11, 20])).toBeNull();
    expect(arrowGeometry([0, 0], [2, 0])).not.toBeNull();
  });
});

describe('grid segments', () => {
  it('separates paper subdivisions, whole units and axes in screen coordinates', () => {
    const grid = paperGrid(view);
    expect(grid.fine).toHaveLength(24);
    expect(grid.unit).toHaveLength(8);
    expect(grid.fine).toContainEqual([[12.5, 200], [12.5, 0]]);
    expect(grid.unit).toContainEqual([[50, 200], [50, 0]]);
    expect(grid.axes).toEqual([[[100, 200], [100, 0]], [[0, 100], [200, 100]]]);
    expect(paperGrid({ ...view, scale: 35 }).fine).toEqual([]);
  });

  it('transforms grid endpoints and keeps the two axes separate', () => {
    const grid = transformedGrid({ a: 2, b: 0, c: 0, d: -1 }, view);
    expect(grid.lines).toHaveLength(8);
    expect(grid.lines).toContainEqual([[0, -50], [0, 250]]);
    expect(grid.axes).toEqual([[[100, -50], [100, 250]], [[-100, 100], [300, 100]]]);
  });

  it('returns bounded, finite segments for a singular matrix', () => {
    const grid = transformedGrid({ a: 1, b: 0, c: 0, d: 0 }, view);
    const segments = [...grid.lines, ...grid.axes];
    expect(segments.length).toBeLessThan(130);
    expect(segments.flat(2).every(Number.isFinite)).toBe(true);
  });
});
