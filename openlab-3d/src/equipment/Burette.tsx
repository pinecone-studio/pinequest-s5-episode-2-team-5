/**
 * Titration station: a heavy base plate with a chrome rod, a boss-head clamp and a 50 mL
 * burette (graduated glass tube, PTFE stopcock and drawn tip). The tip sits 205 mm above
 * the plate, so an Erlenmeyer flask on the plate catches the drops. The stopcock handle
 * turns with the flow setting and drops fall while it is open.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshPhysicalMaterial, type Mesh } from 'three';
import { useGlass } from '../materials/glass';
import { metalChrome, metalDark } from '../materials/metal';
import { plastic } from '../materials/plastic';
import { GraduationScale } from './GraduationScale';
import { ModelOr } from './ModelOr';
import { VesselContents } from './VesselContents';
import { PROFILES } from './profiles';
import type { VesselModelProps } from './Beaker';

export const BURETTE_TUBE = { x: 0.02, z: 0.025, bottom: 0.24, top: 0.74 };
const dropMaterial = new MeshPhysicalMaterial({ color: '#d8ecfa', transparent: true, opacity: 0.8, roughness: 0.05 });

export function Burette({ modelUrl, look, itemId, flow = 0, dropColor, ...props }: VesselModelProps & { flow?: number; dropColor?: string }) {
  const glass = useGlass('#f2fafc');
  const drop = useRef<Mesh>(null);
  useFrame((state) => {
    const m = drop.current;
    if (!m) return;
    m.visible = flow > 0 && !!look?.liquid;
    if (!m.visible) return;
    const t = (state.clock.elapsedTime * (0.8 + flow * 0.9)) % 1;
    m.position.y = 0.2 - t * 0.06;
    m.scale.setScalar(flow >= 3 ? 1.4 : 1);
    if (dropColor) dropMaterial.color.set(dropColor);
  });
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      {/* Base plate and rod. */}
      <mesh material={metalDark} position={[0, 0.007, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.22, 0.014, 0.14]} />
      </mesh>
      <mesh material={metalChrome} position={[-0.085, 0.37, -0.045]} castShadow>
        <cylinderGeometry args={[0.006, 0.006, 0.72, 12]} />
      </mesh>
      {/* Boss head and clamp arm. */}
      <group position={[0, 0.56, 0]}>
        <mesh material={metalDark} position={[-0.085, 0, -0.045]}>
          <boxGeometry args={[0.024, 0.03, 0.024]} />
        </mesh>
        <mesh material={metalChrome} position={[-0.033, 0, -0.01]} rotation={[0, -0.6, Math.PI / 2]}>
          <cylinderGeometry args={[0.004, 0.004, 0.13, 8]} />
        </mesh>
        <mesh material={plastic('#1f2937', 0.6)} position={[BURETTE_TUBE.x, 0, BURETTE_TUBE.z]}>
          <torusGeometry args={[0.009, 0.003, 8, 18]} />
        </mesh>
      </group>
      {/* Burette tube, stopcock and tip. */}
      <group position={[BURETTE_TUBE.x, 0, BURETTE_TUBE.z]}>
        <mesh material={glass} position={[0, (BURETTE_TUBE.top + BURETTE_TUBE.bottom) / 2, 0]} renderOrder={1} castShadow>
          <cylinderGeometry args={[0.0068, 0.0068, BURETTE_TUBE.top - BURETTE_TUBE.bottom, 16, 1, true]} />
        </mesh>
        <GraduationScale kind="burette" />
        <mesh material={glass} position={[0, 0.232, 0]} renderOrder={1}>
          <cylinderGeometry args={[0.0068, 0.004, 0.016, 12]} />
        </mesh>
        <mesh material={plastic('#e5e7eb', 0.4)} position={[0, 0.222, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.0045, 0.0045, 0.02, 10]} />
        </mesh>
        <mesh material={plastic('#2563eb', 0.5)} position={[0.014, 0.222, 0]} rotation={[flow > 0 ? Math.PI / 2 - flow * 0.35 : 0, 0, 0]} userData={{ dynamic: true }}>
          <boxGeometry args={[0.004, 0.024, 0.006]} />
        </mesh>
        <mesh material={glass} position={[0, 0.209, 0]} renderOrder={1}>
          <cylinderGeometry args={[0.0028, 0.001, 0.022, 10]} />
        </mesh>
        {look && (
          <group position={[0, BURETTE_TUBE.bottom, 0]}>
            <VesselContents profile={PROFILES.burette} look={look} itemId={itemId} />
          </group>
        )}
        <mesh ref={drop} material={dropMaterial} position={[0, 0.2, 0]} visible={false} userData={{ noOutline: true, noBatch: true, dynamic: true }} raycast={() => undefined}>
          <sphereGeometry args={[0.0022, 8, 6]} />
        </mesh>
      </group>
    </ModelOr>
  );
}
