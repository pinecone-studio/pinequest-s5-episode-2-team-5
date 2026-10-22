/** 100 mL volumetric flask: round bulb on a long neck with a ring mark (origin at the base). */
import { LatheGeometry, Vector2 } from 'three';
import { useGlass } from '../materials/glass';
import { useLiquid } from '../materials/liquids';
import { plastic } from '../materials/plastic';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const R = 0.042;
const BULB_MAX = 2.5; // radians swept from the bottom of the bulb

const flaskGeometry = lazy(() => {
  const pts: Vector2[] = [];
  for (let i = 0; i <= 18; i++) {
    const phi = (i / 18) * BULB_MAX;
    pts.push(new Vector2(R * Math.sin(phi), R - R * Math.cos(phi)));
  }
  pts.push(new Vector2(0.0155, 0.095), new Vector2(0.0095, 0.112), new Vector2(0.0088, 0.17), new Vector2(0.0102, 0.173), new Vector2(0.0098, 0.173));
  return new LatheGeometry(pts, 32);
});

const liquidCache = new Map<number, LatheGeometry>();
function liquidGeometry(fill: number): LatheGeometry {
  const key = Math.round(fill * 20) / 20;
  let g = liquidCache.get(key);
  if (!g) {
    const top = Math.max(0.004, key * 0.074);
    const pts: Vector2[] = [];
    for (let i = 0; i <= 12; i++) {
      const y = (i / 12) * top;
      pts.push(new Vector2(Math.sqrt(Math.max(0, R * R - (y - R) * (y - R))) * 0.96, y));
    }
    pts.push(new Vector2(0, top));
    g = new LatheGeometry(pts, 28);
    liquidCache.set(key, g);
  }
  return g;
}

export function VolumetricFlask({ modelUrl, liquidColor = '#b9def5', fill = 0, ...props }: ModelProps & { liquidColor?: string; fill?: number }) {
  const glass = useGlass('#eef8fb');
  const liquid = useLiquid(liquidColor);
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={flaskGeometry()} material={glass} renderOrder={1} castShadow />
      <mesh material={plastic('#20252b', 0.6)} position={[0, 0.14, 0]} userData={{ noOutline: true }}>
        <cylinderGeometry args={[0.0092, 0.0092, 0.0008, 18]} />
      </mesh>
      {fill > 0.01 && <mesh geometry={liquidGeometry(fill)} material={liquid} userData={{ noOutline: true, noBatch: true }} />}
    </ModelOr>
  );
}
