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
  'water-quality': { labRig: 'soilBench', supplies: ['soilBench', 'reagent:water', 'reagent:ui', 'reagent:soil_clay', 'reagent:nacl', 'reagent:naoh'] },
  'water-treatment': { labRig: 'soilBench', supplies: ['soilBench', 'reagent:soil_clay', 'reagent:nacl'] },
  'g9-filtration': { labRig: 'beaker', supplies: ['beaker', 'beaker#2', 'beaker#3', 'beaker#4', 'erlenmeyer', 'funnel', 'retortStand', 'glassRod', 'reagent:water', 'reagent:s_sand', 'reagent:tomato', 'reagent:s_nacl', 'reagent:ethanol'] },
  // The book compares three beakers side by side.
  'g7-sugar-motion': { labRig: 'beaker', supplies: ['beaker', 'beaker#2', 'beaker#3', 'thermometer', 'stopwatch', 'reagent:water', 'reagent:cold_water', 'reagent:s_ice', 'reagent:hot_water', 'reagent:s_sugar'] },
  'g9-diffusion-temperature': { labRig: 'beaker', supplies: ['beaker', 'beaker#2', 'beaker#3', 'watchGlass', 'thermometer', 'stopwatch', 'bunsenBurner', 'tripod', 'wireGauze', 'reagent:s_cuso4', 'reagent:water', 'reagent:cold_water'] },
};
