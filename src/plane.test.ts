import { afterEach, expect, it, vi } from 'vitest';
import { createPlane } from './plane';
import { IDENTITY, diag, mul, svd, type Svd } from './math/mat2';
import { toScreen } from './view';
import { stageMatrix } from './math/stages';
import { modes } from './modes';

class Node {
  attrs: Record<string, string> = {};
  style: Record<string, string> = {};
  children: Node[] = [];
  textContent = '';
  clientWidth = 600;
  clientHeight = 400;
  classList = { toggle: vi.fn() };
  setAttribute(key: string, value: string) { this.attrs[key] = value; }
  appendChild(child: Node) { this.children.push(child); }
  replaceChildren() { this.children = []; }
}

afterEach(() => vi.unstubAllGlobals());

function setup() {
  const nodes: Node[] = [];
  const create = () => { const node = new Node(); nodes.push(node); return node; };
  vi.stubGlobal('document', { createElementNS: create, createElement: create });
  let resize = () => {};
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resize = callback; }
    observe() {}
  });
  const host = new Node();
  const plane = createPlane(host as unknown as HTMLElement);
  const find = (cls: string) => nodes.find((node) => node.attrs.class?.split(' ').includes(cls))!;
  const vectors = nodes.filter((node) => node.attrs.class?.includes('singular-vector '));
  return { host, plane, find, vectors, resize: () => resize() };
}

it('draws the image and kernel of a singular map and updates after resize and rank changes', () => {
  const h = setup();
  h.plane.render(diag(2, 0));
  const check = () => {
    const { width, height } = h.plane.view();
    const o = toScreen(h.plane.view(), [0, 0]).map((n) => n.toFixed(1));
    expect(h.find('column-space-line').attrs.d).toBe(`M0.0 ${o[1]}L${width.toFixed(1)} ${o[1]}`);
    expect(h.find('kernel-line').attrs.d).toBe(`M${o[0]} ${height.toFixed(1)}L${o[0]} 0.0`);
    expect([h.find('kernel-image').attrs.cx, h.find('kernel-image').attrs.cy]).toEqual(o);
    expect(h.find('kernel-line').style.display).toBe('');
  };
  check();
  h.host.clientWidth = 900;
  h.resize();
  check();
  h.plane.render({ a: 0, b: 2, c: 0, d: 2 });
  expect(h.find('column-space-line').attrs.d).toBe('M250.0 400.0L650.0 0.0');
  expect(h.find('kernel-line').attrs.d).toBe('M0.0 200.0L900.0 200.0');
  expect(h.find('subspace-label').textContent).toContain('Rank 1');
  h.plane.render(diag(0, 0));
  expect(h.find('column-space-line').style.display).toBe('none');
  expect(h.find('kernel-line').style.display).toBe('none');
  expect(h.find('kernel-image').style.display).toBe('');
  expect(h.find('subspace-overlay').attrs['aria-label']).toContain('whole plane is the kernel');
  h.plane.render(IDENTITY);
  expect(h.find('kernel-image').style.display).toBe('none');
  expect(h.find('subspace-label').textContent).toContain('Rank 2');
});

it('fades target unit directions above the morph and keeps labels distinct', () => {
  const h = setup();
  const factors: Svd = {
    u: { a: 0, b: 1, c: 1, d: 0 }, s: [3, 2], v: IDENTITY,
  };
  const render = (time: number) => h.plane.render(stageMatrix(factors, time), { factors, time });
  render(0.5);
  expect(h.vectors.map((node) => node.style.opacity)).toEqual(['0.5', '0.5', '0', '0']);
  const circleAtStart = h.find('circle-image').attrs.points;
  render(2.5);
  expect(h.vectors.map((node) => node.style.opacity)).toEqual(['1', '1', '0.5', '0.5']);
  expect(h.find('circle-image').attrs.points).not.toBe(circleAtStart);
  expect(h.find('circle-overlay').children.indexOf(h.find('decomposition-overlay')))
    .toBeGreaterThan(h.find('circle-overlay').children.indexOf(h.find('circle-image')));
  // V is the source basis; U swaps the axes, including the reflection.
  const [v1, v2, u1, u2] = h.vectors.map((node) => node.children[0]!.attrs);
  expect(v1!.y2).toBe(v1!.y1);
  expect(Number(v1!.x2)).toBeGreaterThan(Number(v1!.x1));
  expect(v2!.x2).toBe(v2!.x1);
  expect(Number(v2!.y2)).toBeLessThan(Number(v2!.y1));
  expect(u1).toEqual(v2);
  expect(u2).toEqual(v1);
  expect(h.vectors.map((node) => node.children[2]!.textContent)).toEqual(['v₁', 'v₂', 'u₁', 'u₂']);
  render(0);
  expect(h.vectors.every((node) => node.style.opacity === '0' && node.attrs['aria-hidden'] === 'true')).toBe(true);
});

it.each([diag(4, 0), diag(0, 0)])('keeps unit vectors on collapsed images and restores explore for %o', (matrix) => {
  const h = setup();
  const factors = svd(matrix);
  h.plane.render(matrix, { factors, time: 3 });
  expect(h.vectors.every((node) => node.style.opacity === '1')).toBe(true);
  expect(h.vectors.every((node) => node.children[0]!.style.display === '')).toBe(true);
  expect(h.find('singular-overlay').style.display).toBe('none');
  expect(h.find('vectors').style.display).toBe('none');
  const oldTip = h.vectors[0]!.children[0]!.attrs.x2;
  h.host.clientWidth = 900;
  h.resize();
  expect(h.vectors[0]!.children[0]!.attrs.x2).not.toBe(oldTip);
  expect(h.find('decomposition-overlay').style.display).toBe('');
  h.plane.render(matrix);
  expect(h.find('decomposition-overlay').style.display).toBe('none');
  expect(h.find('singular-overlay').style.display).toBe('');
  expect(h.find('vectors').style.display).toBe('');
});

it('keeps editable A and B tips independent of the composition stage and resize', () => {
  const h = setup();
  const a = { a: 1, b: 2, c: 0, d: 1 };
  const b = { a: 2, b: 0, c: 1, d: 1 };
  h.plane.setComposition(a, b);
  const checkTips = () => {
    const tip = (x: number, y: number) => {
      const p = toScreen(h.plane.view(), [x, y]);
      return `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`;
    };
    expect(h.plane.handles.i).toHaveProperty('attrs.transform', tip(1, 0));
    expect(h.plane.bHandles.i).toHaveProperty('attrs.transform', tip(2, 1));
    expect(h.plane.bHandles.j).toHaveProperty('attrs.tabindex', '0');
  };
  h.plane.render(IDENTITY);
  checkTips();
  const square = h.find('det-region').attrs.points;
  h.plane.render(mul(b, a));
  checkTips();
  expect(h.find('det-region').attrs.points).not.toBe(square);
  h.host.clientWidth = 900;
  h.resize();
  checkTips();
  h.plane.setComposition();
  h.plane.render(a);
  expect(h.find('composition-b').style.display).toBe('none');
  expect(h.plane.bHandles.i).toHaveProperty('attrs.tabindex', '-1');
});

it('compares both final square images throughout composition, edits and resize', () => {
  const h = setup();
  const a = { a: 1, b: 1, c: 0, d: 1 };
  const b = diag(2, 1);
  expect(h.find('composition-order').style.display).toBe('none');
  h.plane.setComposition(a, b);
  const points = (corners: number[][]) => corners.map(([x, y]) =>
    toScreen(h.plane.view(), [x!, y!]).map((v) => v.toFixed(1)).join(',')).join(' ');
  const check = () => {
    expect(h.find('composition-ab').attrs.points).toBe(points([[0, 0], [2, 0], [3, 1], [1, 1]]));
    expect(h.find('composition-ba').attrs.points).toBe(points([[0, 0], [2, 0], [4, 1], [2, 1]]));
  };
  for (const stage of [IDENTITY, a, mul(b, a)]) {
    h.plane.render(stage);
    check();
  }
  h.host.clientWidth = 900;
  h.resize();
  check();
  h.plane.setOverlays({ ...modes[2]!.overlays, unitSquare: false });
  expect(h.find('composition-order').style.visibility).toBe('hidden');
  h.plane.setOverlays(modes[2]!.overlays);
  expect(h.find('composition-order').style.visibility).toBe('');
  h.plane.setComposition(a, IDENTITY);
  expect(h.find('composition-ab').attrs.points).toBe(h.find('composition-ba').attrs.points);
  h.plane.setComposition();
  expect(h.find('composition-order').style.display).toBe('none');
});

it('keeps b fixed while x follows matrix edits, resize and singular recovery', () => {
  const h = setup();
  h.plane.setProbe([1, 2]);
  h.plane.setSolve(true);
  h.plane.setOverlays(modes.find((mode) => mode.id === 'solve')!.overlays);
  h.plane.setProbe([3, 2]);
  const point = h.find('solution-point');
  const check = (x: number, y: number) => {
    const p = toScreen(h.plane.view(), [x, y]);
    expect(point.style.display).toBe('');
    expect([point.attrs.cx, point.attrs.cy]).toEqual(p.map((n) => n.toFixed(1)));
    const b = toScreen(h.plane.view(), [3, 2]);
    expect(h.plane.handles.v).toHaveProperty('attrs.transform',
      `translate(${b[0].toFixed(1)} ${b[1].toFixed(1)})`);
  };
  h.plane.render({ a: 1, b: 1, c: 0, d: 1 });
  check(1, 2);
  h.plane.render(diag(3, 2));
  check(1, 1);
  h.host.clientWidth = 900;
  h.resize();
  check(1, 1);
  h.plane.render(diag(1, 0));
  expect(point.style.display).toBe('none');
  expect(h.find('probe-source').style.display).toBe('none');
  expect(h.host.children[1]!.textContent).toContain('No unique solution');
  expect(h.plane.handles.v).toHaveProperty('attrs.tabindex', '0');
  h.plane.render(IDENTITY);
  check(3, 2);
  h.plane.setProbe([0, 0]);
  expect(point.style.display).toBe('');
  h.plane.setSolve(false);
  expect(h.plane.probe()).toEqual([1, 2]);
  expect(point.style.display).toBe('none');
  expect(h.find('probe-label-source').textContent).toBe('v');
});

it('draws a basis grid while keeping v fixed through basis edits, resize and mode changes', () => {
  const h = setup();
  h.plane.setProbe([3, 2]);
  h.plane.setBasis(true);
  h.plane.setOverlays(modes.find((mode) => mode.id === 'basis')!.overlays);
  const paper = h.find('paper-unit').attrs.d;
  const checkProbe = () => {
    const p = toScreen(h.plane.view(), [3, 2]);
    expect(h.plane.handles.v).toHaveProperty('attrs.transform', `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
    expect(h.plane.handles.v).toHaveProperty('attrs.tabindex', '0');
    expect(h.plane.handles.v).toHaveProperty('attrs.aria-label', expect.not.stringContaining('Av'));
    expect(h.find('probe-image').style.display).toBe('none');
    expect(h.find('orbit-overlay').style.display).toBe('none');
  };
  h.plane.render({ a: 0, b: -1, c: 1, d: 0 });
  checkProbe();
  expect(h.find('vec-label-i').textContent).toBe('p₁');
  expect(h.plane.handles.i).toHaveProperty('attrs.aria-label', expect.stringContaining('Basis vector p1'));
  const grid = h.find('warp').attrs.d;
  h.plane.render({ a: 2, b: 1, c: 1, d: 1 });
  expect(h.find('warp').attrs.d).not.toBe(grid);
  expect(h.find('paper-unit').attrs.d).toBe(paper);
  checkProbe();
  h.plane.render(diag(1, 0));
  checkProbe();
  h.host.clientWidth = 900;
  h.resize();
  checkProbe();
  h.plane.render(IDENTITY);
  checkProbe();
  h.plane.setBasis(false);
  expect(h.find('probe-image').style.display).toBe('');
  expect(h.find('vec-label-i').textContent).toBe('î');
  h.plane.setSolve(true);
  h.plane.setProbe([7, 1]);
  h.plane.setSolve(false);
  h.plane.setBasis(true);
  checkProbe();
});
