import type { Mat2 } from './math/mat2';
import type { ModeId } from './modes';

export interface UrlState {
  matrix: Mat2;
  mode: ModeId;
  b?: Mat2;
}

export function encodeState({ matrix, mode, b }: UrlState): string {
  const entries = (m: Mat2) => [m.a, m.b, m.c, m.d].map((n) => encodeURIComponent(String(n))).join(',');
  return `#m=${entries(matrix)}&mode=${mode}${b ? `&b=${entries(b)}` : ''}`;
}

function decodeMatrix(value: string): Mat2 | null {
  const entries = value.split(',');
  if (entries.length !== 4 || entries.some((s) =>
    !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s.trim()))) return null;
  const [a, b, c, d] = entries.map(Number);
  if (![a, b, c, d].every(Number.isFinite)) return null;
  return { a: a!, b: b!, c: c!, d: d! };
}

export function decodeState(hash: string): UrlState | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  if (params.getAll('m').length !== 1 || params.getAll('mode').length > 1 || params.getAll('b').length > 1) return null;
  const mode = params.get('mode') ?? 'explore';
  if (mode !== 'explore' && mode !== 'decompose' && mode !== 'compose') return null;
  const matrix = decodeMatrix(params.get('m')!);
  if (!matrix) return null;
  if (!params.has('b')) return { matrix, mode };
  const b = decodeMatrix(params.get('b')!);
  return b ? { matrix, mode, b } : null;
}

export function bindUrlState(get: () => UrlState, restore: (state: UrlState) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let restoring = false;
  function restoreHash() {
    clearTimeout(timer);
    const state = decodeState(window.location.hash);
    if (!state) return false;
    restoring = true;
    try { restore(state); } finally { restoring = false; }
    return true;
  }
  const restored = restoreHash();
  window.addEventListener('hashchange', restoreHash);
  return {
    restored,
    update() {
      if (restoring) return;
      clearTimeout(timer);
      // A drag or tween should settle before replacing the address bar state.
      timer = setTimeout(() => {
        const hash = encodeState(get());
        if (window.location.hash !== hash) window.history.replaceState(window.history.state, '', hash);
      }, 150);
    },
  };
}
