/** Porcelain evaporating dish: Ø 90 mm × 40 mm glazed bowl with a pouring spout. */
import { DoubleSide, LatheGeometry, MeshStandardMaterial, Vector2 } from 'three';
import { useLiquid } from '../materials/liquids';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const porcelain = new MeshStandardMaterial({ color: '#f6f2ea', roughness: 0.28, side: DoubleSide });
const bowlGeometry = lazy(
  () =>
    new LatheGeometry(
      [new Vector2(0, 0), new Vector2(0.026, 0), new Vector2(0.04, 0.01), new Vector2(0.046, 0.034), new Vector2(0.048, 0.04), new Vector2(0.0465, 0.04), new Vector2(0.0445, 0.034), new Vector2(0.038, 0.012), new Vector2(0.024, 0.004), new Vector2(0, 0.004)],
      32,
    ),
);

export function EvaporatingDish({ modelUrl, liquidColor = '#b9def5', fill = 0, ...props }: ModelProps & { liquidColor?: string; fill?: number }) {
  const liquid = useLiquid(liquidColor);
  const level = Math.min(1, fill) * 0.028;
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={bowlGeometry()} material={porcelain} castShadow />
      <mesh material={porcelain} position={[0.049, 0.039, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.012, 0.003, 0.014]} />
      </mesh>
      {level > 0.001 && (
        <mesh material={liquid} position={[0, 0.004 + level / 2, 0]} userData={{ noOutline: true, noBatch: true }}>
          <cylinderGeometry args={[0.0345 + level * 0.3, 0.022, level, 28]} />
        </mesh>
      )}
    </ModelOr>
  );
}
