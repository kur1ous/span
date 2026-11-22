import katex from 'katex';
import { tweenMatrix } from './anim';
import { fmt } from './format';
import { IDENTITY, inverse, type Mat2 } from './math/mat2';

export function bindInverse(
  button: HTMLButtonElement, readout: HTMLElement, caption: HTMLElement,
  render: (matrix: Mat2) => void, beforeStart: () => void,
) {
  let matrix = IDENTITY;
  let cancel: (() => void) | undefined;
  let available = false;
  function pause() { cancel?.(); cancel = undefined; }

  button.addEventListener('click', () => {
    if (!available || button.disabled) return;
    beforeStart();
    pause();
    button.disabled = true;
    caption.textContent = 'Applying the inverse to A…';
    // lerp(A, I, t) equals lerp(I, inverse(A), t) A, without cancellation error.
    cancel = tweenMatrix(matrix, IDENTITY, 560, (m) => {
      render(m);
      if (m === IDENTITY) {
        caption.textContent = 'A⁻¹A = I. The plane is back at the identity.';
        button.disabled = false;
      }
    });
  });

  return {
    pause,
    reset(m: Mat2) {
      pause();
      matrix = m;
      const inv = inverse(m);
      available = inv !== null && Object.values(inv).every(Number.isFinite);
      button.disabled = !available;
      if (available && inv) {
        katex.render(`A^{-1}=\\begin{bmatrix}${fmt(inv.a)} & ${fmt(inv.b)}\\\\` +
          `${fmt(inv.c)} & ${fmt(inv.d)}\\end{bmatrix}`, readout, { displayMode: true });
        caption.textContent = 'Apply A⁻¹ to undo A. Editing A restarts the demonstration.';
      } else {
        readout.replaceChildren();
        caption.textContent = inv === null
          ? 'Not invertible: determinant is zero to working precision.'
          : 'Inverse is outside the finite numeric range.';
      }
      render(m);
    },
  };
}
