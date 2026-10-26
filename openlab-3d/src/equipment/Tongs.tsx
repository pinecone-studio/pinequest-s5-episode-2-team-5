/**
 * Crucible tongs (lying along z, 240 mm): two round steel arms crossing at a riveted pivot,
 * bowed jaws that close around a crucible or dish, and finger bows at the handle end.
 */
import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';
import { metalBrushed, metalDark } from '../materials/metal';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const Y = 0.005;
/** One arm, mirrored with `s`: handle bow → pivot → jaw → curled tip. */
function arm(s: number) {
  return new TubeGeometry(
    new CatmullRomCurve3([
      new Vector3(s * 0.004, Y, -0.118),
      new Vector3(s * 0.014, Y, -0.11),
      new Vector3(s * 0.016, Y, -0.085),
      new Vector3(s * 0.011, Y, -0.04),
      new Vector3(s * 0.003, Y, 0.012),
      new Vector3(-s * 0.003, Y, 0.035),
      new Vector3(-s * 0.012, Y, 0.075),
      new Vector3(-s * 0.016, Y, 0.098),
      new Vector3(-s * 0.012, Y, 0.112),
      new Vector3(-s * 0.003, Y, 0.118),
    ]),
    48,
    0.0021,
    8,
    false,
  );
}
const arms = lazy(() => [arm(1), arm(-1)]);

export function Tongs({ modelUrl, ...props }: ModelProps) {
  const [a, b] = arms();
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={a} material={metalBrushed} castShadow />
      {/* The second arm passes over the first at the pivot. */}
      <mesh geometry={b} material={metalBrushed} position={[0, 0.0032, 0]} castShadow />
      <mesh material={metalDark} position={[0, Y + 0.0016, 0.024]}>
        <cylinderGeometry args={[0.0032, 0.0032, 0.0085, 14]} />
      </mesh>
    </ModelOr>
  );
}
