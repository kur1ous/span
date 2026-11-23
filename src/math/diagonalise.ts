import { diag, eigen, fromColumns, IDENTITY, type Mat2 } from './mat2';

export function diagonalise(m: Mat2): { p: Mat2; d: Mat2 } | null {
  const e = eigen(m);
  if (e.kind === 'real') {
    return { p: fromColumns(e.vectors[0], e.vectors[1]), d: diag(e.values[0], e.values[1]) };
  }
  // A scalar matrix already is diagonal, even though its eigenvalue repeats.
  if (e.kind === 'repeated' && !e.defective) {
    return { p: IDENTITY, d: diag(e.value, e.value) };
  }
  return null;
}
