/** Glass funnel: Ø 75 mm cone narrowing to a 55 mm stem (origin at the stem tip). */
import { LatheGeometry, Vector2 } from 'three';
import { useGlass } from '../materials/glass';
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

export function Funnel({ modelUrl, ...props }: ModelProps) {
  const glass = useGlass('#eef8fb');
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={funnelGeometry()} material={glass} renderOrder={1} castShadow />
    </ModelOr>
  );
}
