import { reactCurriculum } from '../experiments/curriculum/reactions';
/**
 * Everything that takes time: dissolving solids, gases bubbling off, metals reacting
 * with acid or displacing other metals, redox, catalytic decomposition, heating,
 * boiling and evaporation, thermal decomposition and burning ethanol.
 * Rates are tuned so a classroom demo plays out in seconds rather than minutes.
 */
import { ACTIVITY, SOLIDS, solubilityAt, type AqId, type SolidId } from './species';
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
  /** Open to the room's air: hot metals oxidise, the outside can mist over. Sealed rigs leave it off. */
  air?: boolean;
  /** 0..1 light reaching the vessel (photosynthesis). */
  light?: number;
  /** Ambient pressure, kPa (boiling point); 101.325 when unset. */
  pressureKPa?: number;
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
const CRYSTALLIZE: SolidId[] = ['NH4Cl', 'KCl', 'ZnSO4', 'CuSO4_5', 'KMnO4', 'KNO3', 'NaCl', 'Na2CO3', 'NaHCO3', 'NH4NO3', 'sucrose', 'NaOH'];

/** How fast a metal displaces less active metal ions, per metal (not by its place in ACTIVITY). */
const DISPLACE_RATE: Partial<Record<SolidId, number>> = { Al: 0.35, Mg: 0.16, Zn: 0.07, Fe: 0.12 };
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

/** Hottest a vessel gets: a dry crucible over a Bunsen flame glows at ~700 °C, never above the flame. */
const MAX_T = 1000;
/** Room air (22 °C, ~45% RH) mists cold glass below this. */
export const DEW_POINT = 9.5;
/** Flash points of ethanol–water by ethanol volume fraction (closed cup, °C). */
const FLASH: [number, number][] = [[0.05, 62], [0.1, 49], [0.2, 36], [0.3, 29], [0.4, 26], [0.5, 24], [0.7, 21], [0.96, 17], [1, 13]];

export function flashPoint(ethanolFraction: number): number {
  if (ethanolFraction < FLASH[0][0]) return Infinity;
  for (let i = 1; i < FLASH.length; i++) {
    const [f1, t1] = FLASH[i];
    const [f0, t0] = FLASH[i - 1];
    if (ethanolFraction <= f1) return t0 + ((t1 - t0) * (ethanolFraction - f0)) / (f1 - f0);
  }
  return FLASH[FLASH.length - 1][1];
}

/** Boiling point at `kPa` (Clausius–Clapeyron, ΔHvap 40.7 kJ/mol): ~95.6 °C at Ulaanbaatar's 86.5 kPa. */
export function boilingPoint(m: Mixture, kPa = 101.325): number {
  const total = liquidMl(m);
  const f = total > 0 ? m.ethanol / total : 0;
  const atSea = 100 - 22 * Math.pow(f, 0.7);
  const k = 1 / (atSea + 273.15) - (8.314 * Math.log(kPa / 101.325)) / 40700;
  return 1 / k - 273.15;
}

/** Turns the dissolved salts of a drying solution into crystals; volatile leftovers escape. */
export function dryOut(input: Mixture): Mixture {
  const m: Mixture = { ...input, g:{...input.g}, aq: { ...input.aq }, s: { ...input.s } };
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

/**
 * O₂ (mol/s) that pondweed in water gives off in `light` (6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂). About
 * 1.5 mL a minute per gram in bright light near 27 °C; dissolved CO₂/HCO₃⁻ speeds it up.
 */
export function photosynthesisRate(m: Mixture, light: number): number {
  const grams = (m.s.plant ?? 0) * SOLIDS.plant.molarMass;
  if (grams <= 0 || light <= 0 || m.water < 1) return 0;
  const carbon = get(m, 'CO3') / (liquidMl(m) / 1000);
  return grams * Math.min(1, light) * 1e-6 * (0.4 + 0.6 * Math.min(1, carbon / 0.01)) * Math.exp(-(((m.temp - 27) / 12) ** 2));
}

export function step(input: Mixture, dtRaw: number, env: StepEnv): StepResult {
  const dt = Math.min(0.3, Math.max(0, dtRaw));
  const m: Mixture = { ...input, g:{...input.g}, aq: { ...input.aq }, s: { ...input.s }, from: input.from };
  const gas = { CO2: 0, H2: 0, O2: 0, NH3: 0, steam: 0, smoke: 0 };
  const notes: string[] = [];
  let heat = 0; // J released by reactions this step
  let dissolveHeat = 0;
  let changed = false;
  const hadLiquid = liquidMl(m) > 0.02;
  const V = liquidMl(m) / 1000;
  const T = m.temp;
  const warm = 1 + Math.max(0, T - 22) / 25;

  // Grade 9: halogen displacement conserves halogen atoms and ionic charge.
  for (const [oxidant,halide,product,anion] of [['Cl2','Br','Br2','Cl'],['Cl2','I','I2','Cl'],['Br2','I','I2','Br']] as [AqId,AqId,AqId,AqId][]) {
    const dn=Math.min(get(m,oxidant),get(m,halide)/2)*(1-Math.exp(-2*dt));
    if(dn>1e-12){add(m,oxidant,-dn);add(m,halide,-2*dn);add(m,product,dn);add(m,anion,2*dn);changed=true;notes.push('halogen:displacement');}
  }
  const cobalt=m.s.CoCl2??0;
  if(cobalt>0 && m.water>0){const dn=Math.min(cobalt*(1-Math.exp(-2*dt)),m.water/108.09);addS(m,'CoCl2',-dn);addS(m,'CoCl2_6',dn);m.water-=dn*108.09;changed=true;notes.push('hydrate:CoCl2');}
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
      const room = Math.max(0, (solubilityAt(d, m.temp) * nu * V - get(m, key)) / nu);
      if (room <= 0) continue;
      // Dissolving speeds up about twofold per 20 °C — and slows in ice-cold water.
      const k = 0.22 * (m.fine ? 3 : 1) * (1 + 3 * env.stir) * Math.min(4, Math.max(0.3, 2 ** ((T - 22) / 20)));
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
      const cap = solubilityAt(d, m.temp) * V;
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

  // 2. CO₂ over the liquid dissolves as carbonic acid (kept below the fizz threshold); an alkaline
  // liquid absorbs it all as carbonate. Then gases leave the solution.
  const headCo2 = m.g?.CO2 ?? 0;
  if (headCo2 > 1e-12 && m.water > 0.01 && V > 5e-5) {
    const room = Math.max(0, 0.00035 * V - get(m, 'CO3') * acid.co2Fraction) + Math.max(0, -acidityToNeutral(m));
    const dn = Math.min(headCo2, room) * (1 - Math.exp(-1.5 * dt));
    if (dn > 1e-12) {
      m.g = { ...m.g, CO2: headCo2 - dn };
      add(m, 'CO3', dn);
      changed = true;
    }
  }
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
    // Undissociated weak acid also attacks the metal surface: vinegar fizzes on Mg, about 10× slower than HCl.
    const weakAcid = ((get(m, 'Ac') + get(m, 'aceticNeat')) * h / (h + 1.75e-5) + get(m, 'Cit') * h / (h + 10 ** -3.13)) / V;
    const attack = Math.min(h, 2) + 0.08 * Math.min(weakAcid, 5);
    for (let i = 0; i < ACTIVITY.length; i++) {
      const metal = ACTIVITY[i];
      const n = m.s[metal.solid] ?? 0;
      if (n <= 1e-10) continue;
      const surface = Math.min(1.6, Math.pow((n * SOLIDS[metal.solid].molarMass) / 1, 2 / 3)) * (m.fine ? 2 : 1);
      if (metal.acidRate > 0 && acidLeft > 0) {
        const rate = metal.acidRate * 0.0022 * surface * attack * warm;
        const dn = Math.min(n, rate * dt, acidLeft / metal.charge);
        if (dn > 1e-11) {
          addS(m, metal.solid, -dn);
          add(m, metal.ion, dn);
          acidLeft -= dn * metal.charge;
          gas.H2 += dn * metal.charge / 2 / Math.max(dt, 1e-3);
          heat += -metal.dH * 1000 * dn;
          changed = true;
        }
      }
      // M + 2H₂O → M(OH)₂ + H₂ (the hydroxide settles by its Ksp); in steam Mg gives MgO.
      if (metal.waterRate && m.water > 0 && T >= (metal.waterFrom ?? 0)) {
        const left = m.s[metal.solid] ?? 0;
        const rate = metal.waterRate * 0.0022 * surface * 2 ** ((Math.min(T, 100) - 22) / 12);
        const dn = Math.min(left, rate * dt, m.water / 18.015 / 2);
        if (dn > 1e-11) {
          const steam = T >= 99 && metal.solid === 'Mg';
          addS(m, metal.solid, -dn);
          if (steam) addS(m, 'MgO', dn);
          else add(m, metal.ion, dn);
          m.water -= (steam ? 1 : 2) * dn * 18.015;
          gas.H2 += dn / Math.max(dt, 1e-3);
          // About three quarters of the heat the same metal gives with acid.
          heat += -metal.dH * 760 * dn;
          changed = true;
          notes.push(steam ? 'steam:Mg' : `water:${metal.solid}`);
        }
      }
      for (let j = i + 1; j < ACTIVITY.length; j++) {
        const other = ACTIVITY[j];
        const c = get(m, other.ion);
        const left = m.s[metal.solid] ?? 0;
        if (c <= 1e-10 || left <= 1e-10) continue;
        const k = DISPLACE_RATE[metal.solid] ?? 0.05;
        let dnIon = c * (1 - Math.exp(-k * Math.min(1, surface) * warm * dt));
        dnIon = Math.min(dnIon, (left * metal.charge) / other.charge);
        if (dnIon <= 1e-11) continue;
        add(m, other.ion, -dnIon);
        addS(m, other.solid, dnIon);
        addS(m, metal.solid, -(dnIon * other.charge) / metal.charge);
        add(m, metal.ion, (dnIon * other.charge) / metal.charge);
        // ΔH from the ions' enthalpies of formation: Zn + Cu²⁺ → Zn²⁺ + Cu is −218 kJ/mol.
        heat += -((dnIon * other.charge) / metal.charge * metal.dH - dnIon * other.dH) * 1000;
        changed = true;
        notes.push(`displace:${other.solid}`);
      }
    }
    // Marble chips: acid eats the chip surface, so CO₂ comes off over minutes, not at once
    // (10 g chips in 1 M HCl give 2–3 ml/s at first; a 0.1 g chip lasts some 8 minutes). Powder has far more surface. The CO₃²⁻
    // released turns into CO₂ in the acid and bubbles off below. CaCO₃ + 2H⁺: ΔH ≈ −15 kJ/mol.
    const chips = m.s.marble ?? 0;
    if (chips > 1e-10 && acidLeft > 0) {
      const surface = Math.pow(chips * SOLIDS.marble.molarMass, 2 / 3) * (m.fine ? 6 : 1);
      const dn = Math.min(chips, 2.5e-5 * surface * attack * warm * dt, acidLeft / 2);
      if (dn > 1e-11) {
        addS(m, 'marble', -dn);
        add(m, 'Ca', dn);
        add(m, 'CO3', dn);
        acidLeft -= 2 * dn;
        heat += 15200 * dn;
        changed = true;
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
      const oxideCatalyst=Math.min(.35,(m.s.Fe2O3??0)*12+(m.s.PbO2??0)*40+(m.s.CuO??0)*8);
      const k = (0.0008 + oxideCatalyst + 2.4 * iodide + 0.5 * mno2 + 0.6 * (get(m, 'Fe3') / V)) * Math.pow(2, (T - 22) / 10);
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
    if((m.s.CuCO3??0)>1e-10 && T>200){const dn=(m.s.CuCO3??0)*(1-Math.exp(-.08*dt));addS(m,'CuCO3',-dn);addS(m,'CuO',dn);gas.CO2+=dn/Math.max(dt,.001);changed=true;notes.push('decompose:CuCO3');}
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

  // Pondweed in lit water gives off oxygen bubbles.
  const o2Plant = photosynthesisRate(m, env.light ?? 0);
  if (o2Plant > 0) {
    add(m, 'CO3', -Math.min(get(m, 'CO3'), o2Plant * dt));
    gas.O2 += o2Plant;
    if (o2Plant > 2e-7) notes.push('photosynthesis');
    changed = true;
  }

  // 6. Burning ethanol: its vapour catches once the liquid is at its flash point (17 °C for 96%);
  // below about 22% ethanol the flame cannot keep going, so dilute solutions do not catch at all.
  const liquid = liquidMl(m);
  const ethFrac = liquid > 0 ? m.ethanol / liquid : 0;
  if (!m.burning && env.flame && m.ethanol > 0.5 && ethFrac >= 0.22 && T >= flashPoint(ethFrac)) {
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
  let power = env.heatW + heat / Math.max(dt, 1e-3) - env.lossWK * (m.temp - ROOM_T);
  // Ice absorbs latent heat at its mixture's melting point. Dissolved or still-solid
  // NaCl lowers the transition temperature; the solvent mass includes liquid and ice.
  const ice=m.s.ice??0;
  const solventKg=(m.water+ice*18.015)/1000;
  const saltMol=(m.s.NaCl??0)+Math.min(m.aq.Na??0,m.aq.Cl??0);
  const meltPoint=solventKg>0&&saltMol>0?-Math.min(21.1,3.72*saltMol/solventKg):0;
  if(ice>0&&m.temp+power*dt/capacity>=meltPoint){
    const energy=Math.max(0,(m.temp-meltPoint)*capacity+power*dt);
    const dn=Math.min(ice,energy/(334*18.015));
    m.s.ice=ice-dn;m.water+=dn*18.015;
    // Energy left after the last ice melts warms the melt up from its melting point.
    m.temp=(m.s.ice??0)>1e-10?meltPoint:meltPoint+Math.max(0,energy-dn*334*18.015)/(heatCapacity(m)+env.glassJK);
    power=0;changed=true;
  }
  let boiling = false;
  if (liquidMl(m) > 0.005) {
    const bp = boilingPoint(m, env.pressureKPa);
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
  m.temp = Math.min(MAX_T, Math.max(-15, m.temp));
  // Cold glass mists over with the room's water vapour, and dries off again once it warms up.
  if (env.air) {
    const dew = m.dew ?? 0;
    const cold = m.temp < DEW_POINT && (liquidMl(m) > 0.5 || (m.s.ice ?? 0) > 1e-4);
    const next = cold ? dew + 0.004 * (DEW_POINT - m.temp) * dt : Math.max(0, dew - 0.01 * Math.max(0.5, m.temp - DEW_POINT) * dt);
    if (next !== dew) {
      if (dew === 0 && next > 0) notes.push('dew');
      m.dew = next > 1e-6 ? next : 0;
      changed = true;
    }
  }

  // 8. Settling, foam.
  const fizz = gas.CO2 + gas.H2 + gas.O2;
  const stirred = Math.max(env.stir, Math.min(1, fizz * 40), boiling ? 0.8 : 0);
  // Fine hydroxide/halide precipitates remain visibly suspended before settling.
  const settlingSeconds=['CuOH2','FeOH3','FeOH2','AgCl','BaSO4','CaCO3','AlOH3','NiOH2'].some(id=>(m.s[id as SolidId]??0)>1e-10)?45:5;
  m.cloud = Math.max(stirred, m.cloud * Math.exp(-dt / settlingSeconds));
  if (gas.O2 > 0 || gas.CO2 > 0) {
    const soap = get(m, 'soap') > 1e-6 ? 1 : 0.06;
    m.foam += (gas.O2 + gas.CO2) * dt * 24000 * 1.1 * soap;
  }
  // Keep an active eruption substantial, then drain the remaining foam promptly.
  m.foam *= Math.exp(-dt / (fizz > 1e-8 ? 4 : 1.4));

  let out = clean(m);
  if (hadLiquid && liquidMl(out) < 0.02) {
    out = dryOut(out);
    notes.push('dry');
    changed = true;
  }
  const magnesium=out.s.Mg??0;
  const curriculumChanges=reactCurriculum(out,dt,!!env.air);if(curriculumChanges.length){changed=true;notes.push(...curriculumChanges.map(c=>c.equation));}
  // Burning magnesium: blinding white flame, white MgO smoke.
  if(env.air&&magnesium-(out.s.Mg??0)>1e-9){notes.push('burn:Mg');gas.smoke+=(magnesium-(out.s.Mg??0))*40/Math.max(dt,1e-3);}
  // Equilibria only depend on composition, so skip the solve when nothing reacted.
  const eq = changed ? equilibrate(out) : { m: out, formed: [] as SolidId[] };
  out = eq.m;
  return { m: out, gas, boiling, changed, notes, formed: eq.formed };
}
