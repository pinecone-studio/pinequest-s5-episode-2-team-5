/**
 * The room's chemistry store owns vessel contents, including the NaCl apparatus.
 * The bench reads a small textbook projection, and its accelerated model updates only
 * its own apparatus. Ordinary vessels keep the general chemistry/physics simulation.
 */
import { AQ, type AqId } from '../../chemistry/species';
import { emptyMixture, liquidMl, type Mixture as ChemicalMixture } from '../../chemistry/mixture';
import { mixtureOf, useChemStore } from '../../store/useChemStore';
import { summarize } from '../../chemistry/describe';
import type { ItemVariant } from '../../world/itemsLayout';
import type { Mixture } from './sandbox';
import { CHEM } from './data';

export function benchMixture(m: ChemicalMixture): Mixture {
  const sodium = m.aq.Na ?? 0;
  const chloride = m.aq.Cl ?? 0;
  const other = m.ethanol > 0.001 || Object.entries(m.aq).some(([key, n]) => key !== 'Na' && key !== 'Cl' && n > 1e-9)
    || Object.entries(m.s).some(([key, n]) => key !== 'NaCl' && key !== 'Na2CO3' && n > 1e-9)
    || sodium > chloride + 1e-6;
  return {
    ml: liquidMl(m),
    acid: Math.max(0, -Object.entries(m.aq).reduce((sum, [key, amount]) => sum + AQ[key as AqId].charge * amount, 0)) * 1000,
    carbonate: (m.s.Na2CO3 ?? 0) * CHEM.molarCarbonate,
    salt: (Math.min(sodium, chloride) + (m.s.NaCl ?? 0)) * CHEM.molarSalt,
    temp: m.temp,
    other: other ? summarize(m) || 'Өөр бодистой хольц' : '',
  };
}

/** Retain unrelated ions/reagents rather than replacing a mixture with its projection. */
export function updateBenchMixture(id: string, value: Mixture): void {
  const current = mixtureOf(id);
  const before = benchMixture(current);
  const aq = { ...current.aq };
  const solids = { ...current.s };
  const matched = Math.min(aq.Na ?? 0, aq.Cl ?? 0);
  const extraNa = (aq.Na ?? 0) - matched;
  const extraCl = (aq.Cl ?? 0) - matched;
  solids.Na2CO3 = Math.max(0, value.carbonate / CHEM.molarCarbonate);
  // Repartition NaCl as water evaporates/cools without creating or deleting salt.
  const crystalMol = Math.max(0, value.salt - value.ml * (value.temp > 60 ? 0.39 : 0.36)) / CHEM.molarSalt;
  const dissolved = Math.max(0, value.salt / CHEM.molarSalt - crystalMol);
  aq.Na = extraNa + dissolved;
  aq.Cl = Math.max(0, extraCl + dissolved + (value.acid - before.acid) / 1000);
  solids.NaCl = crystalMol;
  useChemStore.getState().setMixtures({ [id]: {
    ...current, water: Math.max(0, current.water + value.ml - before.ml), temp: value.temp, aq, s: solids,
  } });
}

export function seedBenchChemistry(contents: Record<string, Mixture>, overwrite = true): void {
  const patch: Record<string, ChemicalMixture> = {};
  for (const [id, value] of Object.entries(contents)) {
    if (!id.startsWith('nacl-') || (!overwrite && useChemStore.getState().mixtures[id])) continue;
    const m = emptyMixture(value.temp);
    m.water = value.ml;
    m.aq.Na = value.salt / CHEM.molarSalt;
    m.aq.Cl = value.acid / 1000 + value.salt / CHEM.molarSalt;
    m.s.Na2CO3 = value.carbonate / CHEM.molarCarbonate;
    patch[id] = m;
  }
  useChemStore.getState().setMixtures(patch);
}

export function readBenchMixture(id: string, variant?: ItemVariant): Mixture {
  return benchMixture(mixtureOf(id, variant));
}
