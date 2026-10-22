/** Petri dish: Ø 90 mm glass dish with a loose lid and an optional shallow liquid layer. */
import { LatheGeometry, Vector2 } from 'three';
import { useGlass } from '../materials/glass';
import { useLiquid } from '../materials/liquids';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const dishGeometry = lazy(
  () => new LatheGeometry([new Vector2(0, 0), new Vector2(0.044, 0), new Vector2(0.045, 0.001), new Vector2(0.045, 0.014), new Vector2(0.0438, 0.014), new Vector2(0.0438, 0.0025), new Vector2(0, 0.0025)], 36),
);
const lidGeometry = lazy(
  () => new LatheGeometry([new Vector2(0, 0.0185), new Vector2(0.0465, 0.0185), new Vector2(0.0465, 0.0105), new Vector2(0.0457, 0.0105), new Vector2(0.0457, 0.0177), new Vector2(0, 0.0177)], 36),
);

export function PetriDish({ modelUrl, liquidColor = '#b9def5', fill = 0, ...props }: ModelProps & { liquidColor?: string; fill?: number }) {
  const glass = useGlass('#eef8fb');
  const liquid = useLiquid(liquidColor);
  const level = Math.min(1, fill) * 0.0095;
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={dishGeometry()} material={glass} renderOrder={1} castShadow />
      <mesh geometry={lidGeometry()} material={glass} renderOrder={1} />
      {level > 0.0005 && (
        <mesh material={liquid} position={[0, 0.0025 + level / 2, 0]} userData={{ noOutline: true, noBatch: true }}>
          <cylinderGeometry args={[0.0432, 0.0432, level, 32]} />
        </mesh>
      )}
    </ModelOr>
  );
}
