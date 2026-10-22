/**
 * Two-tier polypropylene test-tube rack (200 × 70 × 90 mm) holding six 16 mm tubes.
 * The tubes and their liquids are instanced.
 */
import { useLayoutEffect, useRef } from 'react';
import { BoxGeometry, Color, InstancedMesh, Object3D } from 'three';
import { plastic } from '../materials/plastic';
import { useGlass } from '../materials/glass';
import { liquidMaterial } from '../materials/liquids';
import { useTransmission } from '../materials/glass';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';
import { liquidTubeGeometry, testTubeGeometry } from './TestTube';

const W = 0.2;
const D = 0.07;
const plate = lazy(() => new BoxGeometry(W, 0.006, D));
const leg = lazy(() => new BoxGeometry(0.006, 0.09, D));
const tubeLiquid = lazy(() => liquidTubeGeometry(0.07));
const COLORS = ['#e2363c', '#f5c400', '#33c46a', '#2f7ff0', '#8b4fd8', '#ff7a1a'];

export function TestTubeRack({ modelUrl, tubes = 6, ...props }: ModelProps & { tubes?: number }) {
  const glass = useGlass('#eef8fb');
  const transmission = useTransmission();
  const tubeRef = useRef<InstancedMesh>(null);
  const liquidRef = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const d = new Object3D();
    for (let i = 0; i < tubes; i++) {
      d.position.set(-W / 2 + 0.025 + i * ((W - 0.05) / 5), 0.012, 0);
      d.updateMatrix();
      tubeRef.current?.setMatrixAt(i, d.matrix);
      d.scale.set(1, 0.8 + ((i * 3) % 4) * 0.15, 1);
      d.updateMatrix();
      liquidRef.current?.setMatrixAt(i, d.matrix);
      liquidRef.current?.setColorAt(i, new Color(COLORS[i % COLORS.length]));
      d.scale.set(1, 1, 1);
    }
    for (const m of [tubeRef.current, liquidRef.current]) {
      if (!m) continue;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }, [tubes]);
  const rackMat = plastic('#f4f4f0', 0.55);
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={plate()} material={rackMat} position={[0, 0.003, 0]} receiveShadow />
      <mesh geometry={plate()} material={rackMat} position={[0, 0.045, 0]} castShadow />
      <mesh geometry={plate()} material={rackMat} position={[0, 0.085, 0]} castShadow />
      <mesh geometry={leg()} material={rackMat} position={[-W / 2 + 0.003, 0.045, 0]} />
      <mesh geometry={leg()} material={rackMat} position={[W / 2 - 0.003, 0.045, 0]} />
      <instancedMesh ref={tubeRef} args={[testTubeGeometry(), glass, tubes]} renderOrder={1} />
      <instancedMesh ref={liquidRef} args={[tubeLiquid(), liquidMaterial('#ffffff', transmission), tubes]} userData={{ noOutline: true }} />
    </ModelOr>
  );
}
