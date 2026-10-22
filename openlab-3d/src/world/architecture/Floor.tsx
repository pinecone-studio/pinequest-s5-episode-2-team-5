/**
 * Floor: vinyl tiles (0.6 m, #d9dcdf) over the building footprint, grass outside, and
 * one large static collider slab (top at y = 0).
 */
import { useMemo } from 'react';
import { CuboidCollider } from '@react-three/rapier';
import { MeshStandardMaterial, RepeatWrapping } from 'three';
import { floorTexture, groundTexture } from '../../utils/textures';

const TILE_REPEAT = 1.2;

function TiledFloor({ x0, x1, z0, z1 }: { x0: number; x1: number; z0: number; z1: number }) {
  const material = useMemo(() => {
    const map = floorTexture().clone();
    map.wrapS = RepeatWrapping;
    map.wrapT = RepeatWrapping;
    map.repeat.set((x1 - x0) / TILE_REPEAT, (z1 - z0) / TILE_REPEAT);
    map.needsUpdate = true;
    return new MeshStandardMaterial({ map, color: '#ffffff', roughness: 0.62, metalness: 0 });
  }, [x0, x1, z0, z1]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, 0, (z0 + z1) / 2]} material={material} receiveShadow>
      <planeGeometry args={[x1 - x0, z1 - z0]} />
    </mesh>
  );
}

export function Floor() {
  const grass = useMemo(() => {
    const map = groundTexture().clone();
    map.wrapS = RepeatWrapping;
    map.wrapT = RepeatWrapping;
    map.repeat.set(120, 120);
    map.needsUpdate = true;
    return new MeshStandardMaterial({ map, roughness: 1 });
  }, []);
  return (
    <group>
      {/* Building footprint: north block (labs + hall + corridor) and south-west block (biology). */}
      <TiledFloor x0={-20.1} x1={20.1} z0={-15.1} z1={1.1} />
      <TiledFloor x0={-20.1} x1={6.1} z0={1.1} z1={15.1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} material={grass}>
        <circleGeometry args={[160, 48]} />
      </mesh>
      <CuboidCollider args={[40, 0.25, 40]} position={[0, -0.25, 0]} />
    </group>
  );
}
