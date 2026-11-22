import { expect, it, vi } from 'vitest';
import { tweenMatrix } from './anim';
import { bindComposition } from './composition';
import { IDENTITY, type Mat2 } from './math/mat2';

vi.mock('./anim', () => ({ tweenMatrix: vi.fn() }));

const a = { a: 1, b: 2, c: 0, d: 1 };
const b = { a: 2, b: 0, c: 0, d: 3 };

function setup() {
  const back = Object.assign(new EventTarget(), { disabled: false });
  const next = Object.assign(new EventTarget(), { disabled: false });
  const caption = { textContent: '' };
  const render = vi.fn();
  const cancel = vi.fn();
  vi.mocked(tweenMatrix).mockReset().mockReturnValue(cancel);
  const controller = bindComposition(back as unknown as HTMLButtonElement,
    next as unknown as HTMLButtonElement, caption as HTMLElement, render);
  controller.reset(a, b);
  return {
    back, next, caption, render, controller, cancel,
    step: (button = next) => button.dispatchEvent(new Event('click')),
    frame(matrix?: Mat2) {
      const call = vi.mocked(tweenMatrix).mock.lastCall!;
      call[3](matrix ?? call[1]);
    },
  };
}

it('steps through I, A, BA and back with immediate boundary controls', () => {
  const h = setup();
  expect(h.render).toHaveBeenLastCalledWith(IDENTITY);
  expect(h.back.disabled).toBe(true);
  h.step(h.back);
  expect(tweenMatrix).not.toHaveBeenCalled();
  h.step();
  expect(tweenMatrix).toHaveBeenLastCalledWith(IDENTITY, a, 560, expect.any(Function));
  expect(h.caption.textContent).toBe('A applied');
  expect(h.back.disabled).toBe(false);
  h.frame();
  h.step();
  const ba = { a: 2, b: 4, c: 0, d: 3 };
  expect(tweenMatrix).toHaveBeenLastCalledWith(a, ba, 560, expect.any(Function));
  expect(h.caption.textContent).toBe('B after A = BA');
  expect(h.next.disabled).toBe(true);
  h.step();
  expect(tweenMatrix).toHaveBeenCalledTimes(2);
  h.frame();
  h.step(h.back);
  expect(tweenMatrix).toHaveBeenLastCalledWith(ba, a, 560, expect.any(Function));
  expect(h.next.disabled).toBe(false);
  h.frame();
  h.step(h.back);
  expect(tweenMatrix).toHaveBeenLastCalledWith(a, IDENTITY, 560, expect.any(Function));
  expect(h.caption.textContent).toBe('Unit plane');
});

it('cancels interrupted steps, pauses and resets with replacement factors', () => {
  const h = setup();
  h.step();
  const partial = { a: 1, b: 1, c: 0, d: 1 };
  h.frame(partial);
  h.step(h.back);
  expect(h.cancel).toHaveBeenCalledOnce();
  expect(tweenMatrix).toHaveBeenLastCalledWith(partial, IDENTITY, 560, expect.any(Function));
  h.controller.pause();
  expect(h.cancel).toHaveBeenCalledTimes(2);
  h.step();
  h.controller.reset(b, a);
  expect(h.cancel).toHaveBeenCalledTimes(3);
  expect(h.render).toHaveBeenLastCalledWith(IDENTITY);
  expect(h.caption.textContent).toBe('Unit plane');
  expect(h.back.disabled).toBe(true);
  expect(h.next.disabled).toBe(false);
  h.step(); h.frame(); h.step();
  expect(tweenMatrix).toHaveBeenLastCalledWith(b,
    { a: 2, b: 6, c: 0, d: 3 }, 560, expect.any(Function));
});
