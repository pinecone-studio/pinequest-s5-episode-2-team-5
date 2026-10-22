/** Watch glass: Ø 80 mm shallow spherical glass dish for covering beakers or drying small samples. */
import { useGlass } from '../materials/glass';
import { ModelOr } from './ModelOr';
import { VesselContents } from './VesselContents';
import { PROFILES } from './profiles';
import type { VesselModelProps } from './Beaker';

const R = 0.15;

export function WatchGlass({ modelUrl, look, itemId, ...props }: VesselModelProps) {
  const glass = useGlass('#eef8fb');
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh material={glass} position={[0, R, 0]} rotation={[Math.PI, 0, 0]} renderOrder={1} castShadow>
        <sphereGeometry args={[R, 36, 6, 0, Math.PI * 2, 0, 0.27]} />
      </mesh>
      {look && <VesselContents profile={PROFILES.watchGlass} look={look} itemId={itemId} />}
    </ModelOr>
  );
}
