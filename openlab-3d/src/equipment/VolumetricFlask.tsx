/** 100 mL volumetric flask: round bulb on a long neck with a ring mark (origin at the base). */
import { LatheGeometry, Vector2 } from 'three';
import { useGlass } from '../materials/glass';
import { plastic } from '../materials/plastic';
import { lazy } from '../utils/lazy';
import { ModelOr } from './ModelOr';
import { VesselContents } from './VesselContents';
import { PROFILES } from './profiles';
import type { VesselModelProps } from './Beaker';

const R = 0.042;
const BULB_MAX = 2.5; // radians swept from the bottom of the bulb

const flaskGeometry = lazy(() => {
  const pts: Vector2[] = [];
  for (let i = 0; i <= 18; i++) {
    const phi = (i / 18) * BULB_MAX;
    pts.push(new Vector2(R * Math.sin(phi), R - R * Math.cos(phi)));
  }
  pts.push(new Vector2(0.0155, 0.095), new Vector2(0.0095, 0.112), new Vector2(0.0088, 0.17), new Vector2(0.0102, 0.173), new Vector2(0.0098, 0.173));
  return new LatheGeometry(pts, 32);
});

export function VolumetricFlask({ modelUrl, look, itemId, ...props }: VesselModelProps) {
  const glass = useGlass('#eef8fb');
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={flaskGeometry()} material={glass} renderOrder={1} castShadow />
      <mesh material={plastic('#20252b', 0.6)} position={[0, 0.14, 0]} userData={{ noOutline: true }}>
        <cylinderGeometry args={[0.0092, 0.0092, 0.0008, 18]} />
      </mesh>
      {look && <VesselContents profile={PROFILES.volumetricFlask} look={look} itemId={itemId} />}
    </ModelOr>
  );
}
