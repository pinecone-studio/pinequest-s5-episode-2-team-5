/** Glass funnel: Ø 75 mm cone narrowing to a 55 mm stem (origin at the stem tip). */
import { LatheGeometry, Vector2 } from 'three';
import { useGlass } from '../materials/glass';
import { plastic } from '../materials/plastic';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const funnelGeometry = lazy(
  () =>
    new LatheGeometry(
      [
        new Vector2(0.0042, 0),
        new Vector2(0.0042, 0.055),
        new Vector2(0.0375, 0.105),
        new Vector2(0.0385, 0.112),
        new Vector2(0.0365, 0.112),
        new Vector2(0.0355, 0.107),
        new Vector2(0.0028, 0.055),
        new Vector2(0.0028, 0),
      ],
      28,
    ),
);

export function Funnel({ modelUrl, residue, ...props }: ModelProps & { residue?: string }) {
  const glass = useGlass('#eef8fb');
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={funnelGeometry()} material={glass} renderOrder={1} castShadow />
      {/* Folded filter paper, stained by the last residue. */}
      <mesh material={plastic('#f7f5ef', 0.95)} position={[0, 0.085, 0]} rotation={[Math.PI, 0, 0]} userData={{ noOutline: true }}>
        <coneGeometry args={[0.03, 0.045, 16, 1, true]} />
      </mesh>
      {residue && (
        <mesh material={plastic(residue, 0.9)} position={[0, 0.07, 0]} rotation={[Math.PI, 0, 0]} userData={{ noOutline: true, noBatch: true }}>
          <coneGeometry args={[0.012, 0.016, 12]} />
        </mesh>
      )}
    </ModelOr>
  );
}
