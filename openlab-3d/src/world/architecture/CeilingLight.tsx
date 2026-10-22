/**
 * Recessed LED ceiling panels (1.2 m × 0.6 m) as a single InstancedMesh.
 * They are emissive but stay below the bloom threshold, so only LEDs/screens glow.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, InstancedMesh, MeshStandardMaterial, Object3D } from 'three';
import { WALL_HEIGHT } from '../../utils/constants';
import { ROOMS } from '../layout';

const panelGeometry = new BoxGeometry(1.2, 0.03, 0.6);
const panelMaterial = new MeshStandardMaterial({ color: '#000000', emissive: '#fbfdff', emissiveIntensity: 0.95, roughness: 1 });
const frameGeometry = new BoxGeometry(1.26, 0.025, 0.66);
const frameMaterial = new MeshStandardMaterial({ color: '#d6dade', roughness: 0.5, metalness: 0.3 });

export function ceilingLightPositions(): [number, number][] {
  const out: [number, number][] = [];
  for (const room of ROOMS) {
    const { minX, maxX, minZ, maxZ } = room.bounds;
    const w = maxX - minX;
    const d = maxZ - minZ;
    const nx = Math.max(1, Math.round(w / 3.2));
    const nz = Math.max(1, Math.round(d / 3));
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        out.push([minX + (w * (i + 0.5)) / nx, minZ + (d * (j + 0.5)) / nz]);
      }
    }
  }
  return out;
}

export function CeilingLights() {
  const positions = useMemo(ceilingLightPositions, []);
  const panels = useRef<InstancedMesh>(null);
  const frames = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    positions.forEach(([x, z], i) => {
      dummy.position.set(x, WALL_HEIGHT - 0.016, z);
      dummy.updateMatrix();
      panels.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.y = WALL_HEIGHT - 0.01;
      dummy.updateMatrix();
      frames.current?.setMatrixAt(i, dummy.matrix);
    });
    if (panels.current) panels.current.instanceMatrix.needsUpdate = true;
    if (frames.current) frames.current.instanceMatrix.needsUpdate = true;
    panels.current?.computeBoundingSphere();
    frames.current?.computeBoundingSphere();
  }, [positions]);
  return (
    <group>
      <instancedMesh ref={frames} args={[frameGeometry, frameMaterial, positions.length]} frustumCulled={false} />
      <instancedMesh ref={panels} args={[panelGeometry, panelMaterial, positions.length]} frustumCulled={false} />
    </group>
  );
}
