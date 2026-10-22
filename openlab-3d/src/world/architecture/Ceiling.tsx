/** Ceiling at 3.2 m: acoustic-tile planes over the building footprint (not over the courtyard). */
import { useMemo } from 'react';
import { MeshStandardMaterial, RepeatWrapping } from 'three';
import { WALL_HEIGHT } from '../../utils/constants';
import { ceilingTexture } from '../../utils/textures';

function CeilingPlane({ x0, x1, z0, z1 }: { x0: number; x1: number; z0: number; z1: number }) {
  const material = useMemo(() => {
    const map = ceilingTexture().clone();
    map.wrapS = RepeatWrapping;
    map.wrapT = RepeatWrapping;
    map.repeat.set((x1 - x0) / 0.6, (z1 - z0) / 0.6);
    map.needsUpdate = true;
    return new MeshStandardMaterial({ map, roughness: 0.95 });
  }, [x0, x1, z0, z1]);
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, WALL_HEIGHT, (z0 + z1) / 2]} material={material}>
      <planeGeometry args={[x1 - x0, z1 - z0]} />
    </mesh>
  );
}

export function Ceiling() {
  return (
    <group>
      <CeilingPlane x0={-20.1} x1={20.1} z0={-15.1} z1={1.1} />
      <CeilingPlane x0={-20.1} x1={6.1} z0={1.1} z1={15.1} />
    </group>
  );
}
