import type { Vec2 } from './math/mat2';

/**
 * Maps world coordinates (y up, origin at the centre of the frame) to screen
 * pixels (y down). The shorter side of the frame always shows the same span of
 * the plane, so resizing never changes what is visible along that side.
 */
export interface View {
  readonly width: number;
  readonly height: number;
  /** pixels per world unit */
  readonly scale: number;
}

/** How many world units fit along the shorter side of the frame. */
export const SPAN = 11;

export function makeView(width: number, height: number): View {
  return { width, height, scale: Math.min(width, height) / SPAN };
}

export function toScreen(v: View, p: Vec2): Vec2 {
  return [v.width / 2 + p[0] * v.scale, v.height / 2 - p[1] * v.scale];
}

export function toWorld(v: View, p: Vec2): Vec2 {
  return [(p[0] - v.width / 2) / v.scale, (v.height / 2 - p[1]) / v.scale];
}

/** World-space rectangle currently on screen. */
export function worldBounds(v: View): { min: Vec2; max: Vec2 } {
  const lo = toWorld(v, [0, v.height]);
  const hi = toWorld(v, [v.width, 0]);
  return { min: lo, max: hi };
}
