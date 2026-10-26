/**
 * Wire test-tube holder (lying along z, 200 mm): a turned wooden handle, a coiled steel
 * spring and a wire clamp whose two bows close around a 16 mm tube.
 */
import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';
import { metalBrushed } from '../materials/metal';
import { wood } from '../materials/plastic';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const Y = 0.007;
/** One wire: from the ferrule, along the spring, out to a half-ring jaw. */
function wire(s: number) {
  const pts = [new Vector3(0, Y, 0.002), new Vector3(s * 0.003, Y, 0.03), new Vector3(s * 0.004, Y, 0.055), new Vector3(s * 0.005, Y, 0.068)];
  // Half ring around a 16 mm tube centred at z = 0.082.
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI;
    pts.push(new Vector3(s * Math.sin(a) * 0.0095, Y, 0.082 - Math.cos(a) * 0.0095));
  }
  return new TubeGeometry(new CatmullRomCurve3(pts), 56, 0.0011, 6, false);
}
const wires = lazy(() => [wire(1), wire(-1)]);
/** Coil spring around the wires near the handle. */
const spring = lazy(() => {
  const pts: Vector3[] = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2 * 8;
    pts.push(new Vector3(Math.cos(a) * 0.0042, Y + Math.sin(a) * 0.0042, 0.012 + (i / 96) * 0.016));
  }
  return new TubeGeometry(new CatmullRomCurve3(pts), 192, 0.0006, 5, false);
});

export function TestTubeHolder({ modelUrl, ...props }: ModelProps) {
  const [a, b] = wires();
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh material={wood} position={[0, Y, -0.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.0055, 0.0065, 0.1, 16]} />
      </mesh>
      <mesh material={metalBrushed} position={[0, Y, 0.003]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0058, 0.0058, 0.008, 16]} />
      </mesh>
      <mesh geometry={a} material={metalBrushed} castShadow />
      <mesh geometry={b} material={metalBrushed} castShadow />
      <mesh geometry={spring()} material={metalBrushed} />
    </ModelOr>
  );
}
