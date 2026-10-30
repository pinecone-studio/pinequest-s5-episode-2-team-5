/** Grade 8 copy of Spatula as it was before the main reset; Spatula.tsx switches to it while a grade 8 lab is active. */
/**
 * Stainless-steel spatula-spoon (lying along z, 180 mm): a flat rounded blade at one end for
 * scraping and a small deep scoop at the other, joined by a flat handle. A loaded scoop shows
 * a heaped portion of the solid in its real color.
 */
import { DoubleSide, ExtrudeGeometry, MeshStandardMaterial, Shape } from 'three';
import { metalBrushed } from '../materials/metal';
import { plastic } from '../materials/plastic';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

/** Flat stock in the x–z plane: narrow handle widening to a rounded blade (z < 0). */
const bladeGeometry = lazy(() => {
  const s = new Shape();
  s.moveTo(-0.0022, 0.055);
  s.lineTo(-0.0022, -0.035);
  s.quadraticCurveTo(-0.0052, -0.05, -0.0052, -0.07);
  s.lineTo(-0.0052, -0.082);
  s.quadraticCurveTo(-0.0052, -0.089, 0, -0.089);
  s.quadraticCurveTo(0.0052, -0.089, 0.0052, -0.082);
  s.lineTo(0.0052, -0.07);
  s.quadraticCurveTo(0.0052, -0.05, 0.0022, -0.035);
  s.lineTo(0.0022, 0.055);
  s.lineTo(-0.0022, 0.055);
  const g = new ExtrudeGeometry(s, { depth: 0.0009, bevelEnabled: false, curveSegments: 8 });
  g.rotateX(Math.PI / 2);
  return g;
});
const scoopMaterial = lazy(() => {
  const m = (metalBrushed as MeshStandardMaterial).clone();
  m.side = DoubleSide;
  return m;
});

export function SpatulaGrade8({ modelUrl, load, ...props }: ModelProps & { load?: string }) {
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={bladeGeometry()} material={metalBrushed} position={[0, 0.0045, 0]} castShadow />
      {/* Neck rising into the scoop. */}
      <mesh material={metalBrushed} position={[0, 0.004, 0.06]} rotation={[Math.PI / 2 - 0.25, 0, 0]}>
        <boxGeometry args={[0.0036, 0.012, 0.0009]} />
      </mesh>
      {/* Deep oval scoop: the lower half of a sphere, open upwards. */}
      <mesh material={scoopMaterial()} position={[0, 0.0062, 0.075]} scale={[0.0058, 0.0045, 0.0105]} castShadow>
        <sphereGeometry args={[1, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
      </mesh>
      {load && (
        <mesh material={plastic(load, 0.95)} position={[0, 0.0058, 0.075]} scale={[0.005, 0.0034, 0.009]} userData={{ noOutline: true, noBatch: true }}>
          <sphereGeometry args={[1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      )}
    </ModelOr>
  );
}
