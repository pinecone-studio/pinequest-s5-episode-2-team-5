import { interactionGroups } from '@react-three/rapier';

/** Player body (rapier capsule) and camera. All values in meters / seconds. */
export const CAPSULE_RADIUS = 0.3;
/** Height of the capsule's cylindrical section (spec: 1.0 m). */
export const CAPSULE_CYLINDER = 1.0;
export const CAPSULE_HALF_HEIGHT = CAPSULE_CYLINDER / 2;
/** Distance from the floor to the capsule center. */
export const CAPSULE_CENTER_Y = CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS;
export const EYE_HEIGHT = 1.65;
/** Camera offset above the capsule center. */
export const EYE_OFFSET = EYE_HEIGHT - CAPSULE_CENTER_Y;

export const WALK_SPEED = 3;
export const SPRINT_MULTIPLIER = 1.8;
/** Exponential smoothing rates (1/s) for speeding up and slowing down. */
export const ACCELERATION = 9;
export const DECELERATION = 11;
export const GRAVITY = 18;
export const JUMP_VELOCITY = 4.2;
export const KEY_TURN_SPEED = 2.1; // rad/s when turning with the keyboard
export const PITCH_LIMIT = (85 * Math.PI) / 180;

export const INTERACT_RANGE = 2.5;

/** Architecture. */
export const WALL_HEIGHT = 3.2;
export const WALL_THICKNESS = 0.2;
export const DOOR_HEIGHT = 2.3;
export const BENCH_HEIGHT = 0.9;

/** Collision groups: 0 = static world, 1 = player, 2 = pickable items. */
export const GROUP_WORLD = 0;
export const GROUP_PLAYER = 1;
export const GROUP_PICKABLE = 2;
export const PLAYER_COLLISION = interactionGroups(GROUP_PLAYER, [GROUP_WORLD]);
export const PICKABLE_COLLISION = interactionGroups(GROUP_PICKABLE, [GROUP_WORLD, GROUP_PICKABLE]);

/** Shared palette for the facility. */
export const PALETTE = {
  wall: '#eef0f2',
  floor: '#d9dcdf',
  ceiling: '#f7f8f9',
  benchTop: '#3a3d42',
  benchBody: '#4a4e55',
  benchFront: '#555a62',
  trim: '#b9bec4',
  hudYellow: '#F5B800',
  doorFrame: '#8d949c',
  sky: '#cfe6f7',
} as const;

/** Millikan apparatus constants (SI). */
export const MILLIKAN = {
  plateSeparation: 6.0e-3, // m
  oilDensity: 886, // kg/m³
  airViscosity: 1.81e-5, // Pa·s
  g: 9.81,
  e: 1.602e-19, // C
  maxVoltage: 600,
  /** Height of the visible field of view in the eyepiece (mm). */
  fieldHeightMm: 1.2,
  fieldWidthMm: 1.2,
} as const;
