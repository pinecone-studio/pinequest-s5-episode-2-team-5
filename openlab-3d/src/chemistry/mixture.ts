import { GASES, type GasId } from '../experiments/curriculum/materials';
/**
 * What a vessel holds: water and ethanol volumes, dissolved species and solids in moles,
 * temperature and a few physical flags. Mixtures are plain objects so they can live in
 * a zustand store; every operation returns a new mixture.
 */
import { AQ, SOLIDS, type AqId, type SolidId } from './species';
import { REAGENTS, type ReagentId } from './reagents';

export interface Mixture {
  /** Gases in mol; transferred through cylinders and apparatus ports. */
  g?: Partial<Record<GasId,number>>;
  /** Liquid water, mL. */
  water: number;
  /** Liquid ethanol, mL (miscible with water). */
  ethanol: number;
  /** Dissolved species, mol. */
  aq: Partial<Record<AqId, number>>;
  /** Solids (crystals, metals, precipitates), mol. */
  s: Partial<Record<SolidId, number>>;
  /** °C */
  temp: number;
  /** 0..1: how much of the solid is stirred up (cloudy) rather than settled. */
  cloud: number;
  /** Solids ground to a powder (dissolve and react faster). */
  fine: boolean;
  /** Ethanol is on fire. */
  burning: boolean;
  /** Foam volume above the liquid, mL. */
  foam: number;
  /** Reagents poured in, in order (used for names). */
  from: ReagentId[];
}

export const ROOM_T = 22;
const TINY = 1e-12;

export function emptyMixture(temp = ROOM_T): Mixture {
  return { water: 0, ethanol: 0, aq: {}, s: {}, temp, cloud: 0, fine: false, burning: false, foam: 0, from: [] };
}

export function liquidMl(m: Mixture): number {
  return m.water + m.ethanol + Object.entries(m.aq).reduce((v,[id,n])=>{const d=AQ[id as AqId];return v+(d.density?(n??0)*d.molarMass/d.density:0);},0);
}

export function solidMassG(m: Mixture): number {
  let g = 0;
  for (const [id, n] of Object.entries(m.s) as [SolidId, number][]) g += n * SOLIDS[id].molarMass;
  return g;
}

/** Apparent volume of the solids (for the sediment layer), mL. */
export function solidVolumeMl(m: Mixture): number {
  let v = 0;
  for (const [id, n] of Object.entries(m.s) as [SolidId, number][]) v += (n * SOLIDS[id].molarMass) / (SOLIDS[id].metal ? 5 : 1.6);
  return v;
}

export function dissolvedMassG(m: Mixture): number {
  let g = 0;
  for (const [id, n] of Object.entries(m.aq) as [AqId, number][]) g += n * AQ[id].molarMass;
  return g;
}

/** Everything in the vessel, in grams (for the balance). */
export function contentMassG(m: Mixture): number {
  return m.water + m.ethanol * 0.789 + dissolvedMassG(m) + solidMassG(m) + Object.entries(m.g??{}).reduce((s,[id,n])=>s+(n??0)*GASES[id as GasId].molarMass,0);
}

/** J/K of the contents (glass is added by the caller). */
export function heatCapacity(m: Mixture): number {
  return 4.18 * m.water + 1.93 * m.ethanol + 0.8 * solidMassG(m) + 2 * Object.entries(m.aq).reduce((s,[id,n])=>s+(AQ[id as AqId].density?(n??0)*AQ[id as AqId].molarMass:0),0) + 1.3*(m.s.ice??0)*18.015;
}

export function isEmptyMixture(m: Mixture | undefined): boolean {
  return !m || (liquidMl(m) < 0.01 && solidMassG(m) < 0.002 && gasMl(m) < .001);
}

export function hasSolids(m: Mixture): boolean {
  return solidMassG(m) > 0.002;
}

/** A fresh portion of a stock reagent: `amount` mL for liquids, g for solids. */
export function reagentMixture(id: ReagentId, amount: number): Mixture {
  const r = REAGENTS[id];
  const m = emptyMixture(r.temperature);
  m.from = [id];
  if(r.gas||r.gasBlend){m.g=r.gas?{[r.gas]:amount/24000}:Object.fromEntries(Object.entries(r.gasBlend??{}).map(([id,f])=>[id,amount*(f??0)/24000]));return m;}
  if(r.blend&&r.container==='reagentJar'){for(const [id,f] of Object.entries(r.blend))m.s[id as SolidId]=amount*(f??0)/SOLIDS[id as SolidId].molarMass;return m;}
  if(r.liquid||r.liquidBlend){for(const [id,f] of Object.entries(r.liquid?{[r.liquid]:1}:r.liquidBlend??{})){const d=AQ[id as AqId];m.aq[id as AqId]=amount*(f??0)*(d.density??1)/d.molarMass;}return m;}
  if (r.solid) {
    m.s[r.solid] = amount / SOLIDS[r.solid].molarMass;
    return m;
  }
  const sol = r.solution ?? { solutes: {} };
  m.ethanol = amount * (sol.ethanol ?? 0);
  m.water = amount - m.ethanol;
  for (const [k, c] of Object.entries(sol.solutes) as [AqId, number][]) m.aq[k] = (c * amount) / 1000;
  if(r.solvent){m.water=0;const d=AQ[r.solvent];m.aq[r.solvent]=amount*(d.density??1)/d.molarMass;}
  if(r.blend&&r.container!=='reagentJar')for(const [id,f] of Object.entries(r.blend))m.s[id as SolidId]=amount*(f??0)/1000/SOLIDS[id as SolidId].molarMass;
  if(id==='water'||id==='cold_water'||id==='hot_water')m.aq.dissolvedO2=amount*2.6e-7;
  if(id==='tomato')m.s.paper=amount*.02/162.14;
  return m;
}

function addInto<K extends string>(target: Partial<Record<K, number>>, source: Partial<Record<K, number>>, k = 1): void {
  for (const [id, n] of Object.entries(source) as [K, number][]) target[id] = (target[id] ?? 0) + n * k;
}

/** Drops vanishing amounts and negative rounding errors. */
export function clean(m: Mixture): Mixture {
  const aq: Partial<Record<AqId, number>> = {};
  for (const [id, n] of Object.entries(m.aq) as [AqId, number][]) if (n > TINY) aq[id] = n;
  const s: Partial<Record<SolidId, number>> = {};
  for (const [id, n] of Object.entries(m.s) as [SolidId, number][]) if (n > TINY) s[id] = n;
  const water = m.water > 1e-6 ? m.water : 0;
  const ethanol = m.ethanol > 1e-6 ? m.ethanol : 0;
  return { ...m, g:Object.fromEntries(Object.entries(m.g??{}).filter(([,n])=>(n??0)>1e-12)), water, ethanol, aq, s, burning: m.burning && ethanol > 0.05, foam: m.foam > 0.5 ? m.foam : 0, cloud: Math.min(1, Math.max(0, m.cloud)) };
}

export function scaleMixture(m: Mixture, k: number): Mixture {
  const aq: Partial<Record<AqId, number>> = {};
  addInto(aq, m.aq, k);
  const s: Partial<Record<SolidId, number>> = {};
  addInto(s, m.s, k);
  return { ...m, water: m.water * k, ethanol: m.ethanol * k, aq, s, g:Object.fromEntries(Object.entries(m.g??{}).map(([id,n])=>[id,(n??0)*k])), foam: m.foam * k, from: [...m.from] };
}

/** Pours `b` into `a`: amounts add, temperature mixes by heat capacity. */
export function merge(a: Mixture, b: Mixture): Mixture {
  const ca = heatCapacity(a) + 1e-6;
  const cb = heatCapacity(b) + 1e-6;
  const aq: Partial<Record<AqId, number>> = { ...a.aq };
  addInto(aq, b.aq);
  const s: Partial<Record<SolidId, number>> = { ...a.s };
  addInto(s, b.s);
  const from = [...a.from];
  for (const id of b.from) if (!from.includes(id)) from.push(id);
  const sa = solidMassG(a);
  const sb = solidMassG(b);
  return clean({
    g:mergeGases(a.g,b.g),
    water: a.water + b.water,
    ethanol: a.ethanol + b.ethanol,
    aq,
    s,
    temp: (a.temp * ca + b.temp * cb) / (ca + cb),
    // Pouring stirs things up.
    cloud: sb > 0.001 || liquidMl(b) > 1 ? Math.max(a.cloud, 0.7) : a.cloud,
    fine: (sa > 0.001 && a.fine) || (sb > 0.001 && b.fine),
    burning: a.burning,
    foam: a.foam + b.foam,
    from,
  });
}

/**
 * Pours `ml` of liquid out: dissolved species leave in proportion, suspended solids
 * follow the liquid, settled solids stay behind (decanting) unless the vessel is emptied.
 */
export function takeLiquid(m: Mixture, ml: number): { taken: Mixture; rest: Mixture } {
  const total = liquidMl(m);
  if (total <= 1e-6) {
    const gas=gasMl(m);if(gas>1e-9){const f=Math.min(1,ml/gas),taken=emptyMixture(m.temp);taken.g=Object.fromEntries(Object.entries(m.g??{}).map(([id,n])=>[id,(n??0)*f]));taken.from=[...m.from];return {taken,rest:clean({...m,g:Object.fromEntries(Object.entries(m.g??{}).map(([id,n])=>[id,(n??0)*(1-f)]))})};}
    return takeSolid(m, ml);
  }
  const f = Math.min(1, ml / total);
  const solidShare = f > 0.97 ? 1 : f * Math.max(0.15, m.cloud);
  const taken = emptyMixture(m.temp);
  const rest: Mixture = { ...m, aq: {}, s: {}, from: [...m.from] };
  taken.water = m.water * f;
  taken.ethanol = m.ethanol * f;
  rest.water = m.water - taken.water;
  rest.ethanol = m.ethanol - taken.ethanol;
  for (const [id, n] of Object.entries(m.aq) as [AqId, number][]) {
    taken.aq[id] = n * f;
    rest.aq[id] = n * (1 - f);
  }
  for (const [id, n] of Object.entries(m.s) as [SolidId, number][]) {
    taken.s[id] = n * solidShare;
    rest.s[id] = n * (1 - solidShare);
  }
  taken.cloud = m.cloud;
  taken.fine = m.fine;
  taken.from = [...m.from];
  return { taken: clean(taken), rest: clean(rest) };
}

/** Takes `grams` of the solids (a spatula scoop, or tipping a jar). */
export function takeSolid(m: Mixture, grams: number): { taken: Mixture; rest: Mixture } {
  const mass = solidMassG(m);
  const taken = emptyMixture(m.temp);
  taken.from = [...m.from];
  taken.fine = m.fine;
  if (mass <= 1e-6) return { taken, rest: m };
  const f = Math.min(1, grams / mass);
  const rest: Mixture = { ...m, s: {}, from: [...m.from] };
  for (const [id, n] of Object.entries(m.s) as [SolidId, number][]) {
    taken.s[id] = n * f;
    rest.s[id] = n * (1 - f);
  }
  return { taken: clean(taken), rest: clean(rest) };
}

/** Main solid by mass, if any. */
export function mainSolid(m: Mixture): SolidId | null {
  let best: SolidId | null = null;
  let bestG = 0.0005;
  for (const [id, n] of Object.entries(m.s) as [SolidId, number][]) {
    const g = n * SOLIDS[id].molarMass;
    if (g > bestG) {
      bestG = g;
      best = id;
    }
  }
  return best;
}

export function gasMl(m:Mixture):number {return Object.values(m.g??{}).reduce<number>((sum,n)=>sum+(n??0),0)*24000;}
function mergeGases(a:Mixture['g'],b:Mixture['g']):Mixture['g']{const result={...a};for(const [id,n] of Object.entries(b??{}))result[id as GasId]=(result[id as GasId]??0)+(n??0);return result;}
