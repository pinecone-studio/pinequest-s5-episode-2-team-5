/** Polyethylene wash bottle (Ø 65 mm × 190 mm) with a bent delivery nozzle, labelled with its contents. */
import { useMemo } from 'react';
import { LatheGeometry, MeshStandardMaterial, Vector2 } from 'three';
import { plastic } from '../materials/plastic';
import { labelTexture } from '../utils/textures';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const bodyGeometry = lazy(
  () =>
    new LatheGeometry(
      [new Vector2(0, 0), new Vector2(0.03, 0), new Vector2(0.0325, 0.006), new Vector2(0.0325, 0.1), new Vector2(0.026, 0.13), new Vector2(0.013, 0.145), new Vector2(0.011, 0.15), new Vector2(0, 0.15)],
      28,
    ),
);

export function WashBottle({ modelUrl, label = 'H₂O', name = 'Нэрмэл ус', ...props }: ModelProps & { label?: string; name?: string }) {
  const labelMat = useMemo(() => new MeshStandardMaterial({ map: labelTexture(label, '#2f86e0', name), roughness: 0.7 }), [label, name]);
  const body = plastic('#f1f4f7', 0.45);
  const cap = plastic('#2f86e0', 0.5);
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={bodyGeometry()} material={body} castShadow />
      <mesh material={cap} position={[0, 0.158, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.014, 0.016, 16]} />
      </mesh>
      <mesh material={cap} position={[0.012, 0.185, 0]} rotation={[0, 0, -0.9]} castShadow>
        <cylinderGeometry args={[0.0035, 0.005, 0.04, 10]} />
      </mesh>
      <mesh material={cap} position={[0.03, 0.2, 0]} rotation={[0, 0, -1.45]}>
        <cylinderGeometry args={[0.002, 0.0035, 0.03, 10]} />
      </mesh>
      <mesh material={labelMat} position={[0, 0.06, 0]} rotation={[0, Math.PI, 0]}>
        <cylinderGeometry args={[0.0328, 0.0328, 0.06, 24, 1, true, Math.PI * 0.6, Math.PI * 0.8]} />
      </mesh>
    </ModelOr>
  );
}
