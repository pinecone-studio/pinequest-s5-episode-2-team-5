/** Petri dish: Ø 90 mm glass dish with a loose lid and an optional shallow liquid layer. */
import { LatheGeometry, Vector2 } from 'three';
import { useGlass } from '../materials/glass';
import { lazy } from '../utils/lazy';
import { ModelOr } from './ModelOr';
import { VesselContents } from './VesselContents';
import { PROFILES } from './profiles';
import type { VesselModelProps } from './Beaker';

const dishGeometry = lazy(
  () => new LatheGeometry([new Vector2(0, 0), new Vector2(0.044, 0), new Vector2(0.045, 0.001), new Vector2(0.045, 0.014), new Vector2(0.0438, 0.014), new Vector2(0.0438, 0.0025), new Vector2(0, 0.0025)], 36),
);
const lidGeometry = lazy(
  () => new LatheGeometry([new Vector2(0, 0.0185), new Vector2(0.0465, 0.0185), new Vector2(0.0465, 0.0105), new Vector2(0.0457, 0.0105), new Vector2(0.0457, 0.0177), new Vector2(0, 0.0177)], 36),
);

export function PetriDish({ modelUrl, look, itemId, ...props }: VesselModelProps) {
  const glass = useGlass('#eef8fb');
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={dishGeometry()} material={glass} renderOrder={1} castShadow />
      {/* The lid leans beside the dish so the contents stay visible. */}
      <mesh geometry={lidGeometry()} material={glass} renderOrder={1} position={[0.05, 0.004, 0]} rotation={[0, 0, -0.18]} />
      {look && <VesselContents profile={PROFILES.petriDish} look={look} itemId={itemId} />}
    </ModelOr>
  );
}
