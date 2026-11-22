import katex from 'katex';
import { expect, it, vi } from 'vitest';
import { tweenMatrix } from './anim';
import { bindInverse } from './inverse';
import { IDENTITY, type Mat2 } from './math/mat2';

vi.mock('./anim', () => ({ tweenMatrix: vi.fn() }));
vi.mock('katex', () => ({ default: { render: vi.fn() } }));
const a = { a: 2, b: 1, c: 0, d: 1 };

function setup(matrix: Mat2 = a) {
  const button = Object.assign(new EventTarget(), { disabled: false });
  const readout = { replaceChildren: vi.fn() };
  const caption = { textContent: '' };
  const render = vi.fn(), beforeStart = vi.fn(), cancel = vi.fn();
  vi.mocked(tweenMatrix).mockReset().mockReturnValue(cancel);
  vi.mocked(katex.render).mockClear();
  const controller = bindInverse(button as unknown as HTMLButtonElement,
    readout as unknown as HTMLElement, caption as HTMLElement, render, beforeStart);
  controller.reset(matrix);
  return { button, readout, caption, render, beforeStart, cancel, controller,
    click: () => button.dispatchEvent(new Event('click')) };
}

it('shows the inverse and animates its action on A, preserving A for replay', () => {
  const h = setup();
  expect(katex.render).toHaveBeenLastCalledWith(
    'A^{-1}=\\begin{bmatrix}0.50 & -0.50\\\\0.00 & 1.00\\end{bmatrix}',
    h.readout, { displayMode: true });
  expect(h.render).toHaveBeenLastCalledWith(a);
  h.click(); h.click();
  expect(h.beforeStart).toHaveBeenCalledOnce();
  expect(tweenMatrix).toHaveBeenCalledExactlyOnceWith(a, IDENTITY, 560, expect.any(Function));
  const frame = vi.mocked(tweenMatrix).mock.lastCall![3];
  frame({ a: 1.5, b: 0.5, c: 0, d: 1 });
  expect(h.button.disabled).toBe(true);
  frame(IDENTITY);
  expect(h.render).toHaveBeenLastCalledWith(IDENTITY);
  expect(h.caption.textContent).toContain('A⁻¹A = I');
  expect(h.button.disabled).toBe(false);
  h.click();
  expect(tweenMatrix).toHaveBeenLastCalledWith(a, IDENTITY, 560, expect.any(Function));
});

it.each([0, 1e-13])('disables the inverse for a singular or nearly singular matrix (%s)', (delta) => {
  const h = setup({ a: 1, b: 1, c: 1, d: 1 + delta });
  expect(h.button.disabled).toBe(true);
  expect(h.caption.textContent).toContain('Not invertible');
  expect(h.readout.replaceChildren).toHaveBeenCalledOnce();
  h.click();
  expect(tweenMatrix).not.toHaveBeenCalled();
  h.controller.reset(a);
  expect(h.button.disabled).toBe(false);
});

it('cancels on edits and mode exit, then resets the demonstration on return', () => {
  const h = setup();
  h.click();
  h.controller.reset(IDENTITY);
  expect(h.cancel).toHaveBeenCalledOnce();
  expect(h.render).toHaveBeenLastCalledWith(IDENTITY);
  expect(h.button.disabled).toBe(false);
  h.click();
  h.controller.pause();
  expect(h.cancel).toHaveBeenCalledTimes(2);
  h.controller.reset(a);
  expect(h.render).toHaveBeenLastCalledWith(a);
  expect(h.button.disabled).toBe(false);
});

it('finishes immediately when the tween honors reduced motion', () => {
  const h = setup();
  vi.mocked(tweenMatrix).mockImplementationOnce((_from, to, _ms, frame) => {
    frame(to);
    return h.cancel;
  });
  h.click();
  expect(h.render).toHaveBeenLastCalledWith(IDENTITY);
  expect(h.button.disabled).toBe(false);
});
