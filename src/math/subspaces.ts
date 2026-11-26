import { inverse, type Mat2, type Vec2 } from './mat2';

export function rank(m: Mat2): 0 | 1 | 2 {
  if (![m.a, m.b, m.c, m.d].every(Number.isFinite)) {
    throw new RangeError('Matrix entries must be finite.');
  }
  if (m.a === 0 && m.b === 0 && m.c === 0 && m.d === 0) return 0;
  return inverse(m) === null ? 1 : 2;
}

export function nullSpace(m: Mat2): Vec2[] {
  const dimension = rank(m);
  if (dimension === 2) return [];
  if (dimension === 0) return [[1, 0], [0, 1]];

  // Scaling before taking the perpendicular keeps huge and tiny rows usable.
  const first = Math.max(Math.abs(m.a), Math.abs(m.b));
  const second = Math.max(Math.abs(m.c), Math.abs(m.d));
  const scale = Math.max(first, second);
  const [r, s] = first >= second ? [m.a / scale, m.b / scale] : [m.c / scale, m.d / scale];
  const length = Math.hypot(r, s);
  const sign = s > 0 || (s === 0 && r < 0) ? 1 : -1;
  return [[sign * s / length || 0, -sign * r / length || 0]];
}
