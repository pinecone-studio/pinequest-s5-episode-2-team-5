/**
 * Reagent bottles:
 *  - <ReagentBottle>: 250 mL amber glass bottle (Ø 65 mm × 140 mm) with a black screw cap
 *    and a printed label.
 *  - <CreamBottle>: small cream plastic dropper bottle (Ø 44 mm × 85 mm) for atomizer oil.
 */
import { useMemo } from 'react';
import { LatheGeometry, MeshPhysicalMaterial, MeshStandardMaterial, Vector2 } from 'three';
import { plastic, plasticBlack } from '../materials/plastic';
import { labelTexture } from '../utils/textures';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const amberGlass = new MeshPhysicalMaterial({ color: '#7a3e0c', roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.92 });

const bottleGeometry = lazy(() => {
  const pts = [new Vector2(0, 0), new Vector2(0.03, 0), new Vector2(0.0325, 0.006), new Vector2(0.0325, 0.096), new Vector2(0.028, 0.11), new Vector2(0.016, 0.12), new Vector2(0.0135, 0.122), new Vector2(0.0135, 0.13), new Vector2(0, 0.13)];
  return new LatheGeometry(pts, 32);
});
const creamGeometry = lazy(() => {
  const pts = [new Vector2(0, 0), new Vector2(0.02, 0), new Vector2(0.022, 0.004), new Vector2(0.022, 0.055), new Vector2(0.018, 0.064), new Vector2(0.009, 0.068), new Vector2(0.009, 0.072), new Vector2(0, 0.072)];
  return new LatheGeometry(pts, 28);
});
const nozzleGeometry = lazy(() => {
  const pts = [new Vector2(0, 0.0), new Vector2(0.008, 0.0), new Vector2(0.006, 0.006), new Vector2(0.0018, 0.016), new Vector2(0, 0.0175)];
  return new LatheGeometry(pts, 16);
});

const STRIPES: Record<string, string> = { HCl: '#dc2626', NaOH: '#2563eb', 'CuSO₄': '#0ea5e9', NaCl: '#16a34a' };

export function ReagentBottle({ modelUrl, label = 'NaCl', ...props }: ModelProps & { label?: string }) {
  const labelMat = useMemo(() => new MeshStandardMaterial({ map: labelTexture(label, STRIPES[label] ?? '#f59e0b'), roughness: 0.7 }), [label]);
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={bottleGeometry()} material={amberGlass} castShadow />
      <mesh material={plasticBlack} position={[0, 0.137, 0]} castShadow>
        <cylinderGeometry args={[0.016, 0.016, 0.022, 20]} />
      </mesh>
      <mesh material={labelMat} position={[0, 0.055, 0]} rotation={[0, Math.PI, 0]}>
        <cylinderGeometry args={[0.0328, 0.0328, 0.05, 24, 1, true, Math.PI * 0.6, Math.PI * 0.8]} />
      </mesh>
    </ModelOr>
  );
}

export function CreamBottle({ modelUrl, ...props }: ModelProps) {
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={creamGeometry()} material={plastic('#efe3c2', 0.55)} castShadow />
      <mesh geometry={nozzleGeometry()} material={plastic('#f6efdd', 0.5)} position={[0, 0.072, 0]} />
      <mesh material={plastic('#b45309', 0.5)} position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.0222, 0.0222, 0.012, 24, 1, true]} />
      </mesh>
    </ModelOr>
  );
}
