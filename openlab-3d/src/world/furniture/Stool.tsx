/**
 * Lab stools (seat Ø 0.36 m at 0.62 m, chrome column, foot ring, 5-star base),
 * drawn as one InstancedMesh per part for all stools passed in. Each stool gets a
 * cylinder collider so the player walks around it.
 */
import { useLayoutEffect, useRef } from 'react';
import { CylinderCollider } from '@react-three/rapier';
import { BoxGeometry, CylinderGeometry, InstancedMesh, Object3D, TorusGeometry, type BufferGeometry, type Material } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { metalChrome, metalDark } from '../../materials/metal';
import { plastic } from '../../materials/plastic';
import { lazy } from '../../utils/lazy';
import { Interactable } from '../../interaction/Interactable';
import { playerApi } from '../../store/useGameStore';

const seatGeo = lazy(() => {
  const g = new CylinderGeometry(0.18, 0.17, 0.06, 28);
  g.translate(0, 0.62, 0);
  return g;
});
const chromeGeo = lazy(() => {
  const column = new CylinderGeometry(0.022, 0.022, 0.5, 12);
  column.translate(0, 0.34, 0);
  const ring = new TorusGeometry(0.17, 0.008, 8, 32);
  ring.rotateX(Math.PI / 2);
  ring.translate(0, 0.3, 0);
  return mergeGeometries([column.toNonIndexed(), ring.toNonIndexed()], false) ?? column;
});
const baseGeo = lazy(() => {
  const legs: BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const leg = new BoxGeometry(0.03, 0.03, 0.24);
    leg.translate(0, 0.06, 0.12);
    leg.rotateY((i / 5) * Math.PI * 2);
    legs.push(leg);
  }
  const hub = new CylinderGeometry(0.04, 0.05, 0.06, 12);
  hub.translate(0, 0.07, 0);
  legs.push(hub);
  for (let i = 0; i < 5; i++) {
    const foot = new CylinderGeometry(0.018, 0.018, 0.045, 8);
    foot.translate(0, 0.022, 0.23);
    foot.rotateY((i / 5) * Math.PI * 2);
    legs.push(foot);
  }
  return mergeGeometries(legs.map((g) => g.toNonIndexed()), false) ?? hub;
});

function Part({ geometry, material, positions }: { geometry: BufferGeometry; material: Material; positions: [number, number][] }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const d = new Object3D();
    positions.forEach(([x, z], i) => {
      d.position.set(x, 0, z);
      d.rotation.y = i * 0.9;
      d.updateMatrix();
      ref.current?.setMatrixAt(i, d.matrix);
    });
    if (ref.current) {
      ref.current.instanceMatrix.needsUpdate = true;
      ref.current.computeBoundingSphere();
    }
  }, [positions]);
  return <instancedMesh ref={ref} args={[geometry, material, positions.length]} castShadow receiveShadow />;
}

export function Stools({ positions, color = '#2b3036' }: { positions: [number, number][]; color?: string }) {
  if (positions.length === 0) return null;
  return (
    <group>
      <Part geometry={seatGeo()} material={plastic(color, 0.5)} positions={positions} />
      <Part geometry={chromeGeo()} material={metalChrome} positions={positions} />
      <Part geometry={baseGeo()} material={metalDark} positions={positions} />
      {positions.map(([x, z], i) => (
        <group key={i}>
          <CylinderCollider args={[0.33, 0.2]} position={[x, 0.33, z]} />
          <Interactable id={`lab-stool-${i}-${x}-${z}`} label="Лабораторийн сандал" verb="суух / босох" highlight="none" onInteract={() => playerApi.toggleSeat(x, z + 0.36)}>
            <mesh position={[x, 0.64, z]}>
              <cylinderGeometry args={[0.19, 0.19, 0.07, 16]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </Interactable>
        </group>
      ))}
    </group>
  );
}
