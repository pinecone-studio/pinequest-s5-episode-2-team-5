/** Glass stirring rod (lying along z): Ø 6 mm × 200 mm with fire-polished ends. */
import { useGlass } from '../materials/glass';
import { ModelOr, type ModelProps } from './ModelOr';

export function GlassRod({ modelUrl, ...props }: ModelProps) {
  const glass = useGlass('#eef8fb');
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh material={glass} position={[0, 0.003, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={1} castShadow>
        <capsuleGeometry args={[0.003, 0.194, 4, 10]} />
      </mesh>
    </ModelOr>
  );
}
