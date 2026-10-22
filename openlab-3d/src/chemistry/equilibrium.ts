/**
 * Fast equilibria, solved every time a mixture changes:
 *  - pH from the charge balance. Strong acids and bases are stored only as their
 *    counter-ions (HCl → Cl⁻, NaOH → Na⁺), so H⁺ and OH⁻ follow from electroneutrality,
 *    with the acetate, ammonium, carbonate and Fe³⁺ hydrolysis equilibria on top.
 *  - Precipitation and re-dissolution of hydroxides and sparingly soluble salts (Ksp).
 *  - The deep-blue copper–ammine complex, which keeps Cu²⁺ from precipitating.
 */
import { ANIONS, AQ, CATIONS, HYDROXIDES, SALTS, type AqId, type SolidId } from './species';
import { clean, liquidMl, type Mixture } from './mixture';

const KW = 1e-14;
const KA_AC = 1.75e-5;
const KA_NH4 = 5.6e-10;
const KA1 = 4.5e-7;
const KA2 = 4.7e-11;
const KA_FE3 = 6.3e-3;
const BETA_CU_NH3 = 1e14;
const LOG_KW = -14;

interface Sys {
  /** Liquid volume, L. */
  V: number;
  /** Net charge of the strong ions, mol (cations positive). */
  B: number;
  ac: number;
  nh3: number;
  co3: number;
  fe3: number;
  cu: number;
}

function amount(m: Mixture, id: AqId): number {
  return m.aq[id] ?? 0;
}

function strongCharge(m: Mixture): number {
  let b = 0;
  for (const id of CATIONS) b += AQ[id].charge * amount(m, id);
  for (const id of ANIONS) b += AQ[id].charge * amount(m, id);
  return b;
}

function sysOf(m: Mixture): Sys {
  return {
    V: liquidMl(m) / 1000,
    B: strongCharge(m),
    ac: amount(m, 'Ac'),
    nh3: amount(m, 'NH3'),
    co3: amount(m, 'CO3'),
    fe3: amount(m, 'Fe3'),
    cu: amount(m, 'Cu'),
  };
}

/** Charge balance without the strong-ion term; increasing in h. */
function residualNoB(h: number, s: Sys, nh3Free: number): number {
  const V = s.V;
  const ac = (s.ac * KA_AC) / (KA_AC + h);
  const nh4 = (nh3Free * h) / (h + KA_NH4);
  const d = h * h + KA1 * h + KA1 * KA2;
  const hco3 = (s.co3 * KA1 * h) / d;
  const co3 = (s.co3 * KA1 * KA2) / d;
  const feh = (s.fe3 * KA_FE3) / (KA_FE3 + h);
  return h * V + nh4 - (KW / h) * V - ac - hco3 - 2 * co3 - feh;
}

function solveLogH(s: Sys, nh3Free: number): number {
  let lo = -15.5;
  let hi = 1.3;
  for (let i = 0; i < 34; i++) {
    const mid = (lo + hi) / 2;
    if (s.B + residualNoB(10 ** mid, s, nh3Free) > 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

/** Fraction of Cu²⁺ bound as [Cu(NH₃)₄]²⁺ at the given h. */
function ammineFraction(s: Sys, h: number, nh3Free: number): number {
  if (s.cu <= 0 || nh3Free <= 0 || s.V <= 0) return 0;
  const freeNh3 = ((nh3Free / s.V) * KA_NH4) / (KA_NH4 + h);
  const x = BETA_CU_NH3 * freeNh3 ** 4;
  return x / (1 + x);
}

interface Solved {
  logH: number;
  ammine: number;
}

function solve(s: Sys): Solved {
  if (s.V < 1e-7) return { logH: -7, ammine: 0 };
  let nh3Free = s.nh3;
  let logH = solveLogH(s, nh3Free);
  let ammine = 0;
  if (s.cu > 0 && s.nh3 > 0) {
    for (let i = 0; i < 2; i++) {
      ammine = ammineFraction(s, 10 ** logH, nh3Free);
      nh3Free = Math.max(0, s.nh3 - 4 * ammine * s.cu);
      logH = solveLogH(s, nh3Free);
    }
    ammine = ammineFraction(s, 10 ** logH, nh3Free);
  }
  return { logH, ammine };
}

/** pH of the liquid, or null for a dry vessel. */
export function phOf(m: Mixture): number | null {
  const s = sysOf(m);
  if (s.V < 1e-6) return null;
  return Math.min(14, Math.max(0, -solve(s).logH));
}

/** Fraction of the copper held in the deep-blue ammine complex. */
export function cuAmmine(m: Mixture): number {
  const s = sysOf(m);
  if (s.V < 1e-6) return 0;
  return solve(s).ammine;
}

/** Acid (positive) or base (negative) that must be neutralized to reach pH 7, mol. */
export function acidityToNeutral(m: Mixture): number {
  const s = sysOf(m);
  if (s.V < 1e-7) return 0;
  return -(s.B + residualNoB(1e-7, s, s.nh3));
}

/** Free H⁺ concentration (mol/L) and the fraction of carbonate present as dissolved CO₂. */
export function acidState(m: Mixture): { h: number; co2Fraction: number; nh3Fraction: number } {
  const s = sysOf(m);
  if (s.V < 1e-7) return { h: 1e-7, co2Fraction: 0, nh3Fraction: 0 };
  const h = 10 ** solve(s).logH;
  const d = h * h + KA1 * h + KA1 * KA2;
  return { h, co2Fraction: (h * h) / d, nh3Fraction: KA_NH4 / (KA_NH4 + h) };
}

function withAq(m: Mixture, id: AqId, n: number): Mixture {
  return { ...m, aq: { ...m.aq, [id]: Math.max(0, n) } };
}

/** Splits one metal between its free ion and its hydroxide so that Q ≤ Ksp. */
function settleHydroxide(m: Mixture, h: (typeof HYDROXIDES)[number]): Mixture {
  const total = amount(m, h.ion) + (m.s[h.solid] ?? 0);
  if (total < 1e-12) return m;
  const V = liquidMl(m) / 1000;
  if (V < 1e-6) return m;
  const logKsp = Math.log10(h.ksp);
  const excess = (xs: number): number => {
    const trial = withAq(m, h.ion, total - xs);
    const s = sysOf(trial);
    const solved = solve(s);
    const aqM = total - xs;
    if (aqM <= 1e-15) return -Infinity;
    const free = h.ion === 'Cu' ? 1 - solved.ammine : 1;
    const logOH = LOG_KW - solved.logH;
    return Math.log10(Math.max(1e-30, (aqM / V) * free)) + h.n * logOH - logKsp;
  };
  let xs = 0;
  if (excess(0) > 0) {
    let lo = 0;
    let hi = total;
    for (let i = 0; i < 26; i++) {
      const mid = (lo + hi) / 2;
      if (excess(mid) > 0) lo = mid;
      else hi = mid;
    }
    xs = lo;
  }
  return { ...m, aq: { ...m.aq, [h.ion]: total - xs }, s: { ...m.s, [h.solid]: xs } };
}

/** Same for a sparingly soluble salt; for carbonates the pH is re-solved at every trial split. */
function settleSalt(m: Mixture, salt: (typeof SALTS)[number]): Mixture {
  const sol = m.s[salt.solid] ?? 0;
  const tc = amount(m, salt.cation) + salt.a * sol;
  const ta = amount(m, salt.anion) + salt.b * sol;
  if (tc < 1e-12 || ta < 1e-12) return m;
  const V = liquidMl(m) / 1000;
  if (V < 1e-6) return m;
  const logKsp = Math.log10(salt.ksp);
  const max = Math.min(tc / salt.a, ta / salt.b);
  const carbonate = salt.anion === 'CO3';
  const excess = (xs: number): number => {
    const c = (tc - salt.a * xs) / V;
    let alpha = 1;
    if (carbonate) {
      const trial = { ...m, aq: { ...m.aq, [salt.cation]: tc - salt.a * xs, CO3: ta - salt.b * xs } };
      const h = 10 ** solve(sysOf(trial)).logH;
      alpha = (KA1 * KA2) / (h * h + KA1 * h + KA1 * KA2);
    }
    const an = (alpha * (ta - salt.b * xs)) / V;
    if (c <= 1e-18 || an <= 1e-30) return -Infinity;
    return salt.a * Math.log10(c) + salt.b * Math.log10(an) - logKsp;
  };
  let xs = 0;
  if (excess(0) > 0) {
    let lo = 0;
    let hi = max;
    for (let i = 0; i < 26; i++) {
      const mid = (lo + hi) / 2;
      if (excess(mid) > 0) lo = mid;
      else hi = mid;
    }
    xs = lo;
  }
  return {
    ...m,
    aq: { ...m.aq, [salt.cation]: tc - salt.a * xs, [salt.anion]: ta - salt.b * xs },
    s: { ...m.s, [salt.solid]: xs },
  };
}

export const PRECIPITATES: SolidId[] = [...new Set([...SALTS.map((s) => s.solid), ...HYDROXIDES.map((h) => h.solid)])];

/** Brings the mixture to equilibrium and reports which precipitates newly appeared. */
export function equilibrate(input: Mixture): { m: Mixture; formed: SolidId[]; dissolved: SolidId[] } {
  const before = input.s;
  let m = input;
  if (liquidMl(m) < 0.001) return { m, formed: [], dissolved: [] };
  for (let pass = 0; pass < 2; pass++) {
    for (const salt of SALTS) m = settleSalt(m, salt);
    for (const h of HYDROXIDES) m = settleHydroxide(m, h);
  }
  m = clean(m);
  const formed: SolidId[] = [];
  const dissolved: SolidId[] = [];
  for (const id of PRECIPITATES) {
    const a = before[id] ?? 0;
    const b = m.s[id] ?? 0;
    if (b - a > 2e-6 && b > 4e-6) formed.push(id);
    else if (a > 4e-6 && b < a * 0.3) dissolved.push(id);
  }
  if (formed.length > 0) m = { ...m, cloud: 1 };
  return { m, formed, dissolved };
}
