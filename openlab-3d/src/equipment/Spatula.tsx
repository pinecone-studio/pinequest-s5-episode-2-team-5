/** Stainless-steel micro-spatula (lying along z): 140 mm handle with a scoop at one end and a flat blade at the other. */
import { metalBrushed } from '../materials/metal';
import { plastic } from '../materials/plastic';
import { ModelOr, type ModelProps } from './ModelOr';

export function Spatula({ modelUrl, load, ...props }: ModelProps & { load?: string }) {
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh material={metalBrushed} position={[0, 0.002, -0.02]} castShadow>
        <boxGeometry args={[0.004, 0.003, 0.14]} />
      </mesh>
      <mesh material={metalBrushed} position={[0, 0.002, 0.07]} scale={[1, 0.18, 1.9]} castShadow>
        <sphereGeometry args={[0.008, 14, 8]} />
      </mesh>
      <mesh material={metalBrushed} position={[0, 0.002, -0.088]}>
        <boxGeometry args={[0.009, 0.0016, 0.024]} />
      </mesh>
      {load && (
        <mesh material={plastic(load, 0.9)} position={[0, 0.0045, 0.07]} scale={[1, 0.35, 1.6]} userData={{ noOutline: true, noBatch: true }}>
          <sphereGeometry args={[0.006, 10, 8]} />
        </mesh>
      )}
    </ModelOr>
  );
}
