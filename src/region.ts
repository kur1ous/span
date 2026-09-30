import { apply, type Mat2, type Vec2 } from './math/mat2';

/** Corners of the image of the unit square, in order 0 -> A i -> A(i+j) -> A j. */
export function unitSquareImage(m: Mat2): Vec2[] {
  return [
    apply(m, [0, 0]),
    apply(m, [1, 0]),
    apply(m, [1, 1]),
    apply(m, [0, 1]),
  ];
}

/** Shoelace area; positive when the corners run counter-clockwise (y up). */
export function polygonArea(pts: readonly Vec2[]): number {
  let twice = 0;
  for (let k = 0; k < pts.length; k++) {
    const p = pts[k]!;
    const q = pts[(k + 1) % pts.length]!;
    twice += p[0] * q[1] - q[0] * p[1];
  }
  return twice / 2;
}

/** Vertex average; for a parallelogram this is its centre. */
export function centroid(pts: readonly Vec2[]): Vec2 {
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p[0];
    y += p[1];
  }
  return [x / pts.length, y / pts.length];
}
