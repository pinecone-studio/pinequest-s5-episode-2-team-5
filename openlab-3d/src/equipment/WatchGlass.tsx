/** Watch glass: Ø 80 mm shallow spherical glass dish for covering beakers or drying small samples. */
import { useGlass } from '../materials/glass';
import { ModelOr, type ModelProps } from './ModelOr';

const R = 0.15;

export function WatchGlass({ modelUrl, ...props }: ModelProps) {
  const glass = useGlass('#eef8fb');
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh material={glass} position={[0, R, 0]} rotation={[Math.PI, 0, 0]} renderOrder={1} castShadow>
        <sphereGeometry args={[R, 36, 6, 0, Math.PI * 2, 0, 0.27]} />
      </mesh>
    </ModelOr>
  );
}
