import { Ray, Vector3 } from 'three';

export interface SupportSpot {
  id: string;
  point: Vector3;
  aim: Vector3;
  radius: number;
}

/** Snap near a support's opening instead of requiring a hit on its thin metal rim. */
export function snapToSupport(ray: Ray, spots: SupportSpot[], reach: number): SupportSpot | null {
  let best: SupportSpot | null = null;
  let score = Infinity;
  for (const spot of spots) {
    const along = spot.aim.clone().sub(ray.origin).dot(ray.direction);
    if (along <= 0 || along > reach) continue;
    const distance = ray.distanceToPoint(spot.aim);
    if (distance > spot.radius) continue;
    const candidate = distance / spot.radius;
    if (candidate < score) { best = spot; score = candidate; }
  }
  return best;
}
