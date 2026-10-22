/** Small fixtures: safety posters (CanvasTexture planes) and a pedal waste bin. */
import { useMemo } from 'react';
import { CylinderCollider } from '@react-three/rapier';
import { MeshStandardMaterial } from 'three';
import { posterTexture, type PosterSpec } from '../../utils/textures';
import { plastic } from '../../materials/plastic';
import { metalAluminum, metalBrushed } from '../../materials/metal';

/** Wall poster 0.5 m × 0.7 m (A2-ish). Origin at wall surface, facing +z. */
export function Poster({ position, rotY = 0, spec, scale = 1 }: { position: [number, number, number]; rotY?: number; spec: PosterSpec; scale?: number }) {
  const material = useMemo(() => new MeshStandardMaterial({ map: posterTexture(spec), roughness: 0.8 }), [spec]);
  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale}>
      <mesh material={material} position={[0, 0, 0.004]}>
        <planeGeometry args={[0.5, 0.707]} />
      </mesh>
      <mesh material={metalAluminum} position={[0, 0, 0.001]}>
        <boxGeometry args={[0.52, 0.727, 0.004]} />
      </mesh>
    </group>
  );
}

/** Pedal waste bin Ø 0.3 m × 0.5 m. */
export function WasteBin({ position, color = '#9ca3af' }: { position: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      <mesh material={plastic(color, 0.5)} position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.13, 0.5, 20]} />
      </mesh>
      <mesh material={metalBrushed} position={[0, 0.505, 0]}>
        <cylinderGeometry args={[0.152, 0.152, 0.02, 20]} />
      </mesh>
      <CylinderCollider args={[0.26, 0.16]} position={[0, 0.26, 0]} />
    </group>
  );
}
