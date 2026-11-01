import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { diag, type Mat2 } from './math/mat2';
import { detNote, eigenReadout } from './readout';

describe('determinant note', () => {
  it.each([0.0001, 0.0049])('preserves orientation for a small nonzero determinant %s', (area) => {
    expect(detNote(diag(area, 1))).toBe(
      `Areas scale by ${area.toExponential(2)}. Orientation is kept.`,
    );
    expect(detNote(diag(-area, 1))).toBe(
      `Areas scale by ${area.toExponential(2)}. Orientation is flipped: the plane is mirrored.`,
    );
  });

  it('distinguishes collapse to a point from collapse to a line', () => {
    expect(detNote(diag(0, 0))).toBe(
      'Flattened: the plane collapses onto a point and area goes to zero.',
    );
    expect(detNote({ a: 1, b: 2, c: 2, d: 4 })).toBe(
      'Flattened: the plane collapses onto a line and area goes to zero.',
    );
  });

  it('keeps two decimal places when the area rounds to a nonzero value', () => {
    expect(detNote(diag(0.005, 1))).toBe('Areas scale by 0.01. Orientation is kept.');
    expect(detNote(diag(-2, 1))).toBe(
      'Areas scale by 2.00. Orientation is flipped: the plane is mirrored.',
    );
  });
});

describe('eigen readout', () => {
  it('pairs distinct eigenvalues with normalized vectors', () => {
    const info = eigenReadout({ a: 2, b: 1, c: 1, d: 2 });
    expect(info.kind).toBe('Two real');
    expect(info.tex).toContain('\\lambda_1=3.00');
    expect(info.tex).toContain('\\hat v_1=(0.71,\\,0.71)');
    expect(info.tex).toContain('\\lambda_2=1.00');
    expect(info.tex).toContain('\\hat v_2=(0.71,\\,-0.71)');
    expect(info.note).toBe('');
  });

  it('shows one independent vector for a defective repeated root', () => {
    const info = eigenReadout({ a: 1, b: 0, c: 2, d: 1 });
    expect(info.kind).toBe('Repeated');
    expect(info.tex).toContain('\\lambda_1=\\lambda_2=1.00');
    expect(info.tex).toContain('\\hat v_1=(0.00,\\,1.00)');
    expect(info.tex).not.toContain('\\hat v_2');
    expect(info.note).toBe('One independent eigendirection.');
    expect(info.tex).not.toContain('-0.00');
  });

  it.each([0, -2])('shows a basis for the scalar matrix %s I', (value) => {
    const info = eigenReadout(diag(value, value));
    expect(info.kind).toBe('Repeated');
    expect(info.tex).toContain(`\\lambda_1=\\lambda_2=${value.toFixed(2)}`);
    expect(info.tex).toContain('\\hat v_1=(1.00,\\,0.00)');
    expect(info.tex).toContain('\\hat v_2=(0.00,\\,1.00)');
    expect(info.note).toContain('Every direction');
  });

  it('matches the signs of complex eigenvalues and conjugate unit vectors', () => {
    const info = eigenReadout({ a: 1, b: -2, c: 2, d: 3 });
    expect(info.kind).toBe('Complex');
    expect(info.tex).toContain('\\lambda_{\\pm}=2.00\\pm 1.73i');
    expect(info.tex).toContain('|\\lambda_{\\pm}|=2.65');
    expect(info.tex).toContain('\\arg(\\lambda_{\\pm})=\\pm 40.89^\\circ');
    expect(info.tex).toContain(
      '\\hat v_{\\pm}=\\begin{bmatrix}-0.71\\\\0.35\\pm 0.61i\\end{bmatrix}',
    );
    expect(info.note).toContain('no real eigendirections');
  });

  it.each<Mat2>([
    diag(3, -1), diag(0, 0),
    { a: 1, b: 2, c: 0, d: 1 },
    { a: 0, b: -1, c: 1, d: 0 },
    { a: 1, b: -2, c: 2, d: 3 },
  ])('renders valid KaTeX with accessible MathML for %o', (m) => {
    const html = katex.renderToString(eigenReadout(m).tex, { throwOnError: true });
    expect(html).toContain('<math');
    expect(html).not.toContain('katex-error');
  });
});
