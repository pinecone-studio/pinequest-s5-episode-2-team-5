/**
 * Reagent bottle: 250 mL amber glass (Ø 65 mm × 140 mm) with a black screw cap and a printed label (stripe color by reagent).
 * Thumbnails (`decorative`) use clear glass so the solution inside shows its real color.
 */
import { useMemo } from 'react';
import { LatheGeometry, MeshPhysicalMaterial, MeshStandardMaterial, Vector2 } from 'three';
import type { MixtureLook } from '../chemistry/color';
import { decorGlass } from '../materials/glass';
import { plasticBlack } from '../materials/plastic';
import { labelTexture } from '../utils/textures';
import { lazy } from '../utils/lazy';
import { CATALOG } from './equipmentCatalog';
import { ModelOr, type ModelProps } from './ModelOr';
import { VesselContents } from './VesselContents';
import { PROFILES } from './profiles';

const amberGlass = new MeshPhysicalMaterial({ color: '#7a3e0c', roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.92 });

const bottleGeometry = lazy(() => {
  const pts = [new Vector2(0, 0), new Vector2(0.03, 0), new Vector2(0.0325, 0.006), new Vector2(0.0325, 0.096), new Vector2(0.028, 0.11), new Vector2(0.016, 0.12), new Vector2(0.0135, 0.122), new Vector2(0.0135, 0.13), new Vector2(0, 0.13)];
  return new LatheGeometry(pts, 32);
});

export function ReagentBottle({ modelUrl, look, decorative, label = '?', name, stripe = '#f59e0b', ...props }: ModelProps & { look?: MixtureLook; decorative?: boolean; label?: string; name?: string; stripe?: string }) {
  const labelMat = useMemo(() => new MeshStandardMaterial({ map: labelTexture(label, stripe, name, CATALOG.reagentBottle.capacityMl), roughness: 0.7 }), [label, name, stripe]);
  const showLiquid = !!decorative && !!look?.liquid;
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={bottleGeometry()} material={showLiquid ? decorGlass('#f4fbfd') : amberGlass} renderOrder={showLiquid ? 1 : 0} castShadow />
      {showLiquid && look && <VesselContents profile={PROFILES.reagentBottle} look={look} />}
      <mesh material={plasticBlack} position={[0, 0.137, 0]} castShadow>
        <cylinderGeometry args={[0.016, 0.016, 0.022, 20]} />
      </mesh>
      <mesh material={labelMat} renderOrder={4} userData={{ noOutline: true, noBatch: true }} position={[0, 0.055, 0]} rotation={[0, Math.PI, 0]}>
        <cylinderGeometry args={[0.0328, 0.0328, 0.05, 24, 1, true, Math.PI * 0.6, Math.PI * 0.8]} />
      </mesh>
    </ModelOr>
  );
}
