/** Crucible tongs (lying along z): two crossed steel arms with a pivot rivet and curved jaw tips. */
import { metalBrushed, metalDark } from '../materials/metal';
import { ModelOr, type ModelProps } from './ModelOr';

export function Tongs({ modelUrl, ...props }: ModelProps) {
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      {[1, -1].map((s) => (
        <group key={s} rotation={[0, s * 0.075, 0]}>
          <mesh material={metalBrushed} position={[0, s > 0 ? 0.0025 : 0.0075, 0]} castShadow>
            <boxGeometry args={[0.006, 0.004, 0.24]} />
          </mesh>
          <mesh material={metalBrushed} position={[s * -0.004, s > 0 ? 0.0025 : 0.0075, 0.118]} rotation={[0, s * 0.5, 0]}>
            <boxGeometry args={[0.012, 0.004, 0.02]} />
          </mesh>
        </group>
      ))}
      <mesh material={metalDark} position={[0, 0.005, 0.03]}>
        <cylinderGeometry args={[0.005, 0.005, 0.012, 12]} />
      </mesh>
    </ModelOr>
  );
}
