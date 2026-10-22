/**
 * 100 mL graduated cylinder: Ø 30 mm tube, 250 mm tall, hexagonal plastic foot,
 * pour lip, fine graduation lines (instanced) and a liquid column.
 */
import { useLayoutEffect, useRef } from 'react';
import { BoxGeometry, CylinderGeometry, InstancedMesh, LatheGeometry, Object3D, Vector2 } from 'three';
import { useGlass } from '../materials/glass';
import { useLiquid } from '../materials/liquids';
import { plastic } from '../materials/plastic';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const R = 0.014;
const H = 0.25;
const tube = lazy(() => {
  const pts = [new Vector2(0, 0.012), new Vector2(R, 0.012), new Vector2(R, H - 0.004), new Vector2(R + 0.002, H), new Vector2(R - 0.0015, H), new Vector2(R - 0.0015, 0.0135), new Vector2(0, 0.0135)];
  return new LatheGeometry(pts, 28);
});
const foot = lazy(() => new CylinderGeometry(0.03, 0.032, 0.012, 6));
const tick = lazy(() => new BoxGeometry(0.006, 0.0006, 0.0006));
const N_TICKS = 20;
const markMat = plastic('#20252b', 0.6);

export function GraduatedCylinder({ modelUrl, liquidColor = '#7fd3ff', fill = 0.6, ...props }: ModelProps & { liquidColor?: string; fill?: number }) {
  const glass = useGlass('#eef8fb');
  const liquid = useLiquid(liquidColor);
  const ticks = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const d = new Object3D();
    for (let i = 0; i < N_TICKS; i++) {
      const y = 0.03 + (i / (N_TICKS - 1)) * (H - 0.06);
      d.position.set(0, y, R + 0.0003);
      d.scale.set(i % 5 === 0 ? 2.2 : 1, 1, 1);
      d.updateMatrix();
      ticks.current?.setMatrixAt(i, d.matrix);
    }
    if (ticks.current) {
      ticks.current.instanceMatrix.needsUpdate = true;
      ticks.current.computeBoundingSphere();
    }
  }, []);
  const level = Math.max(0.005, Math.min(0.95, fill) * (H - 0.03));
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={foot()} material={plastic('#2563eb', 0.5)} position={[0, 0.006, 0]} castShadow />
      <mesh geometry={tube()} material={glass} renderOrder={1} castShadow />
      <instancedMesh ref={ticks} args={[tick(), markMat, N_TICKS]} userData={{ noOutline: true }} />
      <mesh material={liquid} position={[0, 0.0135 + level / 2, 0]} userData={{ noOutline: true }}>
        <cylinderGeometry args={[R - 0.0022, R - 0.0022, level, 20]} />
      </mesh>
    </ModelOr>
  );
}
