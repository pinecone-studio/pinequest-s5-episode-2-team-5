import type { EquipmentKind } from '../../../equipment/equipmentCatalog';

/** Supplies for guided comparisons whose source investigation is model-only. */
export const GUIDED_OVERLAYS: Record<string, { labRig: EquipmentKind; supplies: string[] }> = {
  'reaction-timing': { labRig: 'gasTrain', supplies: ['gasTrain', 'reagent:s_caco3', 'reagent:hcl'] },
  'melting-point': { labRig: 'heatingBath', supplies: ['heatingBath', 'beaker', 'thermometer', 'stopwatch', 'reagent:s_ice', 'reagent:s_nacl'] },
  // The book compares magnesium with calcium.
  'group2-water': { labRig: 'gasTrain', supplies: ['gasTrain', 'reagent:s_mg', 'reagent:s_ca', 'reagent:water'] },
  'group2-acid': { labRig: 'gasTrain', supplies: ['gasTrain', 'reagent:s_mg', 'reagent:s_ca', 'reagent:hcl'] },
  halogens: { labRig: 'reactionTile', supplies: ['reactionTile', 'reagent:chlorine', 'reagent:kbr', 'reagent:ki'] },
  'physical-change': { labRig: 'heatingBath', supplies: ['heatingBath', 'reagent:s_ice', 'reagent:water'] },
  'rate-concentration': { labRig: 'gasTrain', supplies: ['gasTrain', 'reagent:s_caco3', 'reagent:hcl', 'reagent:water'] },
  'rate-temperature': { labRig: 'gasTrain', supplies: ['gasTrain', 'reagent:s_caco3', 'reagent:hcl'] },
  'rate-surface': { labRig: 'gasTrain', supplies: ['gasTrain', 'reagent:s_caco3', 'reagent:hcl'] },
  'candle-products': { labRig: 'combustionFurnace', supplies: ['combustionFurnace', 'reagent:s_wax', 'reagent:gas_o2'] },
  'fuel-energy': { labRig: 'calorimeter', supplies: ['calorimeter', 'reagent:water', 'reagent:ethanol'] },
  nacl: { labRig: 'beaker', supplies: ['beaker', 'reagent:hcl', 'reagent:s_na2co3'] },
};
