/** Porcelain mortar (Ø 120 mm) with a pestle resting in the bowl. */
import { DoubleSide, LatheGeometry, MeshStandardMaterial, Vector2 } from 'three';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const porcelain = new MeshStandardMaterial({ color: '#f1ede4', roughness: 0.4, side: DoubleSide });
const pestleMat = new MeshStandardMaterial({ color: '#e8e3d8', roughness: 0.55 });
const bowlGeometry = lazy(
  () =>
    new LatheGeometry(
      [new Vector2(0, 0), new Vector2(0.034, 0), new Vector2(0.05, 0.012), new Vector2(0.058, 0.04), new Vector2(0.061, 0.046), new Vector2(0.0585, 0.047), new Vector2(0.0545, 0.04), new Vector2(0.046, 0.016), new Vector2(0.024, 0.006), new Vector2(0, 0.006)],
      32,
    ),
);

export function Mortar({ modelUrl, ...props }: ModelProps) {
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={bowlGeometry()} material={porcelain} castShadow />
      <group position={[0.012, 0.012, 0]} rotation={[0, 0, -0.55]}>
        <mesh material={pestleMat} position={[0, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.009, 0.011, 0.1, 14]} />
        </mesh>
        <mesh material={pestleMat} position={[0, 0.1, 0]}>
          <sphereGeometry args={[0.014, 16, 12]} />
        </mesh>
      </group>
    </ModelOr>
  );
}
