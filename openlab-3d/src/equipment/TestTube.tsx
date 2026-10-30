/**
 * 16 × 150 mm test tube with a rounded bottom and flared lip (origin at the bottom).
 * Upright in a rack or in the hand it shows its contents; a loose tube lies on its side.
 */
import { LatheGeometry, Vector2 } from 'three';
import { useGlass } from '../materials/glass';
import { lazy } from '../utils/lazy';
import { ModelOr } from './ModelOr';
import { VesselContents } from './VesselContents';
import { PROFILES } from './profiles';
import type { VesselModelProps } from './Beaker';

const R = 0.008;
const L = 0.15;

export const testTubeGeometry = lazy(() => {
  const pts: Vector2[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    pts.push(new Vector2(Math.sin(a) * R, R - Math.cos(a) * R));
  }
  pts.push(new Vector2(R, L - 0.002), new Vector2(R + 0.0012, L), new Vector2(R - 0.0008, L), new Vector2(R - 0.0008, R));
  return new LatheGeometry(pts, 18);
});

export function TestTube({ modelUrl, look, itemId, upright = false, ...props }: VesselModelProps & { upright?: boolean }) {
  const glass = useGlass('#eef8fb');
  if (upright) {
    return (
      <ModelOr modelUrl={modelUrl} {...props}>
        <mesh geometry={testTubeGeometry()} material={glass} renderOrder={1} castShadow />
        {look && <VesselContents profile={PROFILES.testTube} look={look} itemId={itemId} />}
      </ModelOr>
    );
  }
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      {/* Laid on its side so a loose tube rests stably on a bench. */}
      <group rotation={[Math.PI / 2, 0, 0]} position={[0, R, -L / 2]}>
        <mesh geometry={testTubeGeometry()} material={glass} renderOrder={1} castShadow />
      </group>
    </ModelOr>
  );
}
