import { interactionGroups } from '@react-three/rapier';

/** Collision groups: 0 = static world, 1 = player, 2 = pickable items. */
const GROUP_WORLD = 0;
export const GROUP_PICKABLE = 2;

export const PLAYER_COLLISION = interactionGroups(1, [GROUP_WORLD]);
export const PICKABLE_COLLISION = interactionGroups(GROUP_PICKABLE, [GROUP_WORLD, GROUP_PICKABLE]);
