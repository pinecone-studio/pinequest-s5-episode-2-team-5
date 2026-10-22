/** chem-n4: centre [8.3, -14.55], width 2.6 m, depth .7 m.
 * Match its inset placement surface; include small raised supports above it. */
export function isWorkbenchPosition(at: { x: number; y: number; z: number }, height = .9): boolean {
  return at.x >= 7.02 && at.x <= 9.58 && at.z >= -14.89 && at.z <= -14.21 && at.y >= height - .035 && at.y <= height + .42;
}
