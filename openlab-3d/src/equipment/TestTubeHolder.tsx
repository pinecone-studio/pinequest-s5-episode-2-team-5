/** Wooden test-tube holder (lying along z): two sprung arms ending in a gripping loop. */
import { metalBrushed } from '../materials/metal';
import { wood } from '../materials/plastic';
import { ModelOr, type ModelProps } from './ModelOr';

export function TestTubeHolder({ modelUrl, ...props }: ModelProps) {
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      {[1, -1].map((s) => (
        <mesh key={s} material={wood} position={[s * 0.007, 0.005, -0.03]} rotation={[0, s * -0.035, 0]} castShadow>
          <boxGeometry args={[0.009, 0.01, 0.15]} />
        </mesh>
      ))}
      <mesh material={metalBrushed} position={[0, 0.005, 0.045]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.012, 0.0022, 8, 22]} />
      </mesh>
      <mesh material={metalBrushed} position={[0, 0.005, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.011, 0.0018, 6, 20]} />
      </mesh>
      <mesh material={metalBrushed} position={[0, 0.005, 0.0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.006, 0.006, 0.026, 12]} />
      </mesh>
    </ModelOr>
  );
}
