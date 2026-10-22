/**
 * Bunsen burner: Ø 100 mm cast base, 130 mm chrome barrel with a rotating air collar,
 * gas inlet with an orange rubber hose, and an animated two-cone flame (inner blue
 * cone glows through Bloom) when lit.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, CatmullRomCurve3, LatheGeometry, MeshBasicMaterial, TubeGeometry, Vector2, Vector3, type Group } from 'three';
import { metalChrome, metalDark } from '../materials/metal';
import { plastic } from '../materials/plastic';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const baseGeometry = lazy(() => new LatheGeometry([new Vector2(0, 0), new Vector2(0.05, 0), new Vector2(0.05, 0.008), new Vector2(0.03, 0.02), new Vector2(0.012, 0.03), new Vector2(0, 0.03)], 32));
const flameOuterGeo = lazy(() => {
  const pts: Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push(new Vector2(0.011 * Math.sin(Math.PI * Math.pow(t, 0.6)) * (1 - t * 0.2) + 0.0005, t * 0.1));
  }
  return new LatheGeometry(pts, 16);
});
const flameInnerGeo = lazy(() => new LatheGeometry([new Vector2(0.0075, 0), new Vector2(0.006, 0.02), new Vector2(0.0, 0.035)], 16));

const outerMat = new MeshBasicMaterial({ color: '#6aa8ff', transparent: true, opacity: 0.35, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
const innerMat = new MeshBasicMaterial({ color: '#7ad7ff', transparent: true, opacity: 0.95, blending: AdditiveBlending, depthWrite: false, toneMapped: false });

export function BunsenBurner({ modelUrl, lit = false, ...props }: ModelProps & { lit?: boolean }) {
  const flame = useRef<Group>(null);
  const hose = useMemo(
    () => new TubeGeometry(new CatmullRomCurve3([new Vector3(0.04, 0.012, 0), new Vector3(0.09, 0.006, 0.01), new Vector3(0.16, 0.004, 0.05), new Vector3(0.22, 0.004, 0.12)]), 24, 0.006, 8, false),
    [],
  );
  useFrame((state) => {
    if (!flame.current || !lit) return;
    const t = state.clock.elapsedTime;
    flame.current.scale.set(1 + Math.sin(t * 31) * 0.04, 1 + Math.sin(t * 23) * 0.07 + Math.sin(t * 57) * 0.03, 1 + Math.cos(t * 29) * 0.04);
  });
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={baseGeometry()} material={metalDark} castShadow />
      <mesh material={metalChrome} position={[0, 0.095, 0]} castShadow>
        <cylinderGeometry args={[0.0085, 0.0095, 0.13, 18]} />
      </mesh>
      <mesh material={metalChrome} position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.022, 18]} />
      </mesh>
      {/* Air holes on the collar. */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} material={metalDark} position={[Math.cos((i * Math.PI) / 2) * 0.0121, 0.05, Math.sin((i * Math.PI) / 2) * 0.0121]} rotation={[0, -(i * Math.PI) / 2, 0]}>
          <boxGeometry args={[0.001, 0.008, 0.005]} />
        </mesh>
      ))}
      <mesh material={metalChrome} position={[0.03, 0.014, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.004, 0.005, 0.03, 10]} />
      </mesh>
      <mesh geometry={hose} material={plastic('#e06a1b', 0.7)} />
      {lit && (
        <group ref={flame} position={[0, 0.16, 0]} userData={{ dynamic: true }}>
          <mesh geometry={flameOuterGeo()} material={outerMat} userData={{ noOutline: true }} />
          <mesh geometry={flameInnerGeo()} material={innerMat} userData={{ noOutline: true }} />
        </group>
      )}
    </ModelOr>
  );
}
