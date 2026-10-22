/** Petri dish: Ø 90 mm × 15 mm, base with nutrient agar and a few colonies, plus a lid. */
import { useMemo } from 'react';
import { LatheGeometry, MeshStandardMaterial, Vector2 } from 'three';
import { useGlass } from '../materials/glass';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const dishGeometry = (r: number, h: number) =>
  new LatheGeometry([new Vector2(0, 0), new Vector2(r, 0), new Vector2(r, h), new Vector2(r - 0.001, h), new Vector2(r - 0.001, 0.001), new Vector2(0, 0.001)], 40);
const baseGeo = lazy(() => dishGeometry(0.043, 0.012));
const lidGeo = lazy(() => {
  const g = dishGeometry(0.045, 0.01);
  g.rotateX(Math.PI);
  g.translate(0, 0.016, 0);
  return g;
});
const agar = new MeshStandardMaterial({ color: '#e8d27a', roughness: 0.35, transparent: true, opacity: 0.92 });
const colony = new MeshStandardMaterial({ color: '#f5f1e6', roughness: 0.6 });

export function PetriDish({ modelUrl, ...props }: ModelProps) {
  const glass = useGlass('#f3f9fb');
  const colonies = useMemo(() => Array.from({ length: 9 }, (_, i) => [Math.cos(i * 2.4) * 0.025 * ((i % 3) / 2 + 0.3), Math.sin(i * 2.4) * 0.025 * ((i % 3) / 2 + 0.3), 0.002 + (i % 3) * 0.0012] as const), []);
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={baseGeo()} material={glass} renderOrder={1} castShadow />
      <mesh material={agar} position={[0, 0.004, 0]} userData={{ noOutline: true }}>
        <cylinderGeometry args={[0.041, 0.041, 0.006, 36]} />
      </mesh>
      {colonies.map(([x, z, r], i) => (
        <mesh key={i} material={colony} position={[x, 0.0072, z]} scale={[1, 0.35, 1]} userData={{ noOutline: true }}>
          <sphereGeometry args={[r, 10, 6]} />
        </mesh>
      ))}
      <mesh geometry={lidGeo()} material={glass} renderOrder={1} />
    </ModelOr>
  );
}
