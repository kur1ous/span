/*
  The plane is drawn as SVG rather than canvas.

  A 2x2 transform maps straight lines to straight lines, so the warped grid is
  just ~50 segments and never needs sampling. What SVG buys in return is crisp
  strokes at any pixel ratio, CSS-token styling (colours live in style.css and
  are picked up by class), and real DOM nodes for the draggable vectors, which
  gives focus, arrow-key handling and screen-reader labels for free.
*/

import { columns, type Mat2, type Vec2 } from './math/mat2';
import type { Which } from './edit';
import { fmt } from './format';
import { arrowGeometry, orientationArc, paperGrid, transformedGrid } from './geometry';
import { centroid, polygonArea, unitSquareImage } from './region';
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

const SQUARE: readonly Vec2[] = [[0, 0], [1, 0], [1, 1], [0, 1]];

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

  // section hatching for the flipped (negative) region
  const defs = el('defs', undefined, svg);
  const hatch = el('pattern', undefined, defs, {
    id: 'det-hatch',
    width: '7',
    height: '7',
    patternUnits: 'userSpaceOnUse',
    patternTransform: 'rotate(45)',
  });
  el('rect', 'hatch-ground', hatch, { width: '7', height: '7' });
  el('line', 'hatch-line', hatch, { x1: '0', y1: '0', x2: '0', y2: '7' });

  const unitSquare = el('polygon', 'unit-square', svg);
  const detRegion = el('polygon', 'det-region', svg);
  const warp = el('path', 'warp', svg);
  const warpAxes = el('path', 'warp-axes', svg);
  const arc = el('path', 'orient-arc', svg);
  const arcHead = el('polygon', 'orient-head', svg);
  const detLabel = el('text', 'det-label', svg);

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
    const { fine, unit, axes } = paperGrid(view);
    paperFine.setAttribute('d', segments(fine));
    paperUnit.setAttribute('d', segments(unit));
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
    const arrow = arrowGeometry(o, tip);
    shaft.style.display = head.style.display = label.style.display = arrow ? '' : 'none';
    if (!arrow) return;
    shaft.setAttribute('x1', f(o[0]));
    shaft.setAttribute('y1', f(o[1]));
    shaft.setAttribute('x2', f(arrow.shaftEnd[0]));
    shaft.setAttribute('y2', f(arrow.shaftEnd[1]));
    head.setAttribute('points', pts(arrow.head));
    label.setAttribute('x', f(arrow.label[0]));
    label.setAttribute('y', f(arrow.label[1]));
  }

  function draw() {
    const m = current;
    const { lines, axes } = transformedGrid(m, view);
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

    drawDeterminant(m, ti, tj);
  }

  const pts = (list: readonly Vec2[]) => list.map((p) => `${f(p[0])},${f(p[1])}`).join(' ');

  function drawDeterminant(m: Mat2, ti: Vec2, tj: Vec2) {
    const corners = unitSquareImage(m);
    const area = polygonArea(corners);
    const screen = corners.map((p) => toScreen(view, p));

    // the plain unit square stays behind as the thing being compared against
    unitSquare.setAttribute('points', pts(SQUARE.map((p) => toScreen(view, p))));
    detRegion.setAttribute('points', pts(screen));
    detRegion.classList.toggle('is-negative', area < 0);

    const orientation = orientationArc(view, ti, tj, area);
    arc.style.display = arcHead.style.display = orientation ? '' : 'none';
    if (orientation) {
      const { start: p1, end: p2, radius: r, sweep } = orientation;
      arc.setAttribute('d', `M${f(p1[0])} ${f(p1[1])}A${f(r)} ${f(r)} 0 0 ${sweep} ${f(p2[0])} ${f(p2[1])}`);
      arcHead.setAttribute('points', pts(orientation.head));
    }

    // the label only appears when the region is big enough to hold it
    const c = toScreen(view, centroid(corners));
    const roomy = Math.abs(area) * view.scale * view.scale > 1600;
    detLabel.style.display = roomy ? '' : 'none';
    if (roomy) {
      detLabel.textContent = fmt(area);
      detLabel.setAttribute('x', f(c[0]));
      detLabel.setAttribute('y', f(c[1] + 4.5));
    }
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
