import type { Placement } from './surfaces';

/** Bridge between keyboard handling (outside the canvas) and the held-item renderer. */
export const heldApi: {
  /** Places the held item at the current ghost target. Returns false if nowhere valid. */
  place: () => boolean;
  target: Placement | null;
} = {
  place: () => false,
  target: null,
};

/** Shared state of an in-progress hold-E / mouse drag on an interactable (e.g. the voltage knob). */
export const dragState = { id: null as string | null, moved: 0, source: null as 'key' | 'mouse' | null };

/** Latest virtual joystick vector from the touch controls (x: strafe, y: forward). */
export const touchInput = { moveX: 0, moveY: 0, sprint: false };
