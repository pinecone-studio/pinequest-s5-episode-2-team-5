/** 250 mL Erlenmeyer flask: Ø 85 mm base, 140 mm tall, Ø 34 mm neck with a beaded rim. */
import { LatheGeometry, Vector2 } from 'three';
import { useGlass } from '../materials/glass';
import { useLiquid } from '../materials/liquids';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const outline = (inset: number): Vector2[] => [
  new Vector2(0.042 - inset, 0.004),
  new Vector2(0.038 - inset, 0.03),
  new Vector2(0.022 - inset, 0.085),
  new Vector2(0.015 - inset, 0.105),
  new Vector2(0.015 - inset, 0.136),
];

export const flaskGeometry = lazy(() => {
  const outer = outline(0);
  const inner = outline(0.0018).reverse();
  const pts = [new Vector2(0, 0), new Vector2(0.038, 0), ...outer, new Vector2(0.0175, 0.138), new Vector2(0.0172, 0.1405), ...inner, new Vector2(0.036, 0.0022), new Vector2(0, 0.0022)];
  return new LatheGeometry(pts, 36);
});

/** Liquid fills the conical part: profile interpolated along the flask's inner wall. */
function liquidGeometryFor(level: number): LatheGeometry {
  const wall = outline(0.0026);
  const pts: Vector2[] = [new Vector2(0, 0.003)];
  for (const p of wall) {
    if (p.y <= level) pts.push(new Vector2(p.x, p.y));
  }
  // Interpolate the radius at the meniscus height.
  let r = wall[wall.length - 1].x;
  for (let i = 0; i < wall.length - 1; i++) {
    const a = wall[i];
    const b = wall[i + 1];
    if (level >= a.y && level <= b.y) r = a.x + ((level - a.y) / (b.y - a.y)) * (b.x - a.x);
  }
  pts.push(new Vector2(r, level), new Vector2(0, level));
  return new LatheGeometry(pts, 32);
}

const liquidCache = new Map<number, LatheGeometry>();
function liquidGeometry(fill: number): LatheGeometry {
  const key = Math.round(fill * 20) / 20;
  let g = liquidCache.get(key);
  if (!g) {
    g = liquidGeometryFor(0.006 + key * 0.09);
    liquidCache.set(key, g);
  }
  return g;
}

export interface FlaskProps extends ModelProps {
  liquidColor?: string;
  fill?: number;
}

export function ErlenmeyerFlask({ modelUrl, liquidColor = '#8b4fd8', fill = 0.4, ...props }: FlaskProps) {
  const glass = useGlass('#eef8fb');
  const liquid = useLiquid(liquidColor);
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={flaskGeometry()} material={glass} castShadow renderOrder={1} />
      {fill > 0.01 && <mesh geometry={liquidGeometry(fill)} material={liquid} userData={{ noOutline: true }} />}
    </ModelOr>
  );
}
