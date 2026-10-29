import { describe, expect, it, vi } from 'vitest';
import { bindHandles } from './interact';
import { IDENTITY, type Mat2, type Vec2 } from './math/mat2';
import type { Plane } from './plane';
import { makeView } from './view';

function setup(which: 'i' | 'v' = 'i') {
  const classes = new Set<string>();
  const captures = new Set<number>();
  const handle = Object.assign(new EventTarget(), {
    focus: vi.fn(),
    classList: { add: (s: string) => classes.add(s), remove: (s: string) => classes.delete(s) },
    setPointerCapture: (id: number) => captures.add(id),
    hasPointerCapture: (id: number) => captures.has(id),
    releasePointerCapture: (id: number) => captures.delete(id),
  });
  let probe: Vec2 = [2, 1.5];
  const plane = {
    handles: { i: new EventTarget(), j: new EventTarget(), v: new EventTarget(), [which]: handle },
    probe: () => probe,
    setProbe: (v: Vec2) => { probe = v; },
    svg: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
    view: () => makeView(550, 550),
  } as unknown as Plane;
  let matrix = IDENTITY;
  const set = vi.fn((m: Mat2) => { matrix = m; });
  const grab = vi.fn();
  bindHandles(plane, () => matrix, set, grab);
  const pointer = (type: string, pointerId: number, clientX = 325) => {
    handle.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), {
      pointerId, clientX, clientY: 275, altKey: true,
    }));
  };
  return { pointer, set, grab, classes, captures, handle, probe: () => probe, matrix: () => matrix };
}

describe('probe controls', () => {
  it('drags v with the grab offset without changing the matrix', () => {
    const h = setup('v');
    h.pointer('pointerdown', 1);
    h.pointer('pointermove', 2, 425);
    expect(h.probe()).toEqual([2, 1.5]);
    h.pointer('pointermove', 1, 375);
    expect(h.probe()).toEqual([3, 1.5]);
    h.pointer('pointercancel', 1);
    h.pointer('pointermove', 1, 425);
    expect(h.probe()).toEqual([3, 1.5]);
    expect(h.set).not.toHaveBeenCalled();
  });

  it('nudges v with arrow keys, supports shift and clamps to the frame', () => {
    const h = setup('v');
    const key = (key: string, shiftKey = false) => h.handle.dispatchEvent(
      Object.assign(new Event('keydown', { cancelable: true }), { key, shiftKey }),
    );
    key('ArrowRight');
    key('ArrowUp', true);
    expect(h.probe()).toEqual([2.1, 2.5]);
    for (let i = 0; i < 10; i++) key('ArrowRight', true);
    expect(h.probe()).toEqual([5.1, 2.5]);
    expect(h.matrix()).toEqual(IDENTITY);
    expect(h.set).not.toHaveBeenCalled();
  });
});

describe('handle pointer ownership', () => {
  it('ignores another pointer grabbing or moving the same ring', () => {
    const h = setup();
    h.pointer('pointerdown', 1);
    h.pointer('pointerdown', 2, 335);
    h.pointer('pointermove', 2, 400);
    expect(h.grab).toHaveBeenCalledTimes(1);
    expect(h.captures).toEqual(new Set([1]));
    expect(h.set).not.toHaveBeenCalled();
    h.pointer('pointermove', 1, 375);
    expect(h.matrix()).toEqual({ a: 2, b: 0, c: 0, d: 1 });
  });

  it.each(['pointerup', 'pointercancel', 'lostpointercapture'])(
    '%s from another pointer cannot end the active drag', (event) => {
      const h = setup();
      h.pointer('pointerdown', 1);
      h.pointer(event, 2);
      expect(h.classes.has('is-dragging')).toBe(true);
      h.pointer('pointermove', 1, 375);
      expect(h.matrix().a).toBe(2);
    },
  );

  it.each(['pointerup', 'pointercancel', 'lostpointercapture'])(
    '%s ends the owning drag and allows a new pointer to grab', (event) => {
      const h = setup();
      h.pointer('pointerdown', 1);
      if (event === 'lostpointercapture') h.captures.delete(1);
      h.pointer(event, 1);
      expect(h.classes.has('is-dragging')).toBe(false);
      expect(h.captures.size).toBe(0);
      h.pointer('pointermove', 1, 375);
      expect(h.set).not.toHaveBeenCalled();
      h.pointer('pointerdown', 2);
      h.pointer('pointermove', 2, 375);
      expect(h.matrix().a).toBe(2);
    },
  );
});
