/** Wall whiteboard: 2.4 m × 1.2 m (default) with aluminum frame and a marker tray. */
import { useMemo } from 'react';
import { MeshStandardMaterial, type Texture } from 'three';
import { metalAluminum } from '../../materials/metal';
import { plastic } from '../../materials/plastic';

export function Whiteboard({ position, rotY = 0, width = 2.4, height = 1.2, texture }: { position: [number, number, number]; rotY?: number; width?: number; height?: number; texture: Texture }) {
  const board = useMemo(() => new MeshStandardMaterial({ map: texture, roughness: 0.25, metalness: 0 }), [texture]);
  const f = 0.03;
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh material={board} position={[0, 0, 0.012]}>
        <planeGeometry args={[width, height]} />
      </mesh>
      <mesh material={metalAluminum} position={[0, 0, 0.005]}>
        <boxGeometry args={[width + f * 2, height + f * 2, 0.012]} />
      </mesh>
      <mesh material={metalAluminum} position={[0, -height / 2 - f, 0.04]}>
        <boxGeometry args={[width * 0.6, 0.02, 0.07]} />
      </mesh>
      {['#1d4ed8', '#dc2626', '#16a34a', '#111827'].map((c, i) => (
        <mesh key={c} material={plastic(c, 0.4)} position={[-0.3 + i * 0.16, -height / 2 - f + 0.018, 0.05]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.009, 0.009, 0.13, 10]} />
        </mesh>
      ))}
    </group>
  );
}
