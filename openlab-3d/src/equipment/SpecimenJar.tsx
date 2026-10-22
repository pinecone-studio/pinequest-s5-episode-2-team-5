/**
 * Specimen jar: Ø 100 mm × 160 mm glass jar with a black lid, filled with pale fixative,
 * holding a simple stylized specimen (frog, starfish or squid) and a paper label.
 */
import { useMemo } from 'react';
import { MeshStandardMaterial } from 'three';
import { useGlass } from '../materials/glass';
import { useLiquid } from '../materials/liquids';
import { plastic, plasticBlack } from '../materials/plastic';
import { labelTexture } from '../utils/textures';
import { ModelOr, type ModelProps } from './ModelOr';

function Specimen({ kind }: { kind: string }) {
  if (kind === 'Starfish') {
    const m = plastic('#e07a3f', 0.8);
    return (
      <group position={[0, 0.07, 0]} rotation={[Math.PI / 2.4, 0, 0]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} material={m} rotation={[0, 0, (i / 5) * Math.PI * 2]} position={[0, 0, 0]}>
            <coneGeometry args={[0.009, 0.06, 6]} />
          </mesh>
        ))}
      </group>
    );
  }
  if (kind === 'Squid') {
    const m = plastic('#e9c7c0', 0.7);
    return (
      <group position={[0, 0.06, 0]}>
        <mesh material={m} position={[0, 0.03, 0]}>
          <coneGeometry args={[0.014, 0.05, 10]} />
        </mesh>
        {[-0.006, -0.002, 0.002, 0.006].map((x) => (
          <mesh key={x} material={m} position={[x, -0.012, 0]}>
            <cylinderGeometry args={[0.0018, 0.0012, 0.04, 5]} />
          </mesh>
        ))}
      </group>
    );
  }
  const m = plastic('#8fae6a', 0.75);
  return (
    <group position={[0, 0.065, 0]}>
      <mesh material={m} scale={[1, 0.65, 1.3]}>
        <sphereGeometry args={[0.022, 14, 10]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={m} position={[s * 0.022, -0.012, 0.012]} rotation={[0.4, 0, s * 0.8]}>
          <capsuleGeometry args={[0.004, 0.03, 4, 6]} />
        </mesh>
      ))}
    </group>
  );
}

export function SpecimenJar({ modelUrl, label = 'Frog', ...props }: ModelProps & { label?: string }) {
  const glass = useGlass('#f0f7f4');
  const fluid = useLiquid('#f3eed2');
  const labelMat = useMemo(() => new MeshStandardMaterial({ map: labelTexture(label, '#7c3aed'), roughness: 0.8 }), [label]);
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh material={glass} position={[0, 0.072, 0]} renderOrder={1} castShadow>
        <cylinderGeometry args={[0.048, 0.048, 0.144, 32, 1, true]} />
      </mesh>
      <mesh material={glass} position={[0, 0.002, 0]} renderOrder={1}>
        <cylinderGeometry args={[0.048, 0.048, 0.004, 32]} />
      </mesh>
      <mesh material={fluid} position={[0, 0.066, 0]} userData={{ noOutline: true }}>
        <cylinderGeometry args={[0.045, 0.045, 0.124, 28]} />
      </mesh>
      <Specimen kind={label} />
      <mesh material={plasticBlack} position={[0, 0.152, 0]} castShadow>
        <cylinderGeometry args={[0.051, 0.051, 0.018, 32]} />
      </mesh>
      <mesh material={labelMat} position={[0, 0.04, 0]} rotation={[0, Math.PI, 0]}>
        <cylinderGeometry args={[0.0485, 0.0485, 0.035, 24, 1, true, Math.PI * 0.65, Math.PI * 0.7]} />
      </mesh>
    </ModelOr>
  );
}
