import type { OverlayState } from './plane';

export const overlayLabels = {
  unitSquare: 'Unit square', unitCircle: 'Unit circle',
  quarterRules: 'Quarter-unit rules', tickLabels: 'Tick labels',
  eigenvectors: 'Eigenlines', probe: 'Probe vector',
} satisfies Record<keyof OverlayState, string>;

interface Mode {
  id: string;
  cells: readonly string[];
  controls: readonly (keyof OverlayState)[];
  overlays: OverlayState;
}

export const modes: readonly Mode[] = [
  {
    id: 'explore', cells: ['matrix', 'det', 'eigen'],
    controls: ['unitSquare', 'unitCircle', 'quarterRules', 'tickLabels', 'eigenvectors', 'probe'],
    overlays: { unitSquare: true, unitCircle: false, quarterRules: true, tickLabels: true,
      eigenvectors: true, probe: true },
  },
  {
    id: 'decompose', cells: ['matrix', 'svd'],
    controls: ['unitCircle', 'quarterRules', 'tickLabels'],
    overlays: { unitSquare: false, unitCircle: true, quarterRules: true, tickLabels: true,
      eigenvectors: false, probe: false },
  },
];

export function bindModeTabs(
  tabs: readonly HTMLButtonElement[], panel: HTMLElement, select: (mode: Mode) => void,
) {
  function activate(index: number, focus = false) {
    const mode = modes[index]!;
    tabs.forEach((tab, i) => {
      tab.tabIndex = i === index ? 0 : -1;
      tab.setAttribute('aria-selected', String(i === index));
    });
    panel.setAttribute('aria-labelledby', tabs[index]!.id);
    select(mode);
    if (focus) tabs[index]!.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(index));
    tab.addEventListener('keydown', (event) => {
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : undefined;
      if (next === undefined) return;
      event.preventDefault();
      activate(next, true);
    });
  });
  activate(0);
}
