/*
  2x2 linear algebra, written out by hand.

  A matrix is stored row-major as { a, b, c, d } meaning

      [ a  b ]
      [ c  d ]

  so its columns, the images of the basis vectors, are (a, c) and (b, d).
*/

export type Vec2 = readonly [number, number];

export interface Mat2 {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

/** Relative tolerance for "is this zero / are these equal" decisions. */
const EPS = 1e-12;

export const IDENTITY: Mat2 = { a: 1, b: 0, c: 0, d: 1 };

export function fromColumns(i: Vec2, j: Vec2): Mat2 {
  return { a: i[0], b: j[0], c: i[1], d: j[1] };
}

export function columns(m: Mat2): [Vec2, Vec2] {
  return [
    [m.a, m.c],
    [m.b, m.d],
  ];
}

export function rotation(theta: number): Mat2 {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return { a: c, b: -s, c: s, d: c };
}

export function diag(x: number, y: number): Mat2 {
  return { a: x, b: 0, c: 0, d: y };
}

export function apply(m: Mat2, v: Vec2): Vec2 {
  return [m.a * v[0] + m.b * v[1], m.c * v[0] + m.d * v[1]];
}

export function mul(p: Mat2, q: Mat2): Mat2 {
  return {
    a: p.a * q.a + p.b * q.c,
    b: p.a * q.b + p.b * q.d,
    c: p.c * q.a + p.d * q.c,
    d: p.c * q.b + p.d * q.d,
  };
}

export function transpose(m: Mat2): Mat2 {
  return { a: m.a, b: m.c, c: m.b, d: m.d };
}

export function det(m: Mat2): number {
  return m.a * m.d - m.b * m.c;
}

export function trace(m: Mat2): number {
  return m.a + m.d;
}

/** Inverse, or null when the matrix is singular to working precision. */
export function inverse(m: Mat2): Mat2 | null {
  const dt = det(m);
  // compare against the size of the entries so scaling a matrix does not
  // change whether it counts as singular
  const scale = Math.max(Math.abs(m.a * m.d), Math.abs(m.b * m.c));
  if (Math.abs(dt) <= EPS * scale || dt === 0) return null;
  return { a: m.d / dt, b: -m.b / dt, c: -m.c / dt, d: m.a / dt };
}

export function norm(v: Vec2): number {
  return Math.hypot(v[0], v[1]);
}

// Eigen decomposition ---------------------------------------------------

export type Eigen =
  | {
      kind: 'real';
      /** λ1 > λ2 */
      values: readonly [number, number];
      /** unit vectors, sign-fixed so the first nonzero component is positive */
      vectors: readonly [Vec2, Vec2];
    }
  | {
      kind: 'repeated';
      value: number;
      /** true when the eigenspace is a single line (shear-like) */
      defective: boolean;
      /** one vector when defective, an orthonormal pair when A = λI */
      vectors: readonly Vec2[];
    }
  | {
      kind: 'complex';
      /** λ = re ± i·im, with im > 0 */
      re: number;
      im: number;
      /** eigenvector for re + i·im: v = vRe + i·vIm, unit length */
      vRe: Vec2;
      vIm: Vec2;
    };

function canonicalSign(v: Vec2): Vec2 {
  const n = norm(v);
  const x = v[0] / n;
  const y = v[1] / n;
  return x > 1e-12 || (Math.abs(x) <= 1e-12 && y > 0) ? [x, y] : [-x, -y];
}

/**
 * A nonzero vector in the kernel of A − λI, taken from whichever row of that
 * matrix is larger; a row (r, s) has kernel direction (s, −r).
 */
function kernelDirection(m: Mat2, lambda: number): Vec2 | null {
  const r1: Vec2 = [m.a - lambda, m.b];
  const r2: Vec2 = [m.c, m.d - lambda];
  const row = norm(r1) >= norm(r2) ? r1 : r2;
  if (norm(row) === 0) return null;
  return canonicalSign([row[1], -row[0]]);
}

/**
 * Eigenvalues are the roots of λ² − tr·λ + det = 0. Writing m = tr/2, the
 * roots are m ± √(m² − det), so the sign of m² − det decides everything:
 * positive gives two real lines, zero a repeated root, negative a rotation.
 */
export function eigen(m: Mat2): Eigen {
  const mean = trace(m) / 2;
  const dt = det(m);
  const disc = mean * mean - dt;
  const tol = EPS * Math.max(1, mean * mean, Math.abs(dt), Math.abs(m.b * m.c));

  if (disc > tol) {
    const root = Math.sqrt(disc);
    const l1 = mean + root;
    const l2 = mean - root;
    // distinct roots guarantee both kernels are one-dimensional
    const v1 = kernelDirection(m, l1) as Vec2;
    const v2 = kernelDirection(m, l2) as Vec2;
    return { kind: 'real', values: [l1, l2], vectors: [v1, v2] };
  }

  if (disc >= -tol) {
    const v = kernelDirection(m, mean);
    if (v === null) {
      // A − mI is the zero matrix: A = mI and every direction is an eigenvector
      return { kind: 'repeated', value: mean, defective: false, vectors: [[1, 0], [0, 1]] };
    }
    return { kind: 'repeated', value: mean, defective: true, vectors: [v] };
  }

  // Complex pair. Row one of A − λI gives (b, λ − a) as an eigenvector, and
  // b cannot be zero here because disc < 0 forces b·c < 0.
  const im = Math.sqrt(-disc);
  const re = mean;
  const x = m.b;
  const yRe = re - m.a;
  const yIm = im;
  const n = Math.hypot(x, yRe, yIm);
  return { kind: 'complex', re, im, vRe: [x / n, yRe / n], vIm: [0, yIm / n] };
}

// Singular value decomposition -----------------------------------------

export interface Svd {
  /** orthogonal; may include a reflection when det(A) < 0 */
  readonly u: Mat2;
  /** σ1 ≥ σ2 ≥ 0 */
  readonly s: readonly [number, number];
  /** orthogonal; A = U · diag(s) · Vᵀ */
  readonly v: Mat2;
}

/**
 * Split A into a rotation-and-scale part and a reflection-and-scale part:
 *
 *   A = [ e −h ]   [ f  g ]      e = (a+d)/2   h = (c−b)/2
 *       [ h  e ] + [ g −f ]      f = (a−d)/2   g = (c+b)/2
 *
 * The first is a spiral of size q = |(e, h)|, the second a flip of size
 * r = |(f, g)|. Their sizes add and subtract to give the singular values,
 * and their angles give the two rotations, so no iteration is needed.
 */
export function svd(m: Mat2): Svd {
  const e = (m.a + m.d) / 2;
  const f = (m.a - m.d) / 2;
  const g = (m.c + m.b) / 2;
  const h = (m.c - m.b) / 2;
  const q = Math.hypot(e, h);
  const r = Math.hypot(f, g);

  const sx = q + r;
  const sy = q - r; // negative exactly when det(A) < 0
  const angSum = Math.atan2(g, f);
  const angDiff = Math.atan2(h, e);
  const theta = (angDiff - angSum) / 2;
  const phi = (angDiff + angSum) / 2;

  // A = R(phi) · diag(sx, sy) · R(theta). A negative sy is folded into U as
  // a reflection so that both singular values come out non-negative.
  const flip = sy < 0 ? -1 : 1;
  const u = mul(rotation(phi), diag(1, flip));
  const v = transpose(rotation(theta));
  return { u, s: [sx, Math.abs(sy)], v };
}
