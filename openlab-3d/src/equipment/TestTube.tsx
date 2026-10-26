/**
 * 16 × 150 mm test tube with a rounded bottom and flared lip (origin at the bottom).
 * In a rack or in the hand it stands as is; on a bench it stands in a single-tube stand so
 * acid poured into it stays put and the reaction is visible. Stored in a drawer it lies flat.
 */
import { LatheGeometry, Vector2 } from 'three';
import { useGlass } from '../materials/glass';
import { metalBrushed } from '../materials/metal';
import { plastic } from '../materials/plastic';
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

const STAND = 0.004;

/** White polypropylene single-tube stand: weighted foot, post and a spring collar. */
function TubeStand() {
  const pp = plastic('#f2f3ef', 0.55);
  return (
    <group>
      <mesh material={pp} position={[0, STAND / 2, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.02, 0.021, STAND, 28]} />
      </mesh>
      <mesh material={pp} position={[0, 0.034, -0.0135]} castShadow>
        <boxGeometry args={[0.006, 0.062, 0.004]} />
      </mesh>
      <mesh material={pp} position={[0, 0.064, -0.0105]}>
        <boxGeometry args={[0.006, 0.006, 0.006]} />
      </mesh>
      <mesh material={metalBrushed} position={[0, 0.064, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R + 0.0012, 0.0011, 8, 24]} />
      </mesh>
    </group>
  );
}

export function TestTube({ modelUrl, look, itemId, upright = false, lying = false, ...props }: VesselModelProps & { upright?: boolean; lying?: boolean }) {
  const glass = useGlass('#eef8fb');
  if (lying) {
    return (
      <ModelOr modelUrl={modelUrl} {...props}>
        {/* Laid flat in a drawer. */}
        <group rotation={[Math.PI / 2, 0, 0]} position={[0, R, -L / 2]}>
          <mesh geometry={testTubeGeometry()} material={glass} renderOrder={1} castShadow />
        </group>
      </ModelOr>
    );
  }
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      {!upright && <TubeStand />}
      <group position={[0, upright ? 0 : STAND, 0]}>
        <mesh geometry={testTubeGeometry()} material={glass} renderOrder={1} castShadow />
        {look && <VesselContents profile={PROFILES.testTube} look={look} itemId={itemId} />}
      </group>
    </ModelOr>
  );
}
