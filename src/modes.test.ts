import { describe, expect, it, vi } from 'vitest';
import { bindModeTabs, modes } from './modes';

function setup() {
  const tabs = modes.map(({ id }) => Object.assign(new EventTarget(), {
    id: `mode-${id}`, tabIndex: -1, setAttribute: vi.fn(), focus: vi.fn(),
  }));
  const panel = { setAttribute: vi.fn() };
  const select = vi.fn();
  const activate = bindModeTabs(tabs as unknown as HTMLButtonElement[], panel as unknown as HTMLElement, select);
  const key = (index: number, key: string) => tabs[index]!.dispatchEvent(
    Object.assign(new Event('keydown', { cancelable: true }), { key }),
  );
  function selected(index: number) {
    expect(tabs.map((tab) => tab.tabIndex)).toEqual(tabs.map((_, i) => i === index ? 0 : -1));
    tabs.forEach((tab, i) => expect(tab.setAttribute).toHaveBeenLastCalledWith(
      'aria-selected', String(i === index),
    ));
    expect(panel.setAttribute).toHaveBeenLastCalledWith('aria-labelledby', tabs[index]!.id);
    expect(select.mock.lastCall![0].id).toBe(modes[index]!.id);
  }
  return { tabs, select, key, selected, activate };
}

describe('mode tabs', () => {
  it('restores a mode programmatically without moving keyboard focus', () => {
    const h = setup();
    h.activate('decompose');
    h.selected(1);
    h.activate('compose');
    h.selected(2);
    h.activate('inverse');
    h.selected(3);
    expect(h.select.mock.lastCall![0].cells).toEqual(['matrix', 'det', 'inverse']);
    h.activate('solve');
    h.selected(4);
    expect(h.select.mock.lastCall![0].cells).toContain('solve');
    h.activate('basis');
    h.selected(5);
    expect(h.select.mock.lastCall![0].cells).toEqual(['basis']);
    expect(h.select.mock.lastCall![0].overlays).toMatchObject({ probe: true, eigenvectors: false });
    h.activate('explore');
    h.selected(0);
    h.tabs.forEach((tab) => expect(tab.focus).not.toHaveBeenCalled());
  });

  it('starts in Explore without stealing focus and selects Decompose on click', () => {
    const h = setup();
    h.selected(0);
    expect(h.tabs[0]!.focus).not.toHaveBeenCalled();
    h.tabs[1]!.dispatchEvent(new Event('click'));
    h.selected(1);
    expect(h.select.mock.lastCall![0].cells).toEqual(['matrix', 'svd']);
    expect(h.select.mock.lastCall![0].overlays).toMatchObject({ unitCircle: true, probe: false });
    h.tabs[2]!.dispatchEvent(new Event('click'));
    h.selected(2);
    expect(h.select.mock.lastCall![0].cells).toEqual(['matrix', 'composition']);
    expect(h.select.mock.lastCall![0].overlays).toMatchObject({ unitSquare: true, probe: false });
    h.tabs[0]!.dispatchEvent(new Event('click'));
    h.selected(0);
    expect(h.select.mock.lastCall![0].cells).toContain('eigen');
  });

  it.each([
    [0, 'ArrowLeft', 5], [5, 'ArrowRight', 0],
    [0, 'ArrowRight', 1], [1, 'ArrowLeft', 0],
    [1, 'ArrowRight', 2], [2, 'ArrowLeft', 1],
    [2, 'ArrowRight', 3], [3, 'ArrowLeft', 2],
    [3, 'ArrowRight', 4], [4, 'ArrowLeft', 3],
    [4, 'ArrowRight', 5], [5, 'ArrowLeft', 4],
    [0, 'End', 5], [5, 'Home', 0],
  ] as const)('moves from tab %i with %s to tab %i', (start, key, end) => {
    const h = setup();
    h.tabs[start]!.dispatchEvent(new Event('click'));
    expect(h.key(start, key)).toBe(false);
    h.selected(end);
    expect(h.tabs[end]!.focus).toHaveBeenCalledOnce();
  });

  it('leaves Tab and vertical arrows to the browser', () => {
    const h = setup();
    for (const key of ['Tab', 'ArrowDown', 'ArrowUp']) expect(h.key(0, key)).toBe(true);
    expect(h.select).toHaveBeenCalledOnce();
    h.selected(0);
  });
});
