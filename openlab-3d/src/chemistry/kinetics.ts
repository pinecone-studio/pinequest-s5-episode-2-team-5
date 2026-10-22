/**
 * Everything that takes time: dissolving solids, gases bubbling off, metals reacting
 * with acid or displacing other metals, redox, catalytic decomposition, heating,
 * boiling and evaporation, thermal decomposition and burning ethanol.
 * Rates are tuned so a classroom demo plays out in seconds rather than minutes.
 */
import { ACTIVITY, SOLIDS, type AqId, type SolidId } from './species';
import { acidState, acidityToNeutral, equilibrate } from './equilibrium';
import { ROOM_T, clean, heatCapacity, liquidMl, type Mixture } from './mixture';

export interface StepEnv {
  /** External heating power reaching the vessel, W. */
  heatW: number;
  /** Heat capacity of the empty vessel, J/K. */
  glassJK: number;
  /** Heat loss to the room, W/K. */
  lossWK: number;
  /** 0..1, glass rod stirring. */
  stir: number;
  /** A watch glass or lid is on top (smothers a fire). */
  covered: boolean;
  /** A CO₂ extinguisher is aimed at it. */
  co2: boolean;
  /** Sits in/over an open flame (can ignite ethanol vapour). */
  flame: boolean;
}

export interface StepResult {
  m: Mixture;
  /** Gas released, mol/s. `steam` is water evaporating, g/s. */
  gas: { CO2: number; H2: number; O2: number; NH3: number; steam: number; smoke: number };
  boiling: boolean;
  /** Composition changed noticeably (store it, re-render). */
  changed: boolean;
  notes: string[];
  formed: SolidId[];
}

export const DEFAULT_ENV: StepEnv = { heatW: 0, glassJK: 100, lossWK: 6, stir: 0, covered: false, co2: false, flame: false };

/** Soluble solids, in the order they crystallize out when a solution dries. */
const CRYSTALLIZE: SolidId[] = ['CuSO4_5', 'KMnO4', 'NaCl', 'Na2CO3', 'NaHCO3', 'NH4NO3', 'sucrose', 'NaOH'];

const LATENT_WATER = 1130; // J/g (halved latent heat so evaporation demos are quick)
const LATENT_ETHANOL = 1500;

function get(m: Mixture, id: AqId): number {
  return m.aq[id] ?? 0;
}

function add(m: Mixture, id: AqId, n: number): void {
  m.aq[id] = Math.max(0, (m.aq[id] ?? 0) + n);
}

function addS(m: Mixture, id: SolidId, n: number): void {
  m.s[id] = Math.max(0, (m.s[id] ?? 0) + n);
}

function boilingPoint(m: Mixture): number {
  const total = liquidMl(m);
  if (total <= 0) return 100;
  const f = m.ethanol / total;
  return 100 - 22 * Math.pow(f, 0.7);
}

/** Turns the dissolved salts of a drying solution into crystals; volatile leftovers escape. */
export function dryOut(input: Mixture): Mixture {
  const m: Mixture = { ...input, aq: { ...input.aq }, s: { ...input.s } };
  for (const id of CRYSTALLIZE) {
    const d = SOLIDS[id].dissolve;
    if (!d) continue;
    let x = Infinity;
    for (const [p, nu] of Object.entries(d.products) as [AqId, number][]) x = Math.min(x, get(m, p) / nu);
    if (!Number.isFinite(x) || x <= 1e-10) continue;
    for (const [p, nu] of Object.entries(d.products) as [AqId, number][]) add(m, p, -x * nu);
    addS(m, id, x);
  }
  // Remaining metal ions end up as an unspecified salt; HCl, acetic acid, NH₃, CO₂ evaporate.
  let leftover = 0;
  for (const id of ['K', 'Li', 'Ca', 'Ba', 'Mg', 'Zn', 'Cu', 'Fe2', 'Fe3', 'Mn', 'Na', 'Ag', 'Pb'] as AqId[]) {
    leftover += get(m, id);
    delete m.aq[id];
  }
  for (const id of ['Cl', 'I', 'NO3', 'SO4', 'SCN', 'MnO4', 'Ac', 'NH3', 'CO3', 'H2O2'] as AqId[]) delete m.aq[id];
  if (leftover > 1e-9) addS(m, 'salt', leftover);
  m.water = 0;
  m.ethanol = 0;
  m.burning = false;
  return clean(m);
}

export function step(input: Mixture, dtRaw: number, env: StepEnv): StepResult {
  const dt = Math.min(0.3, Math.max(0, dtRaw));
  const m: Mixture = { ...input, aq: { ...input.aq }, s: { ...input.s }, from: input.from };
  const gas = { CO2: 0, H2: 0, O2: 0, NH3: 0, steam: 0, smoke: 0 };
  const notes: string[] = [];
  let heat = 0; // J released by reactions this step
  let dissolveHeat = 0;
  let changed = false;
  const hadLiquid = liquidMl(m) > 0.02;
  const V = liquidMl(m) / 1000;
  const T = m.temp;
  const warm = 1 + Math.max(0, T - 22) / 25;

  // 1. Anhydrous copper sulfate takes up water first (white → blue), then everything dissolves.
  const anh = m.s.CuSO4 ?? 0;
  if (anh > 1e-10 && m.water > 0.001) {
    const dn = Math.min(anh * (1 - Math.exp(-2.5 * dt)) + Math.min(anh, 1e-6), m.water / 90);
    addS(m, 'CuSO4', -dn);
    addS(m, 'CuSO4_5', dn);
    m.water -= dn * 90;
    heat += 78000 * dn;
    dissolveHeat += 78000 * dn;
    changed = true;
    notes.push('hydrate:CuSO4');
  }
  if (V > 5e-5) {
    for (const [id, n] of Object.entries(m.s) as [SolidId, number][]) {
      const d = SOLIDS[id].dissolve;
      if (!d || n <= 0) continue;
      const [key, nu] = Object.entries(d.products)[0] as [AqId, number];
      const room = Math.max(0, (d.solubility * nu * V - get(m, key)) / nu);
      if (room <= 0) continue;
      const k = 0.22 * (m.fine ? 3 : 1) * (1 + 3 * env.stir) * warm;
      const dn = Math.min(n * (1 - Math.exp(-k * dt)) + Math.min(n, 2e-6), room, n);
      if (dn <= 0) continue;
      addS(m, id, -dn);
      for (const [p, k2] of Object.entries(d.products) as [AqId, number][]) add(m, p, dn * k2);
      if (d.water) m.water += dn * d.water * 0.018;
      heat += -d.dH * 1000 * dn;
      dissolveHeat += -d.dH * 1000 * dn;
      changed = true;
    }
    // Supersaturated (evaporating) solutions grow crystals.
    for (const id of CRYSTALLIZE) {
      const d = SOLIDS[id].dissolve;
      if (!d) continue;
      let avail = Infinity;
      for (const [p, nu] of Object.entries(d.products) as [AqId, number][]) avail = Math.min(avail, get(m, p) / nu);
      const cap = d.solubility * V;
      if (avail > cap * 1.03 && avail > 1e-7) {
        const x = (avail - cap) * 0.6;
        for (const [p, nu] of Object.entries(d.products) as [AqId, number][]) add(m, p, -x * nu);
        addS(m, id, x);
        changed = true;
        notes.push(`crystal:${id}`);
      }
    }
  }

  const acid = acidState(m);
  const h = acid.h;

  // 2. Gases leaving the solution.
  if (V > 5e-5) {
    const co2 = get(m, 'CO3') * acid.co2Fraction;
    const escapable = Math.max(0, co2 - 0.0004 * V);
    if (escapable > 1e-9) {
      const dn = escapable * (1 - Math.exp(-1.8 * warm * dt));
      add(m, 'CO3', -dn);
      gas.CO2 += dn / Math.max(dt, 1e-3);
      changed = true;
    }
    const nh3 = get(m, 'NH3') * acid.nh3Fraction;
    if (nh3 > 1e-7) {
      const dn = nh3 * (1 - Math.exp(-0.004 * (1 + Math.max(0, T - 30) / 6) * dt));
      add(m, 'NH3', -dn);
      gas.NH3 += dn / Math.max(dt, 1e-3);
      if (dn > 1e-9) changed = true;
    }
  }

  // 3. Metals: acid → H₂, and displacement of less active metals.
  if (V > 5e-5) {
    let acidLeft = Math.max(0, acidityToNeutral(m)) * 0.45;
    for (let i = 0; i < ACTIVITY.length; i++) {
      const metal = ACTIVITY[i];
      const n = m.s[metal.solid] ?? 0;
      if (n <= 1e-10) continue;
      const surface = Math.min(1.6, Math.pow((n * SOLIDS[metal.solid].molarMass) / 1, 2 / 3)) * (m.fine ? 2 : 1);
      if (metal.acidRate > 0 && acidLeft > 0) {
        const rate = metal.acidRate * 0.0022 * surface * Math.min(h, 2) * warm;
        const dn = Math.min(n, rate * dt, acidLeft / metal.charge);
        if (dn > 1e-11) {
          addS(m, metal.solid, -dn);
          add(m, metal.ion, dn);
          acidLeft -= dn * metal.charge;
          gas.H2 += dn / Math.max(dt, 1e-3);
          heat += -metal.dH * 1000 * dn;
          changed = true;
        }
      }
      for (let j = i + 1; j < ACTIVITY.length; j++) {
        const other = ACTIVITY[j];
        const c = get(m, other.ion);
        const left = m.s[metal.solid] ?? 0;
        if (c <= 1e-10 || left <= 1e-10) continue;
        const k = [0.35, 0.16, 0.07, 0.12][i] ?? 0.05;
        let dnIon = c * (1 - Math.exp(-k * Math.min(1, surface) * warm * dt));
        dnIon = Math.min(dnIon, (left * metal.charge) / other.charge);
        if (dnIon <= 1e-11) continue;
        add(m, other.ion, -dnIon);
        addS(m, other.solid, dnIon);
        addS(m, metal.solid, -(dnIon * other.charge) / metal.charge);
        add(m, metal.ion, (dnIon * other.charge) / metal.charge);
        changed = true;
        notes.push(`displace:${other.solid}`);
      }
    }
  }

  // 4. Redox and decomposition.
  if (V > 5e-5) {
    const mno4 = get(m, 'MnO4');
    const h2o2 = get(m, 'H2O2');
    if (mno4 > 1e-10 && h2o2 > 1e-10) {
      if (h > 1e-4) {
        const dn = Math.min(mno4, (h2o2 * 2) / 5) * (1 - Math.exp(-4 * dt));
        add(m, 'MnO4', -dn);
        add(m, 'H2O2', -2.5 * dn);
        add(m, 'Mn', dn);
        gas.O2 += (2.5 * dn) / Math.max(dt, 1e-3);
      } else {
        const dn = Math.min(mno4, (h2o2 * 2) / 3) * (1 - Math.exp(-0.7 * dt));
        add(m, 'MnO4', -dn);
        add(m, 'H2O2', -1.5 * dn);
        addS(m, 'MnO2', dn);
        gas.O2 += (1.5 * dn) / Math.max(dt, 1e-3);
        notes.push('ppt:MnO2');
      }
      changed = true;
    }
    const fe2 = get(m, 'Fe2');
    if (get(m, 'MnO4') > 1e-10 && fe2 > 1e-10 && h > 1e-5) {
      const dn = Math.min(get(m, 'MnO4'), fe2 / 5) * (1 - Math.exp(-6 * dt));
      add(m, 'MnO4', -dn);
      add(m, 'Fe2', -5 * dn);
      add(m, 'Mn', dn);
      add(m, 'Fe3', 5 * dn);
      changed = true;
    }
    const peroxide = get(m, 'H2O2');
    if (peroxide > 1e-9) {
      const iodide = get(m, 'I') / V;
      const mno2 = Math.min(1, (m.s.MnO2 ?? 0) * 300);
      const k = (0.0008 + 2.4 * iodide + 0.5 * mno2 + 0.6 * (get(m, 'Fe3') / V)) * Math.pow(2, (T - 22) / 10);
      const dn = peroxide * (1 - Math.exp(-k * dt));
      if (dn > 1e-10) {
        add(m, 'H2O2', -dn);
        m.water += dn * 0.018;
        gas.O2 += dn / 2 / Math.max(dt, 1e-3);
        heat += 98000 * dn;
        if (dn > 1e-7) changed = true;
      }
    }
  }
  // Iron(II) hydroxide darkens in air.
  const feoh2 = m.s.FeOH2 ?? 0;
  if (feoh2 > 1e-10) {
    const dn = feoh2 * (1 - Math.exp(-0.025 * dt));
    addS(m, 'FeOH2', -dn);
    addS(m, 'FeOH3', dn);
    changed = true;
  }

  // 5. Heat-driven decompositions.
  if ((m.s.CuOH2 ?? 0) > 1e-10 && T > 70) {
    const dn = (m.s.CuOH2 ?? 0) * (1 - Math.exp(-0.12 * ((T - 70) / 20) * dt));
    addS(m, 'CuOH2', -dn);
    addS(m, 'CuO', dn);
    changed = true;
    notes.push('decompose:CuOH2');
  }
  const dry = liquidMl(m) < 0.02;
  if (dry) {
    if ((m.s.CuSO4_5 ?? 0) > 1e-10 && T > 105) {
      const dn = (m.s.CuSO4_5 ?? 0) * (1 - Math.exp(-0.1 * Math.min(3, (T - 105) / 30) * dt));
      addS(m, 'CuSO4_5', -dn);
      addS(m, 'CuSO4', dn);
      gas.steam += (dn * 5 * 18) / Math.max(dt, 1e-3);
      changed = true;
      notes.push('decompose:CuSO4_5');
    }
    if ((m.s.NaHCO3 ?? 0) > 1e-10 && T > 100) {
      const dn = (m.s.NaHCO3 ?? 0) * (1 - Math.exp(-0.07 * Math.min(3, (T - 100) / 30) * dt));
      addS(m, 'NaHCO3', -dn);
      addS(m, 'Na2CO3', dn / 2);
      gas.CO2 += dn / 2 / Math.max(dt, 1e-3);
      changed = true;
      notes.push('decompose:NaHCO3');
    }
    if ((m.s.sucrose ?? 0) > 1e-10 && T > 170) {
      const dn = (m.s.sucrose ?? 0) * (1 - Math.exp(-0.12 * dt));
      addS(m, 'sucrose', -dn);
      addS(m, 'caramel', dn);
      changed = true;
      notes.push('decompose:sucrose');
    }
    if ((m.s.caramel ?? 0) > 1e-10 && T > 215) {
      const dn = (m.s.caramel ?? 0) * (1 - Math.exp(-0.1 * dt));
      addS(m, 'caramel', -dn);
      addS(m, 'C', dn * 12);
      gas.smoke += dn * 50 / Math.max(dt, 1e-3);
      changed = true;
      notes.push('decompose:caramel');
    }
  }

  // 6. Burning ethanol.
  const liquid = liquidMl(m);
  const ethFrac = liquid > 0 ? m.ethanol / liquid : 0;
  if (!m.burning && env.flame && m.ethanol > 1 && ethFrac > 0.3 && T > 35) {
    m.burning = true;
    notes.push('ignite');
  }
  if (m.burning) {
    if (env.covered) {
      m.burning = false;
      notes.push('smother');
    } else if (env.co2) {
      m.burning = false;
      notes.push('extinguish');
    } else if (m.ethanol < 0.2 || ethFrac < 0.22) {
      m.burning = false;
      notes.push('burnout');
    } else {
      const burned = Math.min(m.ethanol, 0.25 * dt);
      m.ethanol -= burned;
      heat += burned * 0.789 * 29700 * 0.04;
      gas.smoke += burned;
      changed = true;
    }
  }

  // 7. Temperature, boiling and evaporation.
  const capacity = heatCapacity(m) + env.glassJK;
  // Announce a noticeable warming or cooling rate from dissolving (°C per second).
  const dissolveRate = dissolveHeat / capacity / Math.max(dt, 1e-3);
  if (dissolveRate < -0.3) notes.push('dissolve:cold');
  else if (dissolveRate > 0.3) notes.push('dissolve:hot');
  const power = env.heatW + heat / Math.max(dt, 1e-3) - env.lossWK * (m.temp - ROOM_T);
  let boiling = false;
  if (liquidMl(m) > 0.005) {
    const bp = boilingPoint(m);
    const next = m.temp + (power * dt) / capacity;
    if (next >= bp && power > 0) {
      // Energy above the boiling point goes into evaporation.
      const toBp = Math.max(0, ((bp - m.temp) * capacity) / Math.max(dt, 1e-3));
      let excess = Math.max(0, power - toBp) * dt;
      m.temp = bp;
      boiling = excess > 0.5;
      if (m.ethanol > 0 && excess > 0) {
        const g = Math.min(m.ethanol * 0.789, excess / LATENT_ETHANOL);
        m.ethanol -= g / 0.789;
        excess -= g * LATENT_ETHANOL;
      }
      if (m.water > 0 && excess > 0) {
        const g = Math.min(m.water, excess / LATENT_WATER);
        m.water -= g;
        gas.steam += g / Math.max(dt, 1e-3);
      }
      changed = true;
    } else {
      m.temp = next;
    }
  } else {
    m.temp += (power * dt) / capacity;
  }
  m.temp = Math.min(450, Math.max(-15, m.temp));

  // 8. Settling, foam.
  const fizz = gas.CO2 + gas.H2 + gas.O2;
  const stirred = Math.max(env.stir, Math.min(1, fizz * 40), boiling ? 0.8 : 0);
  m.cloud = Math.max(stirred, m.cloud * Math.exp(-dt / 5));
  if (gas.O2 > 0 || gas.CO2 > 0) {
    const soap = get(m, 'soap') > 1e-6 ? 1 : 0.06;
    m.foam += (gas.O2 + gas.CO2) * dt * 24000 * 1.1 * soap;
  }
  m.foam *= Math.exp(-dt / 12);

  let out = clean(m);
  if (hadLiquid && liquidMl(out) < 0.02) {
    out = dryOut(out);
    notes.push('dry');
    changed = true;
  }
  // Equilibria only depend on composition, so skip the solve when nothing reacted.
  const eq = changed ? equilibrate(out) : { m: out, formed: [] as SolidId[] };
  out = eq.m;
  return { m: out, gas, boiling, changed, notes, formed: eq.formed };
}
