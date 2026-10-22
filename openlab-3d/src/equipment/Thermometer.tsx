/** Spirit thermometer (lying along z): 300 mm × Ø 7 mm glass rod with a red column and bulb. */
import { useLayoutEffect, useRef } from 'react';
import { BoxGeometry, InstancedMesh, MeshStandardMaterial, Object3D } from 'three';
import { useGlass } from '../materials/glass';
import { plastic } from '../materials/plastic';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const red = new MeshStandardMaterial({ color: '#d61f1f', roughness: 0.3, emissive: '#5a0000', emissiveIntensity: 0.4 });
const tick = lazy(() => new BoxGeometry(0.0022, 0.0004, 0.0004));
const TICKS = 24;

export function Thermometer({ modelUrl, temperature = 22, ...props }: ModelProps & { temperature?: number }) {
  const glass = useGlass('#f3f9fb');
  const ticks = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const d = new Object3D();
    for (let i = 0; i < TICKS; i++) {
      d.position.set(0.0036, 0.03 + i * 0.011, 0);
      d.scale.set(i % 5 === 0 ? 1.8 : 1, 1, 1);
      d.updateMatrix();
      ticks.current?.setMatrixAt(i, d.matrix);
    }
    if (ticks.current) {
      ticks.current.instanceMatrix.needsUpdate = true;
      ticks.current.computeBoundingSphere();
    }
  }, []);
  const column = 0.03 + ((Math.min(110, Math.max(-10, temperature)) + 10) / 120) * 0.26;
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0.0045, -0.15]}>
        <mesh material={glass} position={[0, 0.15, 0]} renderOrder={1} castShadow>
          <cylinderGeometry args={[0.0036, 0.0036, 0.3, 14]} />
        </mesh>
        <mesh material={red} position={[0, 0.008, 0]} userData={{ noOutline: true }}>
          <sphereGeometry args={[0.0032, 12, 10]} />
        </mesh>
        <mesh material={red} position={[0, column / 2, 0]} userData={{ noOutline: true, noBatch: true }}>
          <cylinderGeometry args={[0.0008, 0.0008, column, 6]} />
        </mesh>
        <mesh material={plastic('#f8fafc', 0.5)} position={[0, 0.302, 0]}>
          <sphereGeometry args={[0.0038, 10, 8]} />
        </mesh>
        <instancedMesh ref={ticks} args={[tick(), plastic('#111827', 0.6), TICKS]} userData={{ noOutline: true }} />
      </group>
    </ModelOr>
  );
}
