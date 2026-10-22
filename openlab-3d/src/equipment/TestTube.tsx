/** 16 × 150 mm test tube with a rounded bottom and flared lip (origin at the bottom). */
import { LatheGeometry, Vector2 } from 'three';
import { useGlass } from '../materials/glass';
import { useLiquid } from '../materials/liquids';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const R = 0.008;
const L = 0.15;

export const testTubeGeometry = lazy(() => {
  const pts: Vector2[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    pts.push(new Vector2(Math.sin(a) * R, R - Math.cos(a) * R));
  }
  pts.push(new Vector2(R, L - 0.002), new Vector2(R + 0.0012, L), new Vector2(R - 0.0008, L), new Vector2(R - 0.0008, R));
  return new LatheGeometry(pts, 18);
});

export function liquidTubeGeometry(level: number): LatheGeometry {
  const r = R - 0.0012;
  const pts: Vector2[] = [];
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push(new Vector2(Math.sin(a) * r, R - Math.cos(a) * r));
  }
  pts.push(new Vector2(r, level), new Vector2(0, level));
  return new LatheGeometry(pts, 14);
}

const tubeLiquid = lazy(() => liquidTubeGeometry(0.06));

export function TestTube({ modelUrl, liquidColor = '#ff5a5a', fill = 0.5, ...props }: ModelProps & { liquidColor?: string; fill?: number }) {
  const glass = useGlass('#eef8fb');
  const liquid = useLiquid(liquidColor);
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      {/* Modeled upright, then laid on its side so a loose tube rests stably on a bench. */}
      <group rotation={[Math.PI / 2, 0, 0]} position={[0, R, -L / 2]}>
        <mesh geometry={testTubeGeometry()} material={glass} renderOrder={1} castShadow />
        {fill > 0.01 && <mesh geometry={tubeLiquid()} material={liquid} scale={[1, fill * 2, 1]} userData={{ noOutline: true, noBatch: true }} />}
      </group>
    </ModelOr>
  );
}
