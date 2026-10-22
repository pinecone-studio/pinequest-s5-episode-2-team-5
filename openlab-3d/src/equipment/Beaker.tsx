/**
 * 250 mL borosilicate beaker: Ø 70 mm × 95 mm. LatheGeometry wall profile with a rolled
 * rim and a pour spout lip, thin dark graduation rings every 50 mL, and an inner liquid
 * mesh with a flat meniscus top.
 */
import { useMemo } from 'react';
import { CylinderGeometry, LatheGeometry, Vector2 } from 'three';
import { useGlass } from '../materials/glass';
import { useLiquid } from '../materials/liquids';
import { plastic } from '../materials/plastic';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const R = 0.035;
const H = 0.095;
const WALL = 0.0018;

/** Outer and inner wall in one closed profile (base → rim → back down inside). */
const profile = lazy(() => [
  new Vector2(0.0, 0.0),
  new Vector2(R - 0.004, 0.0),
  new Vector2(R, 0.004),
  new Vector2(R, H - 0.004),
  new Vector2(R + 0.0025, H - 0.001),
  new Vector2(R + 0.0022, H + 0.0012),
  new Vector2(R - WALL, H),
  new Vector2(R - WALL, 0.005),
  new Vector2(R - 0.005, WALL),
  new Vector2(0.0, WALL),
]);
export const beakerGeometry = lazy(() => new LatheGeometry(profile(), 36));

/** Spout: a small curved lip. */
const spoutGeometry = lazy(() => {
  const g = new CylinderGeometry(0.006, 0.004, 0.012, 12, 1, true, 0, Math.PI);
  g.rotateZ(Math.PI / 2.4);
  return g;
});

/** Printed graduation mark: a thin arc on the front of the wall. */
const ringGeometry = lazy(() => new CylinderGeometry(R + 0.0003, R + 0.0003, 0.0005, 16, 1, true, -0.4, 0.8));
const markMaterial = plastic('#5b6470', 0.6);

export interface BeakerProps extends ModelProps {
  liquidColor?: string;
  /** Fill level 0..1. */
  fill?: number;
}

export function Beaker({ modelUrl, liquidColor = '#2f7ff0', fill = 0.55, ...props }: BeakerProps) {
  const glass = useGlass('#eef8fb');
  const liquid = useLiquid(liquidColor);
  const level = Math.max(0.0, Math.min(0.95, fill)) * (H - 0.008);
  const marks = useMemo(() => [0.25, 0.45, 0.65, 0.85].map((f) => 0.006 + f * (H - 0.01)), []);
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={beakerGeometry()} material={glass} castShadow renderOrder={1} />
      <mesh geometry={spoutGeometry()} material={glass} position={[R + 0.001, H - 0.002, 0]} renderOrder={1} />
      {marks.map((y) => (
        <mesh key={y} geometry={ringGeometry()} material={markMaterial} position={[0, y, 0]} userData={{ noOutline: true }} />
      ))}
      {level > 0.002 && (
        <mesh material={liquid} position={[0, WALL + level / 2, 0]} userData={{ noOutline: true }}>
          <cylinderGeometry args={[R - WALL - 0.0006, R - 0.0045, level, 32]} />
        </mesh>
      )}
    </ModelOr>
  );
}
