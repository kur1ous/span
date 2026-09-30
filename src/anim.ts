import type { Mat2 } from './math/mat2';

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Entry-wise interpolation; good enough for reset and preset moves. */
export function lerpMat(from: Mat2, to: Mat2, t: number): Mat2 {
  const k = (x: number, y: number) => x + (y - x) * t;
  return { a: k(from.a, to.a), b: k(from.b, to.b), c: k(from.c, to.c), d: k(from.d, to.d) };
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Tween between two matrices on requestAnimationFrame. Returns a cancel
 * function; callers cancel when the user grabs a handle mid-flight.
 */
export function tweenMatrix(
  from: Mat2,
  to: Mat2,
  ms: number,
  onFrame: (m: Mat2) => void,
): () => void {
  if (reduced()) {
    onFrame(to);
    return () => {};
  }
  let raf = 0;
  let start = 0;
  const step = (now: number) => {
    if (!start) start = now;
    const t = Math.min(1, (now - start) / ms);
    onFrame(t === 1 ? to : lerpMat(from, to, easeInOutCubic(t)));
    if (t < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
