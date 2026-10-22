/** Iron tripod (205 mm) with a wire gauze and ceramic center: the stand a vessel sits on over a Bunsen burner. */
import { metalDark, metalBrushed } from '../materials/metal';
import { plastic } from '../materials/plastic';
import { ModelOr, type ModelProps } from './ModelOr';

const LEGS = [0, 1, 2].map((i) => (i / 3) * Math.PI * 2 + Math.PI / 2);

export function Tripod({ modelUrl, ...props }: ModelProps) {
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh material={metalDark} position={[0, 0.195, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.068, 0.004, 8, 32]} />
      </mesh>
      {LEGS.map((a) => (
        <mesh key={a} material={metalDark} position={[Math.cos(a) * 0.074, 0.097, Math.sin(a) * 0.074]} rotation={[Math.sin(a) * 0.06, 0, -Math.cos(a) * 0.06]} castShadow>
          <cylinderGeometry args={[0.004, 0.004, 0.196, 8]} />
        </mesh>
      ))}
      {/* Wire gauze with a ceramic center. */}
      <mesh material={metalBrushed} position={[0, 0.2, 0]}>
        <boxGeometry args={[0.15, 0.002, 0.15]} />
      </mesh>
      <mesh material={plastic('#e9e4da', 0.95)} position={[0, 0.2015, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.0015, 24]} />
      </mesh>
    </ModelOr>
  );
}
