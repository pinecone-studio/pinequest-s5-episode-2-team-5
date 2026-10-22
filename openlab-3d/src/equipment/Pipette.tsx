/** Pasteur pipette (lying along z): 150 mm glass stem with a drawn tip and a 40 mm rubber bulb. */
import { LatheGeometry, Vector2 } from 'three';
import { useGlass } from '../materials/glass';
import { plastic } from '../materials/plastic';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const stem = lazy(() => new LatheGeometry([new Vector2(0.0006, 0), new Vector2(0.0012, 0.004), new Vector2(0.0018, 0.07), new Vector2(0.0035, 0.09), new Vector2(0.0035, 0.15), new Vector2(0.003, 0.15), new Vector2(0.0, 0.15)], 14));
const bulb = lazy(() => {
  const pts: Vector2[] = [new Vector2(0.0, 0.0), new Vector2(0.0048, 0.0)];
  for (let i = 1; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 0.5;
    pts.push(new Vector2(0.0048 + Math.sin(a) * 0.0035, 0.012 + i * 0.002));
  }
  pts.push(new Vector2(0.0083, 0.032), new Vector2(0.007, 0.04), new Vector2(0.0, 0.043));
  return new LatheGeometry(pts, 18);
});

export function Pipette({ modelUrl, ...props }: ModelProps) {
  const glass = useGlass('#f3f9fb');
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0.0085, -0.1]}>
        <mesh geometry={stem()} material={glass} renderOrder={1} />
        <mesh geometry={bulb()} material={plastic('#d9342b', 0.7)} position={[0, 0.145, 0]} castShadow />
      </group>
    </ModelOr>
  );
}
