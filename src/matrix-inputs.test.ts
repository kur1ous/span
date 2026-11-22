import { expect, it, vi } from 'vitest';
import { bindMatrixInputs } from './matrix-inputs';
import { IDENTITY, type Mat2 } from './math/mat2';

function setup() {
  const field = () => Object.assign(new EventTarget(), { value: '', setAttribute: vi.fn() });
  const inputs = { a: field(), b: field(), c: field(), d: field() };
  const error = { textContent: '' };
  let matrix = IDENTITY;
  const set = vi.fn((m: Mat2) => { matrix = m; editor.update(m); });
  const stop = vi.fn();
  const editor = bindMatrixInputs(inputs as unknown as Record<keyof Mat2, HTMLInputElement>,
    error as HTMLElement, () => matrix, set, stop);
  editor.update(matrix);
  return {
    inputs, error, set, stop, editor, matrix: () => matrix,
    type(key: keyof Mat2, value: string) {
      inputs[key].value = value;
      inputs[key].dispatchEvent(new Event('input'));
    },
    enter(key: keyof Mat2, isComposing = false) {
      inputs[key].dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }),
        { key: 'Enter', isComposing }));
    },
  };
}

it('commits each entry on blur or Enter and preserves the other entries', () => {
  const h = setup();
  for (const [key, text, value] of [
    ['a', ' -1.25 ', -1.25], ['b', '2e-3', 0.002], ['c', '0', 0], ['d', '.5', 0.5],
  ] as const) {
    const previous = h.matrix();
    h.inputs[key].dispatchEvent(new Event('focus'));
    h.type(key, text);
    expect(h.matrix()).toEqual(previous);
    if (key === 'a') h.inputs[key].dispatchEvent(new Event('blur'));
    else h.enter(key);
    expect(h.matrix()).toEqual({ ...previous, [key]: value });
    h.inputs[key].dispatchEvent(new Event('blur'));
  }
  expect(h.set).toHaveBeenCalledTimes(4);
  expect(h.stop).toHaveBeenCalledTimes(8);
});

it.each(['', '   ', 'NaN', 'Infinity', '-Infinity', '1e309', '2oops', '1/2'])(
  'rejects %j inline without changing the matrix and allows correction', (text) => {
    const h = setup();
    h.type('b', text);
    h.enter('b');
    h.inputs.b.dispatchEvent(new Event('blur'));
    expect(h.set).not.toHaveBeenCalled();
    expect(h.error.textContent).toContain('finite number');
    expect(h.inputs.b.setAttribute).toHaveBeenLastCalledWith('aria-invalid', 'true');
    h.type('b', '3');
    h.enter('b');
    expect(h.matrix().b).toBe(3);
    expect(h.error.textContent).toBe('');
    expect(h.inputs.b.setAttribute).toHaveBeenLastCalledWith('aria-invalid', 'false');
  },
);

it('syncs external changes without rounding and discards stale invalid edits', () => {
  const h = setup();
  h.type('a', 'bad');
  h.enter('a');
  const dragged = { a: Math.PI, b: -0.000001, c: 2.7, d: 0 };
  h.set(dragged);
  expect(Object.values(h.inputs).map((input) => input.value)).toEqual(Object.values(dragged).map(String));
  expect(h.error.textContent).toBe('');
  h.inputs.a.dispatchEvent(new Event('focus'));
  expect(h.stop).toHaveBeenCalledOnce();
  h.inputs.a.dispatchEvent(new Event('blur'));
  expect(h.set).toHaveBeenCalledOnce();
  expect(h.matrix()).toEqual(dragged);
});

it('waits until text composition has ended before accepting Enter', () => {
  const h = setup();
  h.type('c', '-2');
  h.enter('c', true);
  expect(h.set).not.toHaveBeenCalled();
  h.enter('c');
  expect(h.matrix().c).toBe(-2);
});
