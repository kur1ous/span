import type { Mat2 } from './math/mat2';

export function bindMatrixInputs(
  inputs: Record<keyof Mat2, HTMLInputElement>, error: HTMLElement,
  get: () => Mat2, set: (m: Mat2) => void, stop: () => void,
) {
  const keys = ['a', 'b', 'c', 'd'] as const;
  const dirty = new Set<keyof Mat2>();
  const invalid = new Set<keyof Mat2>();
  const showError = () => {
    error.textContent = invalid.size ? 'Enter a finite number for each highlighted entry.' : '';
    for (const key of keys) inputs[key].setAttribute('aria-invalid', String(invalid.has(key)));
  };
  for (const key of keys) {
    const input = inputs[key];
    const commit = () => {
      if (!dirty.has(key)) return;
      const text = input.value.trim();
      const value = Number(text);
      if (!text || !Number.isFinite(value)) {
        invalid.add(key);
        showError();
        return;
      }
      stop();
      set({ ...get(), [key]: value });
    };
    input.addEventListener('focus', stop);
    input.addEventListener('input', () => dirty.add(key));
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        commit();
      }
    });
  }
  return {
    update(m: Mat2) {
      dirty.clear();
      invalid.clear();
      showError();
      for (const key of keys) inputs[key].value = String(m[key]);
    },
  };
}
