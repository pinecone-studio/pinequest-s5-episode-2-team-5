/**
 * How a mixture looks: liquid color from Beer–Lambert absorption of every colored
 * species (indicators depend on pH, complexes form on the fly), cloudiness from
 * suspended solids, a settled sediment layer, foam and flames.
 */
import { Color } from 'three';
import { AQ, SOLIDS, type AqId, type SolidId } from './species';
import { cuAmmine, phOf } from './equilibrium';
import { liquidMl, solidVolumeMl, type Mixture } from './mixture';

export interface MixtureLook {
  /** Liquid color, or null when the vessel holds no liquid. */
  liquid: string | null;
  liquidMl: number;
  /** 0..1 cloudiness from suspended solids. */
  turbidity: number;
  /** Settled solids, mL. */
  sedimentMl: number;
  /** Mass-weighted color of the solids, or null. */
  solidColor: string | null;
  solidMetal: boolean;
  foamMl: number;
  burning: boolean;
}

const WHITE = new Color(1, 1, 1);
const tmp = new Color();

/**
 * Beer–Lambert at the reference path. Very high absorbance is compressed: a school vessel is
 * seen through a thin layer and its meniscus, so a strong solution keeps its hue (deep magenta,
 * deep purple) instead of collapsing to black.
 */
function absorb(t: Color, hex: string, exponent: number): void {
  if (exponent <= 1e-4) return;
  if (exponent > 3) exponent = 3 + Math.log(exponent / 3) * 1.5;
  tmp.set(hex);
  t.r *= Math.pow(Math.max(0.002, tmp.r), exponent);
  t.g *= Math.pow(Math.max(0.002, tmp.g), exponent);
  t.b *= Math.pow(Math.max(0.002, tmp.b), exponent);
}

/** Universal indicator color across the pH scale. */
const UI_SCALE: [number, string][] = [
  [0, '#c4161c'],
  [2, '#ea3f22'],
  [4, '#f5a118'],
  [5, '#f2d21a'],
  [6, '#c6dc28'],
  [7, '#4fb83a'],
  [8, '#22a39a'],
  [9, '#2b6dd0'],
  [10, '#3443b6'],
  [12, '#5a2ba0'],
  [14, '#45177a'],
];

export function universalColor(ph: number): string {
  for (let i = 0; i < UI_SCALE.length - 1; i++) {
    const [a, ca] = UI_SCALE[i];
    const [b, cb] = UI_SCALE[i + 1];
    if (ph <= b) {
      const k = Math.min(1, Math.max(0, (ph - a) / (b - a)));
      return '#' + new Color(ca).lerp(new Color(cb), k).getHexString();
    }
  }
  return UI_SCALE[UI_SCALE.length - 1][1];
}

function frac(ph: number, pka: number): number {
  return 1 / (1 + Math.pow(10, pka - ph));
}

function conc(m: Mixture, id: AqId, V: number): number {
  return (m.aq[id] ?? 0) / V;
}

/** Transmitted color of the liquid. */
function liquidColor(m: Mixture, V: number, ph: number): Color {
  const t = WHITE.clone();
  // Plain colored ions and molecules.
  const fe3 = conc(m, 'Fe3', V);
  const scn = conc(m, 'SCN', V);
  const fescn = Math.min(fe3, scn) * 0.9;
  const cu = conc(m, 'Cu', V);
  const ammine = cu > 0 && (m.aq.NH3 ?? 0) > 0 ? cuAmmine(m) : 0;
  const i2 = conc(m, 'I2', V);
  const starch = conc(m, 'starch', V);
  const blue = starch > 0 ? Math.min(i2, starch * 0.3) : 0;
  for (const [id, n] of Object.entries(m.aq) as [AqId, number][]) {
    const def = AQ[id];
    if (!def.color || !def.cRef || n <= 0) continue;
    let c = n / V;
    if (id === 'Fe3') c = Math.max(0, c - fescn);
    if (id === 'Cu') c *= 1 - ammine;
    if (id === 'I2') c = Math.max(0, c - blue);
    absorb(t, def.color, c / def.cRef);
  }
  if (fescn > 0) absorb(t, '#b3101c', fescn / 0.002);
  if (ammine > 0) absorb(t, '#1c2bd6', (cu * ammine) / 0.05);
  if (blue > 0) absorb(t, '#1b1446', blue / 0.0006);
  // Indicators.
  const phph = conc(m, 'phph', V);
  // The base form absorbs green (552 nm) and passes red and violet: magenta, not crimson.
  if (phph > 0) absorb(t, '#e613c4', (phph * frac(ph, 9.3)) / 1e-4);
  const btb = conc(m, 'btb', V);
  if (btb > 0) {
    const b = frac(ph, 7.1);
    absorb(t, '#e3c51a', (btb * (1 - b)) / 2e-5);
    absorb(t, '#2450d4', (btb * b) / 2e-5);
  }
  const mo = conc(m, 'mo', V);
  if (mo > 0) {
    const b = frac(ph, 3.7);
    absorb(t, '#e2342c', (mo * (1 - b)) / 1.5e-5);
    absorb(t, '#f0b400', (mo * b) / 1.5e-5);
  }
  const ui = conc(m, 'ui', V);
  if (ui > 0) absorb(t, universalColor(ph), ui / 8e-5);
  return t;
}

/** Mass-weighted color of a set of solids. */
export function solidsColor(s: Partial<Record<SolidId, number>>, skipMetals = false): { color: Color; metal: boolean; grams: number } {
  const sum = new Color(0, 0, 0);
  let weight = 0;
  let grams = 0;
  let metalGrams = 0;
  for (const [id, n] of Object.entries(s) as [SolidId, number][]) {
    const def = SOLIDS[id];
    const g = n * def.molarMass;
    if (g <= 0 || (skipMetals && def.metal)) continue;
    tmp.set(def.color);
    // Strongly colored precipitates dominate white ones.
    const w = g * (0.4 + (1 - (tmp.r + tmp.g + tmp.b) / 3) * 2.2);
    sum.r += tmp.r * w;
    sum.g += tmp.g * w;
    sum.b += tmp.b * w;
    weight += w;
    grams += g;
    if (def.metal) metalGrams += g;
  }
  if (weight <= 0) return { color: WHITE.clone(), metal: false, grams: 0 };
  return { color: sum.multiplyScalar(1 / weight), metal: metalGrams > grams * 0.5, grams };
}

export function mixtureLook(m: Mixture | undefined): MixtureLook {
  if (!m) return { liquid: null, liquidMl: 0, turbidity: 0, sedimentMl: 0, solidColor: null, solidMetal: false, foamMl: 0, burning: false };
  const ml = liquidMl(m);
  const solids = solidsColor(m.s);
  const solidColor = solids.grams > 0.002 ? '#' + solids.color.getHexString() : null;
  // Stirring and bubbling lift fine powder into the liquid, but never metal pieces.
  const metalMl = Object.entries(m.s).reduce((v, [id, n]) => (SOLIDS[id as SolidId].metal ? v + ((n ?? 0) * SOLIDS[id as SolidId].molarMass) / 5 : v), 0);
  const sedimentMl = metalMl + (solidVolumeMl(m) - metalMl) * (1 - m.cloud * 0.85);
  if (ml < 0.01) {
    return { liquid: null, liquidMl: 0, turbidity: 0, sedimentMl: solidVolumeMl(m), solidColor, solidMetal: solids.metal, foamMl: m.foam, burning: m.burning };
  }
  const V = ml / 1000;
  const ph = phOf(m) ?? 7;
  const t = liquidColor(m, V, ph);
  // Metals sink at once; only fine precipitates and powders stay suspended.
  const floating = solidsColor(m.s, true);
  const suspendedGL = (floating.grams * m.cloud * 1000) / ml;
  // Fine precipitate scatters strongly: 0.3 g/L of chalk already looks milky, not faintly hazy.
  const turbidity = floating.grams > 0.0005 ? 1 - Math.exp(-3 * suspendedGL) : 0;
  // Clear water is drawn faintly blue so it reads as liquid.
  absorb(t, '#e2f0fa', 1);
  if (turbidity > 0) t.lerp(floating.color, Math.min(0.92, turbidity * 0.92));
  return { liquid: '#' + t.getHexString(), liquidMl: ml, turbidity, sedimentMl, solidColor, solidMetal: solids.metal, foamMl: m.foam, burning: m.burning };
}
