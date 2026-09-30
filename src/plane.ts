/*
  The plane is drawn as SVG rather than canvas.

  A 2x2 transform maps straight lines to straight lines, so the warped grid is
  just ~50 segments and never needs sampling. What SVG buys in return is crisp
  strokes at any pixel ratio, CSS-token styling (colours live in style.css and
  are picked up by class), and real DOM nodes for the draggable vectors, which
  gives focus, arrow-key handling and screen-reader labels for free.
*/

import { apply, columns, type Mat2, type Vec2 } from './math/mat2';
import type { Which } from './edit';
import { gridStops, sourceExtent } from './grid';
import { makeView, toScreen, worldBounds, type View } from './view';

const NS = 'http://www.w3.org/2000/svg';

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  cls?: string,
  parent?: Element,
  attrs: Record<string, string> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  if (cls) node.setAttribute('class', cls);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent?.appendChild(node);
  return node;
}

const f = (n: number) => n.toFixed(1);

function handleLabel(which: Which, v: Vec2): string {
  const name = which === 'i' ? 'i-hat' : 'j-hat';
  return `Image of ${name}, at ${v[0].toFixed(2)}, ${v[1].toFixed(2)}. Arrow keys move it, shift for larger steps.`;
}

function segments(list: readonly (readonly [Vec2, Vec2])[]): string {
  return list.map(([p, q]) => `M${f(p[0])} ${f(p[1])}L${f(q[0])} ${f(q[1])}`).join('');
}

export interface Plane {
  readonly svg: SVGSVGElement;
  /** focusable grab rings sitting on the tip of each image vector */
  readonly handles: Readonly<Record<Which, SVGGElement>>;
  view(): View;
  render(m: Mat2): void;
}

function makeHandle(which: Which, parent: Element): SVGGElement {
  const g = el('g', `handle handle-${which}`, parent, { tabindex: '0', role: 'application' });
  // the hit disc is invisible but wide, so fingers and shaky mice can still grab
  el('circle', 'hit', g, { r: '24' });
  el('circle', 'ring', g, { r: '11' });
  el('circle', 'focus-ring', g, { r: '18' });
  return g;
}

export function createPlane(host: HTMLElement): Plane {
  const svg = el('svg', 'plane', host, { role: 'group', 'aria-label': 'Plane with the transformed grid' });

  const paperFine = el('path', 'paper-fine', svg);
  const paperUnit = el('path', 'paper-unit', svg);
  const paperAxes = el('path', 'paper-axes', svg);
  const ticks = el('g', 'ticks', svg);
  const warp = el('path', 'warp', svg);
  const warpAxes = el('path', 'warp-axes', svg);

  const vecs = el('g', 'vectors', svg);
  const shaftI = el('line', 'shaft shaft-i', vecs);
  const shaftJ = el('line', 'shaft shaft-j', vecs);
  const headI = el('polygon', 'head head-i', vecs);
  const headJ = el('polygon', 'head head-j', vecs);
  const labelI = el('text', 'vec-label vec-label-i', vecs);
  const labelJ = el('text', 'vec-label vec-label-j', vecs);
  labelI.textContent = 'î';
  labelJ.textContent = 'ĵ';
  const origin = el('circle', 'origin', vecs, { r: '3.5' });

  const handles = { i: makeHandle('i', svg), j: makeHandle('j', svg) };

  let view = makeView(host.clientWidth || 1, host.clientHeight || 1);
  let current: Mat2 = { a: 1, b: 0, c: 0, d: 1 };

  /** Everything that depends only on the frame size: the static paper. */
  function drawPaper() {
    const b = worldBounds(view);
    const x0 = Math.ceil(b.min[0] * 4) / 4;
    const y0 = Math.ceil(b.min[1] * 4) / 4;

    const fine: [Vec2, Vec2][] = [];
    const unit: [Vec2, Vec2][] = [];
    const vertical = (x: number, into: [Vec2, Vec2][]) =>
      into.push([toScreen(view, [x, b.min[1]]), toScreen(view, [x, b.max[1]])]);
    const horizontal = (y: number, into: [Vec2, Vec2][]) =>
      into.push([toScreen(view, [b.min[0], y]), toScreen(view, [b.max[0], y])]);

    // quarter-unit rules are only useful once a unit is wide enough to subdivide
    if (view.scale >= 36) {
      for (let x = x0; x <= b.max[0]; x += 0.25) if (!Number.isInteger(x)) vertical(x, fine);
      for (let y = y0; y <= b.max[1]; y += 0.25) if (!Number.isInteger(y)) horizontal(y, fine);
    }
    for (let x = Math.ceil(b.min[0]); x <= b.max[0]; x++) if (x !== 0) vertical(x, unit);
    for (let y = Math.ceil(b.min[1]); y <= b.max[1]; y++) if (y !== 0) horizontal(y, unit);

    paperFine.setAttribute('d', segments(fine));
    paperUnit.setAttribute('d', segments(unit));

    const axes: [Vec2, Vec2][] = [];
    vertical(0, axes);
    horizontal(0, axes);
    paperAxes.setAttribute('d', segments(axes));

    ticks.replaceChildren();
    const every = view.scale < 30 ? 2 : 1;
    const at0 = toScreen(view, [0, 0]);
    const zero = el('text', 'tick', ticks, { x: f(at0[0] - 8), y: f(at0[1] + 15), 'text-anchor': 'end' });
    zero.textContent = '0';
    for (let n = Math.ceil(b.min[0]); n <= b.max[0]; n++) {
      if (n === 0 || n % every) continue;
      const p = toScreen(view, [n, 0]);
      const t = el('text', 'tick', ticks, { x: f(p[0]), y: f(p[1] + 15), 'text-anchor': 'middle' });
      t.textContent = String(n);
    }
    for (let n = Math.ceil(b.min[1]); n <= b.max[1]; n++) {
      if (n === 0 || n % every) continue;
      const p = toScreen(view, [0, n]);
      const t = el('text', 'tick', ticks, { x: f(p[0] - 8), y: f(p[1] + 3.5), 'text-anchor': 'end' });
      t.textContent = String(n);
    }
  }

  function drawArrow(shaft: SVGLineElement, head: SVGPolygonElement, label: SVGTextElement, tip: Vec2) {
    const o = toScreen(view, [0, 0]);
    const dx = tip[0] - o[0];
    const dy = tip[1] - o[1];
    const len = Math.hypot(dx, dy);
    const hidden = len < 2;
    shaft.style.display = head.style.display = label.style.display = hidden ? 'none' : '';
    if (hidden) return;
    const ux = dx / len;
    const uy = dy / len;
    const hl = Math.min(15, len * 0.55);
    const hw = hl * 0.42;
    const bx = tip[0] - ux * hl;
    const by = tip[1] - uy * hl;
    shaft.setAttribute('x1', f(o[0]));
    shaft.setAttribute('y1', f(o[1]));
    shaft.setAttribute('x2', f(bx + ux));
    shaft.setAttribute('y2', f(by + uy));
    head.setAttribute(
      'points',
      `${f(tip[0])},${f(tip[1])} ${f(bx - uy * hw)},${f(by + ux * hw)} ${f(bx + uy * hw)},${f(by - ux * hw)}`,
    );
    label.setAttribute('x', f(tip[0] + ux * 16 - uy * 10));
    label.setAttribute('y', f(tip[1] + uy * 16 + ux * 10 + 5));
  }

  function draw() {
    const m = current;
    const b = worldBounds(view);
    const ext = sourceExtent(m, b);
    const image = (p: Vec2) => toScreen(view, apply(m, p));

    const lines: [Vec2, Vec2][] = [];
    const axes: [Vec2, Vec2][] = [];
    for (const x of gridStops(ext.min[0], ext.max[0])) {
      const seg: [Vec2, Vec2] = [image([x, ext.min[1] - 1]), image([x, ext.max[1] + 1])];
      (x === 0 ? axes : lines).push(seg);
    }
    for (const y of gridStops(ext.min[1], ext.max[1])) {
      const seg: [Vec2, Vec2] = [image([ext.min[0] - 1, y]), image([ext.max[0] + 1, y])];
      (y === 0 ? axes : lines).push(seg);
    }
    warp.setAttribute('d', segments(lines));
    warpAxes.setAttribute('d', segments(axes));

    const o = toScreen(view, [0, 0]);
    origin.setAttribute('cx', f(o[0]));
    origin.setAttribute('cy', f(o[1]));

    const [ci, cj] = columns(m);
    const ti = toScreen(view, ci);
    const tj = toScreen(view, cj);
    drawArrow(shaftI, headI, labelI, ti);
    drawArrow(shaftJ, headJ, labelJ, tj);
    handles.i.setAttribute('transform', `translate(${f(ti[0])} ${f(ti[1])})`);
    handles.j.setAttribute('transform', `translate(${f(tj[0])} ${f(tj[1])})`);
    handles.i.setAttribute('aria-label', handleLabel('i', ci));
    handles.j.setAttribute('aria-label', handleLabel('j', cj));
  }

  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w < 2 || h < 2) return;
    view = makeView(w, h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    drawPaper();
    draw();
  }

  new ResizeObserver(resize).observe(host);
  resize();

  return {
    svg,
    handles,
    view: () => view,
    render(m) {
      current = m;
      draw();
    },
  };
}
