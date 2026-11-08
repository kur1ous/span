import { IDENTITY, det, diag, mul, rotation, transpose, type Mat2, type Svd } from './mat2';

// Uses svd()'s convention: V is a rotation, and any reflection lives in U.
export function stageMatrix({ u, s, v }: Svd, t: number): Mat2 {
  if (!Number.isFinite(t) || t < 0 || t > 3) {
    throw new RangeError('stage time must be between 0 and 3');
  }
  if (t === 0) return IDENTITY;

  const vt = transpose(v);
  if (t < 1) return rotation(Math.atan2(vt.c, vt.a) * t);
  if (t === 1) return vt;
  if (t < 2) {
    const progress = t - 1;
    return mul(diag(1 + (s[0] - 1) * progress, 1 + (s[1] - 1) * progress), vt);
  }

  const scaled = mul(diag(s[0], s[1]), vt);
  if (t === 2) return scaled;
  if (t === 3) return mul(u, scaled);

  const progress = t - 2;
  // A continuous reflection must pass through a collapsed axis.
  const flip = det(u) < 0 ? 1 - 2 * progress : 1;
  const turn = rotation(Math.atan2(u.c, u.a) * progress);
  return mul(mul(turn, diag(1, flip)), scaled);
}
