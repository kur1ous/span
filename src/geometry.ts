import { apply, type Mat2, type Vec2 } from './math/mat2';
import { gridStops, sourceExtent } from './grid';
import { toScreen, worldBounds, type View } from './view';

type Segment = readonly [Vec2, Vec2];

export function paperGrid(view: View) {
  const b = worldBounds(view);
  const fine: Segment[] = [], unit: Segment[] = [], axes: Segment[] = [];
  const vertical = (x: number, into: Segment[]) =>
    into.push([toScreen(view, [x, b.min[1]]), toScreen(view, [x, b.max[1]])]);
  const horizontal = (y: number, into: Segment[]) =>
    into.push([toScreen(view, [b.min[0], y]), toScreen(view, [b.max[0], y])]);

  // Quarter-unit rules are only useful once a unit is wide enough to subdivide.
  if (view.scale >= 36) {
    for (let x = Math.ceil(b.min[0] * 4) / 4; x <= b.max[0]; x += 0.25)
      if (!Number.isInteger(x)) vertical(x, fine);
    for (let y = Math.ceil(b.min[1] * 4) / 4; y <= b.max[1]; y += 0.25)
      if (!Number.isInteger(y)) horizontal(y, fine);
  }
  for (let x = Math.ceil(b.min[0]); x <= b.max[0]; x++) if (x !== 0) vertical(x, unit);
  for (let y = Math.ceil(b.min[1]); y <= b.max[1]; y++) if (y !== 0) horizontal(y, unit);
  vertical(0, axes);
  horizontal(0, axes);
  return { fine, unit, axes };
}

export function transformedGrid(m: Mat2, view: View) {
  const ext = sourceExtent(m, worldBounds(view));
  const image = (p: Vec2) => toScreen(view, apply(m, p));
  const lines: Segment[] = [], axes: Segment[] = [];
  for (const x of gridStops(ext.min[0], ext.max[0])) {
    const seg: Segment = [image([x, ext.min[1] - 1]), image([x, ext.max[1] + 1])];
    (x === 0 ? axes : lines).push(seg);
  }
  for (const y of gridStops(ext.min[1], ext.max[1])) {
    const seg: Segment = [image([ext.min[0] - 1, y]), image([ext.max[0] + 1, y])];
    (y === 0 ? axes : lines).push(seg);
  }
  return { lines, axes };
}

export function arrowGeometry(o: Vec2, tip: Vec2) {
  const dx = tip[0] - o[0], dy = tip[1] - o[1];
  const len = Math.hypot(dx, dy);
  if (len < 2) return null;
  const ux = dx / len, uy = dy / len;
  const hl = Math.min(15, len * 0.55), hw = hl * 0.42;
  const bx = tip[0] - ux * hl, by = tip[1] - uy * hl;
  const head: Vec2[] = [tip, [bx - uy * hw, by + ux * hw], [bx + uy * hw, by - ux * hw]];
  const shaftEnd: Vec2 = [bx + ux, by + uy];
  const label: Vec2 = [tip[0] + ux * 16 - uy * 10, tip[1] + uy * 16 + ux * 10 + 5];
  return { head, shaftEnd, label };
}

export function orientationArc(view: View, ti: Vec2, tj: Vec2, area: number) {
  const o = toScreen(view, [0, 0]);
  const li = Math.hypot(ti[0] - o[0], ti[1] - o[1]);
  const lj = Math.hypot(tj[0] - o[0], tj[1] - o[1]);
  const radius = Math.min(30, li * 0.5, lj * 0.5);
  if (radius <= 9 || Math.abs(area) * view.scale * view.scale <= 400) return null;
  const a1 = Math.atan2(ti[1] - o[1], ti[0] - o[0]);
  const a2 = Math.atan2(tj[1] - o[1], tj[0] - o[0]);
  // SVG's y axis points down: positive area travels counter-clockwise (sweep 0).
  const sweep = area < 0 ? 1 : 0;
  const at = (a: number): Vec2 => [o[0] + radius * Math.cos(a), o[1] + radius * Math.sin(a)];
  const start = at(a1), end = at(a2);
  const t: Vec2 = sweep ? [-Math.sin(a2), Math.cos(a2)] : [Math.sin(a2), -Math.cos(a2)];
  const n: Vec2 = [-t[1], t[0]];
  const head: Vec2[] = [
    [end[0] + t[0] * 6, end[1] + t[1] * 6],
    [end[0] - t[0] * 2 + n[0] * 4, end[1] - t[1] * 2 + n[1] * 4],
    [end[0] - t[0] * 2 - n[0] * 4, end[1] - t[1] * 2 - n[1] * 4],
  ];
  return { start, end, radius, sweep, head };
}
