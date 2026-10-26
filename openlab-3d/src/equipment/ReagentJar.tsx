/** Wide-mouth glass jar (Ø 64 × 95 mm) with a white screw cap and label; the solid inside is visible. */
import { useMemo } from 'react';
import { LatheGeometry, MeshStandardMaterial, Vector2 } from 'three';
import { useGlass } from '../materials/glass';
import { plastic } from '../materials/plastic';
import { labelTexture } from '../utils/textures';
import { lazy } from '../utils/lazy';
import { CATALOG } from './equipmentCatalog';
import { ModelOr } from './ModelOr';
import { VesselContents } from './VesselContents';
import { PROFILES } from './profiles';
import type { VesselModelProps } from './Beaker';

const jarGeometry = lazy(() => new LatheGeometry([new Vector2(0, 0), new Vector2(0.03, 0), new Vector2(0.032, 0.004), new Vector2(0.032, 0.083), new Vector2(0.028, 0.085), new Vector2(0.0275, 0.083), new Vector2(0.0302, 0.081), new Vector2(0.0302, 0.005), new Vector2(0, 0.004)], 28));

export function ReagentJar({ modelUrl, open=false, look, itemId, label = '?', name, stripe = '#64748b', ...props }: VesselModelProps & { open?:boolean; label?: string; name?: string; stripe?: string }) {
  const glass = useGlass('#f4fbfd');
  const labelMat = useMemo(() => new MeshStandardMaterial({ map: labelTexture(label, stripe, name, CATALOG.reagentJar.capacityMl), roughness: 0.7 }), [label, name, stripe]);
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={jarGeometry()} material={glass} renderOrder={1} castShadow />
      {!open&&<mesh material={plastic('#f3f4f6', 0.45)} position={[0, 0.0915, 0]} castShadow>
        <cylinderGeometry args={[0.031, 0.031, 0.015, 24]} />
      </mesh>}
      <mesh material={labelMat} renderOrder={4} userData={{ noOutline: true, noBatch: true }} position={[0, 0.045, 0]} rotation={[0, Math.PI, 0]}>
        <cylinderGeometry args={[0.0323, 0.0323, 0.038, 24, 1, true, Math.PI * 0.62, Math.PI * 0.76]} />
      </mesh>
      {look && <VesselContents profile={PROFILES.reagentJar} look={look} itemId={itemId} />}
    </ModelOr>
  );
}
