/**
 * Oil atomizer: frosted translucent plastic bottle (Ø 50 mm × 80 mm) with a white cap,
 * an angled metal nozzle, a black curved TubeGeometry hose and a black rubber squeeze
 * bulb (Ø 50 mm) that compresses when squeezed (`squeezeId` changes).
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CatmullRomCurve3, LatheGeometry, MeshPhysicalMaterial, TubeGeometry, Vector2, Vector3, type Group } from 'three';
import { plasticWhite, rubberBlack } from '../materials/plastic';
import { metalChrome } from '../materials/metal';
import { registerTransmissionTwin, useTransmission } from '../materials/glass';
import { useLiquid } from '../materials/liquids';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const bodyGeometry = lazy(() => {
  const pts = [new Vector2(0, 0), new Vector2(0.022, 0), new Vector2(0.025, 0.004), new Vector2(0.025, 0.06), new Vector2(0.021, 0.07), new Vector2(0.012, 0.076), new Vector2(0.012, 0.08), new Vector2(0, 0.08)];
  return new LatheGeometry(pts, 32);
});
const bulbGeometry = lazy(() => {
  const pts: Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI;
    const r = Math.sin(a) * 0.024 * (1 - 0.15 * Math.cos(a));
    pts.push(new Vector2(Math.max(r, i === 0 || i === 16 ? 0.004 : r), -Math.cos(a) * 0.032));
  }
  return new LatheGeometry(pts, 28);
});

const frostedHigh = new MeshPhysicalMaterial({ color: '#f2f5f7', transmission: 0.85, roughness: 0.55, thickness: 0.01, ior: 1.45 });
const frostedLow = new MeshPhysicalMaterial({ color: '#f2f5f7', roughness: 0.6, transparent: true, opacity: 0.6 });
registerTransmissionTwin(frostedHigh, frostedLow);

export interface AtomizerProps extends ModelProps {
  squeezeId?: number;
}

export function AtomizerBottle({ modelUrl, squeezeId = 0, ...props }: AtomizerProps) {
  const transmission = useTransmission();
  const oil = useLiquid('#f1d58a');
  const bulb = useRef<Group>(null);
  const squeeze = useRef(0);
  const hose = useMemo(
    () =>
      new TubeGeometry(
        new CatmullRomCurve3([new Vector3(-0.012, 0.074, 0), new Vector3(-0.035, 0.09, 0), new Vector3(-0.06, 0.07, 0.005), new Vector3(-0.07, 0.04, 0.01), new Vector3(-0.072, 0.032, 0.01)]),
        32,
        0.0035,
        8,
        false,
      ),
    [],
  );
  useEffect(() => {
    if (squeezeId > 0) squeeze.current = 1;
  }, [squeezeId]);
  useFrame((_, dt) => {
    if (!bulb.current) return;
    squeeze.current = Math.max(0, squeeze.current - dt * 3);
    // Quick squeeze in, slower release.
    const s = squeeze.current > 0.7 ? (1 - squeeze.current) / 0.3 : squeeze.current / 0.7;
    const k = 1 - 0.35 * s;
    bulb.current.scale.set(1 + 0.18 * s, k, 1 + 0.18 * s);
  });
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={bodyGeometry()} material={transmission ? frostedHigh : frostedLow} castShadow renderOrder={1} />
      <mesh material={oil} position={[0, 0.022, 0]} userData={{ noOutline: true }}>
        <cylinderGeometry args={[0.022, 0.021, 0.04, 24]} />
      </mesh>
      <mesh material={plasticWhite} position={[0, 0.082, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.012, 20]} />
      </mesh>
      {/* Spray nozzle: angled metal tube pointing toward +x. */}
      <mesh material={metalChrome} position={[0.018, 0.096, 0]} rotation={[0, 0, -1.1]}>
        <cylinderGeometry args={[0.0028, 0.0035, 0.05, 10]} />
      </mesh>
      <mesh material={plasticWhite} position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.006, 0.008, 0.012, 12]} />
      </mesh>
      <mesh geometry={hose} material={rubberBlack} />
      <group position={[-0.072, 0.032, 0.01]} userData={{ dynamic: true }}>
        <group ref={bulb}>
          <mesh geometry={bulbGeometry()} material={rubberBlack} position={[0, 0, 0]} castShadow />
        </group>
      </group>
    </ModelOr>
  );
}
