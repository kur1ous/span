import { afterEach, expect, it, vi } from 'vitest';
import { createPlane } from './plane';
import { IDENTITY, diag, svd, type Svd } from './math/mat2';
import { stageMatrix } from './math/stages';

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
