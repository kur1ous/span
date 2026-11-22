import { afterEach, expect, it, vi } from 'vitest';
import { bindUrlState, decodeState, encodeState, type UrlState } from './url-state';

const state: UrlState = { matrix: { a: 1.5, b: -0.5, c: 0.5, d: 1 }, mode: 'decompose' };

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it.each(['explore', 'decompose', 'compose', 'inverse'] as const)('round trips matrix entries and %s mode', (mode) => {
  const original = { matrix: { a: Math.PI, b: -1e-10, c: 1e21, d: 0 }, mode };
  expect(decodeState(encodeState(original))).toEqual(original);
});

it('round trips both composition factors while leaving older links unchanged', () => {
  const original: UrlState = { ...state, mode: 'compose', b: { a: 2, b: 1e21, c: -0.5, d: 3 } };
  expect(decodeState(encodeState(original))).toEqual(original);
  expect(encodeState(state)).not.toContain('&b=');
  expect(decodeState(encodeState(state))).not.toHaveProperty('b');
});

it.each(['', '1,2,3', '1,2,3,4,5', '1,,0,1', 'NaN,0,0,1', 'Infinity,0,0,1',
  '1e309,0,0,1', '1x,0,0,1', '0x10,0,0,1', '%ZZ,0,0,1',
  '1,0,0,1&b=2,0,0,2'])('rejects malformed composition factor %j', (b) => {
  expect(decodeState(`#m=1,0,0,1&mode=compose&b=${b}`)).toBeNull();
});

it('reads row-major entries and defaults a matrix-only link to Explore', () => {
  expect(encodeState(state)).toBe('#m=1.5,-0.5,0.5,1&mode=decompose');
  expect(decodeState('#m=1.5,-0.5,0.5,1')).toEqual({ ...state, mode: 'explore' });
});

it.each([
  '', '#', '#mode=decompose', '#m=', '#m=1,2,3', '#m=1,2,3,4,5',
  '#m=1,,0,1', '#m=1,%20,0,1', '#m=NaN,0,0,1', '#m=Infinity,0,0,1',
  '#m=1e309,0,0,1', '#m=1x,0,0,1', '#m=0x10,0,0,1', '#m=%ZZ,0,0,1',
  '#m=1,0,0,1&mode=unknown', '#m=1,0,0,1&mode=',
  '#m=1,0,0,1&m=2,0,0,2', '#m=1,0,0,1&mode=explore&mode=decompose',
])('ignores malformed state %j', (hash) => {
  expect(decodeState(hash)).toBeNull();
});

function setup(hash = '') {
  vi.useFakeTimers();
  const browser = Object.assign(new EventTarget(), {
    location: { hash }, history: { state: { existing: true }, replaceState: vi.fn() },
  });
  vi.stubGlobal('window', browser);
  let current = state;
  const restore = vi.fn((next: UrlState) => { current = next; });
  const binding = bindUrlState(() => current, restore);
  return { browser, restore, binding, navigate(hash: string) {
    browser.location.hash = hash;
    browser.dispatchEvent(new Event('hashchange'));
  } };
}

it('restores on load and hashchange without writing back or losing precision', () => {
  const h = setup(encodeState(state));
  expect(h.binding.restored).toBe(true);
  expect(h.restore).toHaveBeenLastCalledWith(state);
  h.binding.update();
  h.restore.mockImplementationOnce(() => h.binding.update());
  const next = { matrix: { a: 0, b: -1, c: 1, d: 0 }, mode: 'explore' } as const;
  h.navigate(encodeState(next));
  expect(h.restore).toHaveBeenLastCalledWith(next);
  vi.runAllTimers();
  expect(h.browser.history.replaceState).not.toHaveBeenCalled();
  h.navigate('#m=bad');
  expect(h.restore).toHaveBeenCalledTimes(2);
});

it('coalesces updates and preserves history state without adding navigation entries', () => {
  const h = setup();
  expect(h.binding.restored).toBe(false);
  expect(h.restore).not.toHaveBeenCalled();
  h.binding.update();
  vi.advanceTimersByTime(100);
  h.binding.update();
  vi.advanceTimersByTime(100);
  expect(h.browser.history.replaceState).not.toHaveBeenCalled();
  vi.advanceTimersByTime(50);
  expect(h.browser.history.replaceState).toHaveBeenCalledExactlyOnceWith(
    { existing: true }, '', encodeState(state),
  );
});
