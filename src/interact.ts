import { clampTo, getColumn, nudge, snap, withColumn, type Which } from './edit';
import type { Mat2, Vec2 } from './math/mat2';
import type { Plane } from './plane';
import { toWorld, worldBounds } from './view';

const STEP = 0.1;
const COARSE_STEP = 1;
/** keep tips this far inside the frame so a handle can never be lost off-screen */
const MARGIN = 0.4;

const ARROWS: Record<string, Vec2> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};

/**
 * Wire pointer drag and arrow-key nudging to the two handles. `onGrab` fires
 * when the user takes over, so any running animation can be cancelled.
 */
export function bindHandles(
  plane: Plane,
  get: () => Mat2,
  set: (m: Mat2) => void,
  onGrab: () => void,
): void {
  const limit = (): Vec2 => {
    const b = worldBounds(plane.view());
    return [b.max[0] - MARGIN, b.max[1] - MARGIN];
  };

  for (const which of ['i', 'j'] as Which[]) {
    const handle = plane.handles[which];
    let offset: Vec2 | null = null;

    const pointerWorld = (e: PointerEvent): Vec2 => {
      const r = plane.svg.getBoundingClientRect();
      return toWorld(plane.view(), [e.clientX - r.left, e.clientY - r.top]);
    };

    handle.addEventListener('pointerdown', (e) => {
      onGrab();
      handle.setPointerCapture(e.pointerId);
      handle.focus();
      handle.classList.add('is-dragging');
      // remember where inside the ring it was grabbed so the tip does not jump
      const p = pointerWorld(e);
      const tip = getColumn(get(), which);
      offset = [tip[0] - p[0], tip[1] - p[1]];
      e.preventDefault();
    });

    handle.addEventListener('pointermove', (e) => {
      if (!offset) return;
      const p = pointerWorld(e);
      let v: Vec2 = [p[0] + offset[0], p[1] + offset[1]];
      if (!e.altKey) v = snap(v);
      set(withColumn(get(), which, clampTo(v, limit())));
    });

    const release = (e: PointerEvent) => {
      if (!offset) return;
      offset = null;
      handle.classList.remove('is-dragging');
      if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
    };
    handle.addEventListener('pointerup', release);
    handle.addEventListener('pointercancel', release);

    handle.addEventListener('keydown', (e) => {
      const dir = ARROWS[e.key];
      if (!dir) return;
      e.preventDefault();
      onGrab();
      const step = e.shiftKey ? COARSE_STEP : STEP;
      const next = nudge(getColumn(get(), which), dir[0] * step, dir[1] * step);
      set(withColumn(get(), which, clampTo(next, limit())));
    });
  }
}
