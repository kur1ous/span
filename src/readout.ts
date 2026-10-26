import katex from 'katex';
import { fmt } from './format';
import { det, eigen, type Mat2, type Vec2 } from './math/mat2';

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
    rows = [
      `\\lambda_{\\pm}=${fmt(e.re)}\\pm ${fmt(e.im)}i`,
      `\\hat v_{\\pm}=\\begin{bmatrix}${fmt(e.vRe[0])}\\\\` +
        `${fmt(e.vRe[1])}\\pm ${fmt(e.vIm[1])}i\\end{bmatrix}`,
    ];
    note = 'Conjugate unit vectors; no real eigendirections.';
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

/** Below this the plane is visually flat, whatever the sign says. */
const FLAT = 0.005;

function detNote(d: number): string {
  if (Math.abs(d) < FLAT) return 'Flattened: the plane collapses onto a line and area goes to zero.';
  const scale = `Areas scale by ${fmt(Math.abs(d))}.`;
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
  matrixRoot: HTMLElement, detRoot: HTMLElement, eigenRoot: HTMLElement,
): Readout {
  const matrix = div('tex tex-matrix');
  const cols = div('tex tex-columns');
  matrixRoot.replaceChildren(matrix, cols);

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

  return {
    update(m) {
      katex.render(matrixTex(m), matrix, OPTIONS);
      katex.render(columnsTex(m), cols, OPTIONS);
      katex.render(detTex(m), detBox, OPTIONS);
      note.textContent = detNote(det(m));
      const info = eigenReadout(m);
      kind.textContent = info.kind;
      katex.render(info.tex, eigenBox, OPTIONS);
      eigenNote.textContent = info.note;
      eigenNote.hidden = info.note === '';
    },
  };
}
