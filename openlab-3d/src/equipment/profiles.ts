/**
 * Inner wall profiles of the vessels ([radius, height] in meters, bottom up). The liquid,
 * sediment and foam are lathed from these, so a volume maps to a physically correct level.
 */
import { LatheGeometry, Vector2 } from 'three';

export interface VesselProfile {
  key: string;
  wall: [number, number][];
}

function sphereWall(R: number, from: number, to: number, scale: number, n: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const y = from + ((to - from) * i) / n;
    pts.push([Math.sqrt(Math.max(0, R * R - (y - R) * (y - R))) * scale, y]);
  }
  return pts;
}

export const PROFILES = {
  beaker: { key: 'beaker', wall: [[0.0305, 0.002], [0.0326, 0.006], [0.0326, 0.092]] },
  erlenmeyer: { key: 'erlenmeyer', wall: [[0.0394, 0.004], [0.0354, 0.03], [0.0194, 0.085], [0.0124, 0.105], [0.0124, 0.136]] },
  graduatedCylinder: { key: 'graduatedCylinder', wall: [[0.0118, 0.0135], [0.0118, 0.245]] },
  volumetricFlask: { key: 'volumetricFlask', wall: [...sphereWall(0.042, 0.003, 0.09, 0.955, 12), [0.0105, 0.11], [0.0084, 0.12], [0.0084, 0.17]] },
  testTube: { key: 'testTube', wall: [[0.0025, 0.0016], [0.0055, 0.0035], [0.0067, 0.007], [0.0068, 0.148]] },
  petriDish: { key: 'petriDish', wall: [[0.0432, 0.0025], [0.0432, 0.0135]] },
  evaporatingDish: { key: 'evaporatingDish', wall: [[0.022, 0.0045], [0.037, 0.012], [0.0432, 0.03], [0.0455, 0.039]] },
  reagentJar: { key: 'reagentJar', wall: [[0.029, 0.005], [0.03, 0.008], [0.03, 0.082]] },
  reagentBottle: { key: 'reagentBottle', wall: [[0.0285, 0.005], [0.0305, 0.008], [0.0305, 0.095], [0.026, 0.108], [0.0145, 0.118]] },
  dropperBottle: { key: 'dropperBottle', wall: [[0.0145, 0.003], [0.0155, 0.005], [0.0155, 0.049], [0.0115, 0.059], [0.0065, 0.063]] },
  mortar: { key: 'mortar', wall: [[0.022, 0.0065], [0.045, 0.017], [0.0535, 0.04], [0.056, 0.046]] },
  watchGlass: { key: 'watchGlass', wall: [[0.005, 0.0007], [0.022, 0.0025], [0.036, 0.0062]] },
  burette: { key: 'burette', wall: [[0.0057, 0.0], [0.0057, 0.5]] },
} satisfies Record<string, VesselProfile>;

interface Table {
  y: number[];
  r: number[];
  /** Cumulative volume, mL. */
  v: number[];
}

const tables = new Map<string, Table>();

function table(p: VesselProfile): Table {
  let t = tables.get(p.key);
  if (t) return t;
  t = { y: [], r: [], v: [] };
  let vol = 0;
  const [r0, y0] = p.wall[0];
  t.y.push(y0);
  t.r.push(r0);
  t.v.push(0);
  for (let i = 1; i < p.wall.length; i++) {
    const [ra, ya] = p.wall[i - 1];
    const [rb, yb] = p.wall[i];
    const steps = 8;
    for (let k = 1; k <= steps; k++) {
      const f0 = (k - 1) / steps;
      const f1 = k / steps;
      const r1 = ra + (rb - ra) * f0;
      const r2 = ra + (rb - ra) * f1;
      const h = (yb - ya) / steps;
      vol += ((Math.PI * h * (r1 * r1 + r1 * r2 + r2 * r2)) / 3) * 1e6;
      t.y.push(ya + (yb - ya) * f1);
      t.r.push(r2);
      t.v.push(vol);
    }
  }
  tables.set(p.key, t);
  return t;
}

/** Total inner volume of a profile, mL. */
export function profileVolume(p: VesselProfile): number {
  const t = table(p);
  return t.v[t.v.length - 1];
}

/** Height reached by `ml` of contents (clamped to the rim). */
export function heightForVolume(p: VesselProfile, ml: number): number {
  const t = table(p);
  if (ml <= 0) return t.y[0];
  for (let i = 1; i < t.v.length; i++) {
    if (ml <= t.v[i]) {
      const k = (ml - t.v[i - 1]) / Math.max(1e-12, t.v[i] - t.v[i - 1]);
      return t.y[i - 1] + (t.y[i] - t.y[i - 1]) * k;
    }
  }
  return t.y[t.y.length - 1];
}

export function radiusAt(p: VesselProfile, y: number): number {
  const t = table(p);
  if (y <= t.y[0]) return t.r[0];
  for (let i = 1; i < t.y.length; i++) {
    if (y <= t.y[i]) {
      const k = (y - t.y[i - 1]) / Math.max(1e-12, t.y[i] - t.y[i - 1]);
      return t.r[i - 1] + (t.r[i] - t.r[i - 1]) * k;
    }
  }
  return t.r[t.r.length - 1];
}

export function rimHeight(p: VesselProfile): number {
  return p.wall[p.wall.length - 1][1];
}

const geoCache = new Map<string, LatheGeometry>();

/** A solid of revolution filling the vessel between two heights (cached by 0.5 mm steps). */
export function bandGeometry(p: VesselProfile, from: number, to: number, inset = 0.985): LatheGeometry {
  const a = Math.round(from * 2000) / 2000;
  const b = Math.max(a + 0.0005, Math.round(to * 2000) / 2000);
  const key = `${p.key}|${a}|${b}|${inset}`;
  let g = geoCache.get(key);
  if (g) return g;
  const t = table(p);
  const pts: Vector2[] = [new Vector2(0, a), new Vector2(radiusAt(p, a) * inset, a)];
  for (let i = 0; i < t.y.length; i++) if (t.y[i] > a && t.y[i] < b) pts.push(new Vector2(t.r[i] * inset, t.y[i]));
  pts.push(new Vector2(radiusAt(p, b) * inset, b), new Vector2(0, b));
  g = new LatheGeometry(pts, 28);
  if (geoCache.size > 600) geoCache.clear();
  geoCache.set(key, g);
  return g;
}
