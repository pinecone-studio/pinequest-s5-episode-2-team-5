/** Flame-test loop (lying along z): wooden handle, nichrome wire and a small loop that shows the picked-up sample. */
import { metalBrushed } from '../materials/metal';
import { plastic, wood } from '../materials/plastic';
import { ModelOr, type ModelProps } from './ModelOr';

export function WireLoop({ modelUrl, sampleColor, ...props }: ModelProps & { sampleColor?: string }) {
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh material={wood} position={[0, 0.006, -0.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.0055, 0.006, 0.12, 12]} />
      </mesh>
      <mesh material={metalBrushed} position={[0, 0.006, 0.055]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0007, 0.0007, 0.095, 6]} />
      </mesh>
      <mesh material={metalBrushed} position={[0, 0.006, 0.105]}>
        <torusGeometry args={[0.0032, 0.0007, 6, 16]} />
      </mesh>
      {sampleColor && (
        <mesh material={plastic(sampleColor, 0.4)} position={[0, 0.006, 0.105]} scale={[1, 1, 0.35]} userData={{ noOutline: true }}>
          <sphereGeometry args={[0.0028, 10, 8]} />
        </mesh>
      )}
    </ModelOr>
  );
}
