import katex from 'katex';
import type { Mat2 } from './math/mat2';

/** Fixed two decimals, and never "-0.00". */
export function fmt(n: number): string {
  const s = n.toFixed(2);
  return s === '-0.00' ? '0.00' : s;
}

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
    `\\htmlClass{col-i}{A\\hat{\\imath}=(${cell('col-i', m.a)},\\,${cell('col-i', m.c)})}` +
    '\\\\[2pt]' +
    `\\htmlClass{col-j}{A\\hat{\\jmath}=(${cell('col-j', m.b)},\\,${cell('col-j', m.d)})}`
  );
}

export interface Readout {
  update(m: Mat2): void;
}

export function createReadout(root: HTMLElement): Readout {
  const matrix = document.createElement('div');
  matrix.className = 'tex tex-matrix';
  const cols = document.createElement('div');
  cols.className = 'tex tex-columns';
  root.replaceChildren(matrix, cols);

  return {
    update(m) {
      katex.render(matrixTex(m), matrix, OPTIONS);
      katex.render(`\\begin{array}{l}${columnsTex(m)}\\end{array}`, cols, OPTIONS);
    },
  };
}
