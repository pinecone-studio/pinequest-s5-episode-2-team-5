/** 30 mL amber dropper bottle (Ø 34 × 100 mm) with a black dropper cap, rubber bulb and label. */
import { useMemo } from 'react';
import { LatheGeometry, MeshPhysicalMaterial, MeshStandardMaterial, Vector2 } from 'three';
import { plastic, plasticBlack } from '../materials/plastic';
import { labelTexture } from '../utils/textures';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const amber = new MeshPhysicalMaterial({ color: '#7a3e0c', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.92 });
const bodyGeometry = lazy(() => new LatheGeometry([new Vector2(0, 0), new Vector2(0.016, 0), new Vector2(0.017, 0.004), new Vector2(0.017, 0.05), new Vector2(0.013, 0.06), new Vector2(0.008, 0.064), new Vector2(0.008, 0.068), new Vector2(0, 0.068)], 24));

export function DropperBottle({ modelUrl, label = '?', name, stripe = '#f59e0b', ...props }: ModelProps & { label?: string; name?: string; stripe?: string }) {
  const labelMat = useMemo(() => new MeshStandardMaterial({ map: labelTexture(label, stripe, name), roughness: 0.7 }), [label, name, stripe]);
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={bodyGeometry()} material={amber} castShadow />
      <mesh material={plasticBlack} position={[0, 0.074, 0]} castShadow>
        <cylinderGeometry args={[0.0095, 0.0095, 0.014, 16]} />
      </mesh>
      <mesh material={plastic('#262a30', 0.7)} position={[0, 0.09, 0]} castShadow>
        <capsuleGeometry args={[0.0068, 0.012, 4, 12]} />
      </mesh>
      <mesh material={labelMat} position={[0, 0.028, 0]} rotation={[0, Math.PI, 0]}>
        <cylinderGeometry args={[0.0172, 0.0172, 0.03, 20, 1, true, Math.PI * 0.6, Math.PI * 0.8]} />
      </mesh>
    </ModelOr>
  );
}
