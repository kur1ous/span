import { apply, eigen, type Eigen, type Mat2, type Vec2 } from './mat2';

export function complexPolar(e: Eigen) {
  if (e.kind !== 'complex') return null;
  return { modulus: Math.hypot(e.re, e.im), angle: Math.atan2(e.im, e.re) };
}

export function complexOrbit(m: Mat2, v: Vec2): Vec2[] {
  if (eigen(m).kind !== 'complex') return [];
  const points: Vec2[] = [];
  let point = v;
  for (let n = 0; n <= 12; n++) {
    if (!point.every(Number.isFinite)) break;
    points.push(point);
    point = apply(m, point);
  }
  return points;
}
