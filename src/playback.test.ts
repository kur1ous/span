import { afterEach, expect, it, vi } from 'vitest';
import { bindPlayback } from './playback';
import { IDENTITY, diag, rotation, svd } from './math/mat2';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function setup(target = diag(3, 2)) {
  const motion = { matches: false };
  vi.stubGlobal('window', { matchMedia: vi.fn(() => motion) });
  let now = 0;
  let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.set(++id, fn); return id; });
  vi.stubGlobal('cancelAnimationFrame', (key: number) => frames.delete(key));
  const button = Object.assign(new EventTarget(), { textContent: '' });
  const slider = Object.assign(new EventTarget(), { value: '0', setAttribute: vi.fn() });
  const captions = ['Rotate (Vᵀ)', 'Scale (Σ)', 'Rotate (U)'].map((textContent) => ({
    textContent, setAttribute: vi.fn(),
  }));
  const render = vi.fn();
  const playback = bindPlayback(button as unknown as HTMLButtonElement,
    slider as unknown as HTMLInputElement, captions as unknown as HTMLElement[], render);
  playback.reset(target);
  return {
    button, slider, captions, render, playback, frames, motion,
    click: () => button.dispatchEvent(new Event('click')),
    scrub(value: number) { slider.value = String(value); slider.dispatchEvent(new Event('input')); },
    tick(ms: number) {
      now += ms;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((fn) => fn(now));
    },
  };
}

it('scrubs exact boundaries and eases within each stage', () => {
  const h = setup();
  expect(h.render).toHaveBeenLastCalledWith(IDENTITY, expect.any(Object));
  h.scrub(1);
  expect(h.render).toHaveBeenLastCalledWith({ a: 1, b: expect.closeTo(0), c: 0, d: 1 }, expect.any(Object));
  h.scrub(1.25);
  expect(h.render).toHaveBeenLastCalledWith(diag(1.125, 1.0625), expect.any(Object));
  expect(h.captions[1]!.setAttribute).toHaveBeenLastCalledWith('aria-current', 'step');
  expect(h.slider.setAttribute).toHaveBeenLastCalledWith('aria-valuetext', 'Scale (Σ), stage 2 of 3, 25% through stage');
  h.scrub(2);
  expect(h.render).toHaveBeenLastCalledWith(diag(3, 2), expect.any(Object));
  h.scrub(3);
  expect(h.render).toHaveBeenLastCalledWith(diag(3, 2), expect.any(Object));
  expect(h.captions[2]!.setAttribute).toHaveBeenLastCalledWith('aria-current', 'step');
});

it('pauses, resumes, completes and replays without overlapping frames', () => {
  const h = setup();
  h.click(); h.tick(0); h.tick(600);
  expect(h.slider.value).toBe('0.5');
  expect(h.button.textContent).toBe('Pause');
  h.click(); h.tick(5000);
  expect(h.slider.value).toBe('0.5');
  expect(h.frames.size).toBe(0);
  h.click(); h.tick(600);
  expect(h.slider.value).toBe('1');
  h.scrub(2.5);
  expect(h.frames.size).toBe(0);
  expect(h.button.textContent).toBe('Play');
  h.click(); h.tick(600);
  expect(h.slider.value).toBe('3');
  expect(h.button.textContent).toBe('Play');
  expect(h.frames.size).toBe(0);
  h.click();
  expect(h.render).toHaveBeenLastCalledWith(IDENTITY, expect.any(Object));
  expect(h.frames.size).toBe(1);
  h.playback.pause(); h.tick(5000);
  expect(h.slider.value).toBe('0');
});

it('resets a running timeline and uses the replacement target', () => {
  const h = setup();
  h.click(); h.tick(1800);
  const target = rotation(Math.PI / 3);
  h.playback.reset(target);
  expect(h.frames.size).toBe(0);
  expect(h.button.textContent).toBe('Play');
  expect(h.slider.value).toBe('0');
  h.scrub(3);
  for (const key of ['a', 'b', 'c', 'd'] as const) {
    expect(h.render.mock.lastCall![0][key]).toBeCloseTo(target[key]);
  }
});

it('passes target factors and eased time through forward and backward scrubbing', () => {
  const target = { a: 1, b: 2, c: 0, d: -1 };
  const h = setup(target);
  for (const [raw, eased] of [[0, 0], [0.25, 0.0625], [2.75, 2.9375], [3, 3], [1, 1]]) {
    h.scrub(raw!);
    expect(h.render.mock.lastCall![1]).toEqual({ factors: svd(target), time: eased });
  }
});

it('announces progress within each stage while scrubbing in either direction', () => {
  const h = setup();
  const cases = [
    [0, 0, 0],
    [0.25, 0, 25],
    [0.99, 0, 99],
    [1, 1, 0],
    [1.57, 1, 57],
    [2, 2, 0],
    [3, 2, 100],
    [2.5, 2, 50],
    [1.25, 1, 25],
    [0, 0, 0],
  ] as const;
  for (const [time, stage, percent] of cases) {
    h.scrub(time);
    expect(h.slider.setAttribute).toHaveBeenLastCalledWith('aria-valuetext',
      `${h.captions[stage]!.textContent}, stage ${stage + 1} of 3, ${percent}% through stage`);
  }
});

it('completes playback without animation when reduced motion is preferred', () => {
  const h = setup();
  h.motion.matches = true;
  for (const start of [0, 1.5, 3]) {
    h.scrub(start);
    h.render.mockClear();
    h.click();
    expect(h.frames.size).toBe(0);
    expect(h.button.textContent).toBe('Play');
    expect(h.slider.value).toBe('3');
    expect(h.render).toHaveBeenCalledExactlyOnceWith(diag(3, 2),
      { factors: svd(diag(3, 2)), time: 3 });
    expect(h.slider.setAttribute).toHaveBeenLastCalledWith('aria-valuetext',
      `${h.captions[2]!.textContent}, stage 3 of 3, 100% through stage`);
  }
  h.scrub(1.25);
  expect(h.render).toHaveBeenLastCalledWith(diag(1.125, 1.0625), expect.any(Object));
  expect(h.frames.size).toBe(0);

  h.motion.matches = false;
  h.click(); h.tick(600);
  expect(h.slider.value).toBe('1.75');
  expect(h.button.textContent).toBe('Pause');
});
