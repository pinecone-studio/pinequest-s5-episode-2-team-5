/**
 * 30 mL clear dropper bottle (Ø 34 × 100 mm) with a black dropper cap, rubber bulb and label.
 * The glass is clear so the solution inside shows its true color wherever the bottle stands.
 */
import { useMemo } from 'react';
import { LatheGeometry, MeshStandardMaterial, Vector2 } from 'three';
import type { MixtureLook } from '../chemistry/color';
import { decorGlass, useGlass } from '../materials/glass';
import { plastic, plasticBlack } from '../materials/plastic';
import { labelTexture } from '../utils/textures';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';
import { VesselContents } from './VesselContents';
import { PROFILES } from './profiles';

const bodyGeometry = lazy(() => new LatheGeometry([new Vector2(0, 0), new Vector2(0.016, 0), new Vector2(0.017, 0.004), new Vector2(0.017, 0.05), new Vector2(0.013, 0.06), new Vector2(0.008, 0.064), new Vector2(0.008, 0.068), new Vector2(0, 0.068)], 24));

export function DropperBottle({ modelUrl, look, decorative, label = '?', name, stripe = '#f59e0b', ...props }: ModelProps & { look?: MixtureLook; decorative?: boolean; label?: string; name?: string; stripe?: string }) {
  const labelMat = useMemo(() => new MeshStandardMaterial({ map: labelTexture(label, stripe, name), roughness: 0.7 }), [label, name, stripe]);
  const glass = useGlass('#f4fbfd');
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={bodyGeometry()} material={decorative ? decorGlass('#f4fbfd') : glass} renderOrder={1} castShadow />
      {look?.liquid && <VesselContents profile={PROFILES.dropperBottle} look={look} />}
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
