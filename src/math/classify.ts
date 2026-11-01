import { type Mat2 } from './mat2';

export type MatrixKind =
  | 'identity' | 'rotation' | 'reflection' | 'shear'
  | 'projection' | 'scaling' | 'symmetric' | 'singular';

const EPS = 1e-10;
const near = (x: number, y: number) => Math.abs(x - y) <= EPS;

function singular(m: Mat2): boolean {
  // Scale columns separately: tiny or anisotropic scalings remain invertible,
  // and determinant products cannot overflow or underflow together.
  const i = Math.max(Math.abs(m.a), Math.abs(m.c));
  const j = Math.max(Math.abs(m.b), Math.abs(m.d));
  if (i === 0 || j === 0) return true;
  const ad = (m.a / i) * (m.d / j);
  const bc = (m.b / j) * (m.c / i);
  return Math.abs(ad - bc) <= EPS * Math.max(Math.abs(ad), Math.abs(bc));
}

// Labels overlap, except identity stands alone. Scaling is diagonal (signed);
// projections may be oblique, and shears may have any invariant line.
export function classify(m: Mat2): MatrixKind[] {
  const { a, b, c, d } = m;
  if (![a, b, c, d].every(Number.isFinite)) {
    throw new RangeError('Matrix entries must be finite.');
  }
  if (near(a, 1) && near(b, 0) && near(c, 0) && near(d, 1)) return ['identity'];

  const labels: MatrixKind[] = [];
  const scale = Math.max(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d));
  const isSingular = singular(m);
  const orthogonal = near(Math.hypot(a, c), 1) && near(Math.hypot(b, d), 1)
    && near(a * b + c * d, 0);
  if (orthogonal) labels.push(a * d - b * c > 0 ? 'rotation' : 'reflection');
  // In two dimensions, these are equivalent to (A-I)^2=0 and A^2=A.
  if (near(a + d, 2) && singular({ a: a - 1, b, c, d: d - 1 })) labels.push('shear');
  if (scale === 0 || (isSingular && near(a + d, 1))) labels.push('projection');
  if (scale === 0 || (Math.abs(b / scale) <= EPS && Math.abs(c / scale) <= EPS)) {
    labels.push('scaling');
  }
  if (scale === 0 || Math.abs(b / scale - c / scale) <= EPS) labels.push('symmetric');
  if (isSingular) labels.push('singular');
  return labels;
}
