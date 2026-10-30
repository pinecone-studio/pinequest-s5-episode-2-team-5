/** Ceiling at 3.2 m: an acoustic-tile plane over the lab footprint. */
import { useMemo } from 'react';
import { MeshStandardMaterial, RepeatWrapping } from 'three';
import { WALL_HEIGHT } from '../../utils/constants';
import { ceilingTexture } from '../../utils/textures';
import { LAB } from '../../materials/labPalette';
import { LAB_BOUNDS } from '../layout';

function CeilingPlane({ x0, x1, z0, z1 }: { x0: number; x1: number; z0: number; z1: number }) {
  const material = useMemo(() => {
    const map = ceilingTexture().clone();
    map.wrapS = RepeatWrapping;
    map.wrapT = RepeatWrapping;
    map.repeat.set((x1 - x0) / 0.6, (z1 - z0) / 0.6);
    map.needsUpdate = true;
    return new MeshStandardMaterial({ map, color: LAB.ceilingTint, roughness: 0.95 });
  }, [x0, x1, z0, z1]);
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, WALL_HEIGHT, (z0 + z1) / 2]} material={material}>
      <planeGeometry args={[x1 - x0, z1 - z0]} />
    </mesh>
  );
}

export function Ceiling() {
  return (
    <CeilingPlane x0={LAB_BOUNDS.minX - 0.1} x1={LAB_BOUNDS.maxX + 0.1} z0={LAB_BOUNDS.minZ - 0.1} z1={LAB_BOUNDS.maxZ + 0.1} />
  );
}
