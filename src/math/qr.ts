import { fromColumns, IDENTITY, type Mat2, type Vec2 } from './mat2';

export interface Qr {
  readonly q: Mat2;
  /** Upper triangular, with nonnegative diagonal; A = Q R. */
  readonly r: Mat2;
}

export function qr(m: Mat2): Qr {
  if (![m.a, m.b, m.c, m.d].every(Number.isFinite)) {
    throw new RangeError('Matrix entries must be finite.');
  }
  const firstScale = Math.max(Math.abs(m.a), Math.abs(m.c));
  const secondScale = Math.max(Math.abs(m.b), Math.abs(m.d));
  if (firstScale === 0 && secondScale === 0) {
    return { q: IDENTITY, r: { a: 0, b: 0, c: 0, d: 0 } };
  }

  // A zero first column leaves q1 free; use the remaining column's direction.
  const x = firstScale ? m.a / firstScale : m.b / secondScale;
  const y = firstScale ? m.c / firstScale : m.d / secondScale;
  const length = Math.hypot(x, y);
  const q1: Vec2 = [x / length, y / length];
  const b = secondScale ? m.b / secondScale : 0;
  const d = secondScale ? m.d / secondScale : 0;
  const projection = q1[0] * b + q1[1] * d;

  // In 2D the residual lies on this perpendicular. Measuring it directly
  // avoids losing orthogonality by subtracting nearly parallel vectors.
  let residual = q1[0] * d - q1[1] * b;
  const tolerance = 1e-12 * Math.max(Math.abs(q1[0] * d), Math.abs(q1[1] * b));
  if (firstScale === 0 || Math.abs(residual) <= tolerance) residual = 0;
  const sign = residual < 0 ? -1 : 1;
  const q2: Vec2 = [-sign * q1[1], sign * q1[0]];
  const r = {
    a: firstScale * length,
    b: projection * secondScale,
    c: 0,
    d: Math.abs(residual) * secondScale,
  };
  if (![r.a, r.b, r.d].every(Number.isFinite)) {
    throw new RangeError('QR factors exceed the finite number range.');
  }
  return { q: fromColumns(q1, q2), r };
}
