import katex from 'katex';
import { fmt } from './format';
import { det, diag, eigen, svd, transpose, type Mat2, type Vec2 } from './math/mat2';
import { complexPolar } from './math/orbit';
import { classify } from './math/classify';

// \htmlClass is the only extension we allow, so colours and the mono override
// come from style.css instead of being baked into the TeX
const OPTIONS: katex.KatexOptions = {
  throwOnError: false,
  displayMode: true,
  trust: (ctx) => ctx.command === '\\htmlClass',
};

const cell = (cls: string, n: number) => `\\htmlClass{${cls} num}{${fmt(n)}}`;

function matrixTex(m: Mat2): string {
  return (
    'A=\\begin{bmatrix}' +
    `${cell('col-i', m.a)} & ${cell('col-j', m.b)} \\\\ ` +
    `${cell('col-i', m.c)} & ${cell('col-j', m.d)}` +
    '\\end{bmatrix}'
  );
}

function columnsTex(m: Mat2): string {
  return (
    '\\begin{array}{l}' +
    `\\htmlClass{col-i}{A\\hat{\\imath}=(${cell('col-i', m.a)},\\,${cell('col-i', m.c)})}` +
    '\\\\[2pt]' +
    `\\htmlClass{col-j}{A\\hat{\\jmath}=(${cell('col-j', m.b)},\\,${cell('col-j', m.d)})}` +
    '\\end{array}'
  );
}

function detTex(m: Mat2): string {
  return (
    '\\begin{array}{l}' +
    `\\det A=\\htmlClass{num det-value}{${fmt(det(m))}}\\\\[4pt]` +
    `=ad-bc=(${fmt(m.a)})(${fmt(m.d)})-(${fmt(m.b)})(${fmt(m.c)})` +
    '\\end{array}'
  );
}

export function eigenReadout(m: Mat2): { kind: string; tex: string; note: string } {
  const e = eigen(m);
  const vector = (v: Vec2) => `(${fmt(v[0])},\\,${fmt(v[1])})`;
  let rows: string[];
  let note = '';
  if (e.kind === 'complex') {
    const polar = complexPolar(e)!;
    rows = [
      `\\lambda_{\\pm}=${fmt(e.re)}\\pm ${fmt(e.im)}i`,
      `|\\lambda_{\\pm}|=${fmt(polar.modulus)}`,
      `\\arg(\\lambda_{\\pm})=\\pm ${fmt(polar.angle * 180 / Math.PI)}^\\circ`,
      `\\hat v_{\\pm}=\\begin{bmatrix}${fmt(e.vRe[0])}\\\\` +
        `${fmt(e.vRe[1])}\\pm ${fmt(e.vIm[1])}i\\end{bmatrix}`,
    ];
    note = 'Conjugate unit vectors; no real eigendirections. ' +
      'The angle describes rotation in an eigenvector basis. Connected dots trace Aⁿv, n = 0…12.';
  } else if (e.kind === 'repeated') {
    rows = [`\\lambda_1=\\lambda_2=${fmt(e.value)}`];
    e.vectors.forEach((v, i) => rows.push(`\\hat v_${i + 1}=${vector(v)}`));
    note = e.defective
      ? 'One independent eigendirection.'
      : 'Every direction is an eigendirection; one unit basis is shown.';
  } else {
    rows = e.values.flatMap((value, i) => [
      `\\lambda_${i + 1}=${fmt(value)}`,
      `\\hat v_${i + 1}=${vector(e.vectors[i]!)}`,
    ]);
  }
  return {
    kind: e.kind === 'real' ? 'Two real' : e.kind === 'repeated' ? 'Repeated' : 'Complex',
    tex: `\\begin{array}{l}${rows.join('\\\\[4pt]')}\\end{array}`,
    note,
  };
}

export function svdReadout(m: Mat2): { tex: string; note: string } {
  const { u, s, v } = svd(m);
  const factor = (name: string, matrix: Mat2) =>
    `${name}=\\begin{bmatrix}${fmt(matrix.a)} & ${fmt(matrix.b)}\\\\` +
    `${fmt(matrix.c)} & ${fmt(matrix.d)}\\end{bmatrix}`;
  const rows = [
    'A=U\\Sigma V^{\\mathsf T}',
    factor('U', u),
    factor('\\Sigma', diag(s[0], s[1])),
    factor('V^{\\mathsf T}', transpose(v)),
  ];
  const reflections = [det(u) < 0 ? 'U' : '', det(v) < 0 ? 'V' : ''].filter(Boolean);
  return {
    tex: `\\begin{array}{l}${rows.join('\\\\[4pt]')}\\end{array}`,
    note: reflections.length === 0 ? '' :
      `${reflections.join(' and ')} ${reflections.length === 1 ? 'carries' : 'carry'} a reflection (det = -1).`,
  };
}

export function detNote(m: Mat2): string {
  const d = det(m);
  if (d === 0) {
    const image = m.a === 0 && m.b === 0 && m.c === 0 && m.d === 0 ? 'point' : 'line';
    return `Flattened: the plane collapses onto a ${image} and area goes to zero.`;
  }
  const area = Math.abs(d);
  // A rounded 0.00 must not imply that a small invertible map loses dimension.
  const scale = `Areas scale by ${area < 0.005 ? area.toExponential(2) : fmt(area)}.`;
  return d > 0
    ? `${scale} Orientation is kept.`
    : `${scale} Orientation is flipped: the plane is mirrored.`;
}

export interface Readout {
  update(m: Mat2): void;
}

function div(cls: string): HTMLDivElement {
  const n = document.createElement('div');
  n.className = cls;
  return n;
}

export function createReadout(
  matrixRoot: HTMLElement, detRoot: HTMLElement, eigenRoot: HTMLElement, svdRoot: HTMLElement,
): Readout {
  const matrix = div('tex tex-matrix');
  const classification = document.createElement('p');
  classification.className = 'matrix-kind';
  const cols = div('tex tex-columns');
  matrixRoot.replaceChildren(matrix, classification, cols);

  const detBox = div('tex tex-det');
  const note = document.createElement('p');
  note.className = 'det-note';
  detRoot.replaceChildren(detBox, note);

  const kind = document.createElement('p');
  kind.className = 'eigen-kind';
  const eigenBox = div('tex tex-eigen');
  const eigenNote = document.createElement('p');
  eigenNote.className = 'eigen-note';
  eigenRoot.replaceChildren(kind, eigenBox, eigenNote);

  const svdBox = div('tex tex-svd');
  const svdNote = document.createElement('p');
  svdNote.className = 'svd-note';
  svdRoot.replaceChildren(svdBox, svdNote);

  return {
    update(m) {
      katex.render(matrixTex(m), matrix, OPTIONS);
      classification.textContent = classify(m).join(' · ') || 'general';
      katex.render(columnsTex(m), cols, OPTIONS);
      katex.render(detTex(m), detBox, OPTIONS);
      note.textContent = detNote(m);
      const info = eigenReadout(m);
      kind.textContent = info.kind;
      katex.render(info.tex, eigenBox, OPTIONS);
      eigenNote.textContent = info.note;
      eigenNote.hidden = info.note === '';
      const decomposition = svdReadout(m);
      katex.render(decomposition.tex, svdBox, OPTIONS);
      svdNote.textContent = decomposition.note;
      svdNote.hidden = decomposition.note === '';
    },
  };
}
