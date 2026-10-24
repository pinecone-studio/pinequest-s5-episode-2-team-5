/**
 * 100 mL graduated cylinder: Ø 30 mm tube, 250 mm tall, hexagonal plastic foot,
 * pour lip, printed numbered graduation scale and a liquid column.
 */
import { CylinderGeometry, LatheGeometry, Vector2 } from 'three';
import { useGlass } from '../materials/glass';
import { plastic } from '../materials/plastic';
import { lazy } from '../utils/lazy';
import { ModelOr } from './ModelOr';
import { GraduationScale } from './GraduationScale';
import { VesselContents } from './VesselContents';
import { PROFILES } from './profiles';
import type { VesselModelProps } from './Beaker';

const R = 0.014;
const H = 0.25;
const tube = lazy(() => {
  const pts = [new Vector2(0, 0.012), new Vector2(R, 0.012), new Vector2(R, H - 0.004), new Vector2(R + 0.002, H), new Vector2(R - 0.0015, H), new Vector2(R - 0.0015, 0.0135), new Vector2(0, 0.0135)];
  return new LatheGeometry(pts, 28);
});
const foot = lazy(() => new CylinderGeometry(0.03, 0.032, 0.012, 6));
export function GraduatedCylinder({ modelUrl, look, itemId, ...props }: VesselModelProps) {
  const glass = useGlass('#eef8fb');
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={foot()} material={plastic('#2563eb', 0.5)} position={[0, 0.006, 0]} castShadow />
      <mesh geometry={tube()} material={glass} renderOrder={1} castShadow />
      <GraduationScale />
      {look && <VesselContents profile={PROFILES.graduatedCylinder} look={look} itemId={itemId} />}
    </ModelOr>
  );
}
