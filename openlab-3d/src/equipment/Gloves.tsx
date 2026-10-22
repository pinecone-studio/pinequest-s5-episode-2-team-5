/** A pair of blue nitrile gloves lying flat. */
import { plastic } from '../materials/plastic';
import { ModelOr, type ModelProps } from './ModelOr';

const FINGERS = [-0.018, -0.006, 0.006, 0.018];

function Glove({ x, flip }: { x: number; flip: number }) {
  const mat = plastic('#3b82f6', 0.6);
  return (
    <group position={[x, 0.006, 0]} rotation={[0, flip * 0.15, 0]}>
      <mesh material={mat} scale={[1, 0.25, 1]} castShadow>
        <sphereGeometry args={[0.03, 14, 10]} />
      </mesh>
      <mesh material={mat} position={[0, 0, 0.045]} scale={[0.9, 0.22, 1.2]}>
        <sphereGeometry args={[0.024, 12, 8]} />
      </mesh>
      {FINGERS.map((fx) => (
        <mesh key={fx} material={mat} position={[fx, 0, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.0048, 0.026, 3, 8]} />
        </mesh>
      ))}
      <mesh material={mat} position={[flip * 0.032, 0, -0.008]} rotation={[Math.PI / 2, 0, flip * 0.8]}>
        <capsuleGeometry args={[0.0055, 0.02, 3, 8]} />
      </mesh>
    </group>
  );
}

export function Gloves({ modelUrl, ...props }: ModelProps) {
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <Glove x={-0.038} flip={-1} />
      <Glove x={0.038} flip={1} />
    </ModelOr>
  );
}
