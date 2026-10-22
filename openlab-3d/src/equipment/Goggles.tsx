/**
 * Indirect-vent splash goggles: 170 mm wide curved clear polycarbonate lens band (a
 * partial cylinder), soft gray frame, vent caps, and an elastic strap (TubeGeometry loop).
 */
import { useMemo } from 'react';
import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';
import { useGlass } from '../materials/glass';
import { plastic } from '../materials/plastic';
import { ModelOr, type ModelProps } from './ModelOr';

export function Goggles({ modelUrl, ...props }: ModelProps) {
  const lens = useGlass('#e6f4ff');
  const strap = useMemo(() => {
    const pts: Vector3[] = [];
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI * 0.15 + (i / 14) * Math.PI * 0.7;
      pts.push(new Vector3(Math.cos(a) * 0.088, 0.035, -Math.sin(a) * 0.07 - 0.01));
    }
    return new TubeGeometry(new CatmullRomCurve3(pts), 40, 0.0035, 6, false);
  }, []);
  const frame = plastic('#56606b', 0.7);
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <group position={[0, 0, 0.03]}>
        {/* Curved lens band. */}
        <mesh material={lens} position={[0, 0.035, -0.09]} renderOrder={1} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.055, 40, 1, true, -0.75, 1.5]} />
        </mesh>
        {/* Frame rims top and bottom. */}
        {[0.0075, 0.0625].map((y) => (
          <mesh key={y} material={frame} position={[0, y, -0.09]}>
            <cylinderGeometry args={[0.101, 0.101, 0.008, 40, 1, true, -0.78, 1.56]} />
          </mesh>
        ))}
        {/* Vent caps. */}
        {[-0.5, -0.2, 0.2, 0.5].map((a) => (
          <mesh key={a} material={frame} position={[Math.sin(a) * 0.1, 0.064, -0.09 + Math.cos(a) * 0.1]}>
            <boxGeometry args={[0.014, 0.006, 0.008]} />
          </mesh>
        ))}
        {/* Nose bridge. */}
        <mesh material={frame} position={[0, 0.012, 0.012]}>
          <boxGeometry args={[0.03, 0.02, 0.01]} />
        </mesh>
        <mesh geometry={strap} material={plastic('#1f2937', 0.85)} position={[0, 0, -0.09]} />
      </group>
    </ModelOr>
  );
}
