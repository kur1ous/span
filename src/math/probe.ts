import { eigen, norm, type Mat2, type Vec2 } from './mat2';

const ANGLE_TOLERANCE = Math.sin(2 * Math.PI / 180);

export function nearEigendirection(m: Mat2, v: Vec2): boolean {
  const length = norm(v);
  if (length === 0 || !Number.isFinite(length)) return false;
  const e = eigen(m);
  if (e.kind === 'complex') return false;
  if (e.kind === 'repeated' && !e.defective) return true;
  const x = v[0] / length;
  const y = v[1] / length;
  return e.vectors.some(([ex, ey]) => Math.abs(x * ey - y * ex) <= ANGLE_TOLERANCE);
}
