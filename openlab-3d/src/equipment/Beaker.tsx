/**
 * 250 mL borosilicate beaker: Ø 70 mm × 95 mm. LatheGeometry wall profile with a rolled
 * rim and a pour spout lip, thin dark graduation rings every 50 mL, and an inner liquid
 * contents renderer (liquid, sediment, bubbles).
 */
import { CylinderGeometry, LatheGeometry, Vector2 } from 'three';
import { useGlass } from '../materials/glass';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';
import { GraduationScale } from './GraduationScale';
import { VesselContents } from './VesselContents';
import { PROFILES } from './profiles';
import type { MixtureLook } from '../chemistry/color';

const R = 0.035;
const H = 0.095;
const WALL = 0.0018;

/** Outer and inner wall in one closed profile (base → rim → back down inside). */
const profile = lazy(() => [
  new Vector2(0.0, 0.0),
  new Vector2(R - 0.004, 0.0),
  new Vector2(R, 0.004),
  new Vector2(R, H - 0.004),
  new Vector2(R + 0.0025, H - 0.001),
  new Vector2(R + 0.0022, H + 0.0012),
  new Vector2(R - WALL, H),
  new Vector2(R - WALL, 0.005),
  new Vector2(R - 0.005, WALL),
  new Vector2(0.0, WALL),
]);
export const beakerGeometry = lazy(() => new LatheGeometry(profile(), 36));

/** Spout: a small curved lip. */
const spoutGeometry = lazy(() => {
  const g = new CylinderGeometry(0.006, 0.004, 0.012, 12, 1, true, 0, Math.PI);
  g.rotateZ(Math.PI / 2.4);
  return g;
});

export interface VesselModelProps extends ModelProps {
  look?: MixtureLook;
  itemId?: string;
}

export function Beaker({ modelUrl, look, itemId, ...props }: VesselModelProps) {
  const glass = useGlass('#eef8fb');
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={beakerGeometry()} material={glass} castShadow renderOrder={1} />
      <mesh geometry={spoutGeometry()} material={glass} position={[R + 0.001, H - 0.002, 0]} renderOrder={1} />
      <GraduationScale kind="beaker" />
      {look && <VesselContents profile={PROFILES.beaker} look={look} itemId={itemId} />}
    </ModelOr>
  );
}
