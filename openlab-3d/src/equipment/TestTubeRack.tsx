/**
 * Two-tier polypropylene test-tube rack (200 × 70 × 90 mm) with six holes. The tubes in it
 * are real items (see StoredItems); `decorative` draws six empty tubes for thumbnails.
 */
import { useLayoutEffect, useRef } from 'react';
import { BoxGeometry, InstancedMesh, Object3D } from 'three';
import { plastic } from '../materials/plastic';
import { useGlass } from '../materials/glass';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';
import { testTubeGeometry } from './TestTube';

const W = 0.2;
const D = 0.07;
const plate = lazy(() => new BoxGeometry(W, 0.006, D));
const leg = lazy(() => new BoxGeometry(0.006, 0.09, D));

/** Tube positions (bottom center) in the rack's local frame. */
export const RACK_SLOTS: [number, number, number][] = Array.from({ length: 6 }, (_, i) => [-W / 2 + 0.025 + i * ((W - 0.05) / 5), 0.007, 0]);

export function TestTubeRack({ modelUrl, decorative = false, ...props }: ModelProps & { decorative?: boolean }) {
  const glass = useGlass('#eef8fb');
  const tubeRef = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = tubeRef.current;
    if (!m) return;
    const d = new Object3D();
    RACK_SLOTS.forEach(([x, y, z], i) => {
      d.position.set(x, y, z);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [decorative]);
  const rackMat = plastic('#f4f4f0', 0.55);
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={plate()} material={rackMat} position={[0, 0.003, 0]} receiveShadow />
      <mesh geometry={plate()} material={rackMat} position={[0, 0.045, 0]} castShadow />
      <mesh geometry={plate()} material={rackMat} position={[0, 0.085, 0]} castShadow />
      <mesh geometry={leg()} material={rackMat} position={[-W / 2 + 0.003, 0.045, 0]} />
      <mesh geometry={leg()} material={rackMat} position={[W / 2 - 0.003, 0.045, 0]} />
      {decorative && <instancedMesh ref={tubeRef} args={[testTubeGeometry(), glass, RACK_SLOTS.length]} renderOrder={1} />}
    </ModelOr>
  );
}
