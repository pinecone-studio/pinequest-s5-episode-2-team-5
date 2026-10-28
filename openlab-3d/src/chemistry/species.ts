import { EXTRA_AQ, EXTRA_SOLIDS, type ExtraAqId, type ExtraSolidId } from '../experiments/curriculum/materials';
/**
 * Everything that can be inside a vessel, tracked in moles:
 *  - strong ions (fully dissociated; H⁺ / OH⁻ are implicit, see equilibrium.ts),
 *  - weak acid/base systems stored as totals (acetate, ammonia, carbonate),
 *  - neutral molecules (H₂O₂, iodine, starch, indicators, dyes …),
 *  - solids (crystals, metals, precipitates).
 * Colors are the transmitted color at the reference concentration `cRef` (mol/L), so a
 * mixture's color follows Beer–Lambert: T = color^(c / cRef), multiplied over species.
 */

export type Cation = 'Ni' | 'Cr3' | 'FeSCN' | 'Al' | 'Co' | 'Rb' | 'Sr' | 'Cd' | 'Na' | 'K' | 'Li' | 'Ca' | 'Ba' | 'Mg' | 'Zn' | 'Cu' | 'Fe2' | 'Fe3' | 'Ag' | 'Pb' | 'Mn';
export type Anion = 'CrO4' | 'S2O3' | 'AlOH4' | 'Br' | 'Cr2O7' | 'Cl' | 'I' | 'NO3' | 'SO4' | 'SCN' | 'MnO4';
export type WeakId = 'Cit' | 'Ac' | 'NH3' | 'CO3';
export type MoleculeId = 'Cl2' | 'Br2' | 'H2O2' | 'I2' | 'starch' | 'sucrose' | 'soap' | 'phph' | 'btb' | 'mo' | 'ui' | 'dyeR' | 'dyeY' | 'dyeG' | 'dyeB';
export type AqId = ExtraAqId | Cation | Anion | WeakId | MoleculeId;

export type SolidId = ExtraSolidId | 'ice' | 'Al' | 'P' | 'S' | 'Si' | 'graphite' | 'iodine' | 'Fe2O3' | 'PbO2' | 'ZnO' | 'gelatin' | 'paper' | 'sand' | 'citric' | 'litmus_red' | 'litmus_blue' | 'CoCl2' | 'CoCl2_6' | 'plastic' |
   'KCl'
  | 'ZnSO4'
  | 'NaCl'
  | 'CuSO4_5'
  | 'CuSO4'
  | 'NaHCO3'
  | 'Na2CO3'
  | 'CaCO3'
  | 'Zn'
  | 'Mg'
  | 'Fe'
  | 'Cu'
  | 'Ag'
  | 'NaOH'
  | 'NH4NO3'
  | 'MnO2'
  | 'KMnO4'
  | 'sucrose'
  | 'caramel'
  | 'C'
  | 'AgCl'
  | 'AgI'
  | 'BaSO4'
  | 'PbI2'
  | 'PbSO4'
  | 'PbCl2'
  | 'CuOH2'
  | 'FeOH3'
  | 'FeOH2'
  | 'MgOH2'
  | 'ZnOH2'
  | 'CaOH2'
  | 'PbOH2'
  | 'AgOH'
  | 'MnOH2'
  | 'CuO'
  | 'NH4Cl'
  | 'CuCO3'
  | 'BaCO3'
  | 'salt';

export interface AqDef {
  name: string;
  formula: string;
  charge: number;
  molarMass: number;
  /** Transmitted color at `cRef`; omitted for colorless species. */
  color?: string;
  cRef?: number;
  density?: number;
  boiling?: number;
}

export const CATIONS: Cation[] = ['Ni','Cr3','FeSCN','Al','Co','Rb','Sr','Cd','Na', 'K', 'Li', 'Ca', 'Ba', 'Mg', 'Zn', 'Cu', 'Fe2', 'Fe3', 'Ag', 'Pb', 'Mn'];
export const ANIONS: Anion[] = ['CrO4','S2O3','AlOH4','Br','Cr2O7','Cl', 'I', 'NO3', 'SO4', 'SCN', 'MnO4'];

export const AQ: Record<AqId, AqDef> = {
 ...EXTRA_AQ,
 Al:{name:'Хөнгөнцагааны ион',formula:'Al³⁺',charge:3,molarMass:26.98},
 Cit:{name:'Цитрийн хүчил / цитратын нийт',formula:'C₆H₈O₇ / Cit',charge:0,molarMass:189.1},
 Co:{name:'Кобальт (II)',formula:'Co²⁺',charge:2,molarMass:58.93,color:'#e69ec0',cRef:.1},
 Br:{name:'Бромид',formula:'Br⁻',charge:-1,molarMass:79.9},
 Cr2O7:{name:'Дихромат',formula:'Cr₂O₇²⁻',charge:-2,molarMass:215.99,color:'#f89d28',cRef:.02},
 Cl2:{name:'Хлор',formula:'Cl₂',charge:0,molarMass:70.9,color:'#d5e38d',cRef:.02},
 Br2:{name:'Бром',formula:'Br₂',charge:0,molarMass:159.8,color:'#b66a26',cRef:.02},
  Na: { name: 'Натрийн ион', formula: 'Na⁺', charge: 1, molarMass: 23 },
  K: { name: 'Калийн ион', formula: 'K⁺', charge: 1, molarMass: 39.1 },
  Li: { name: 'Литийн ион', formula: 'Li⁺', charge: 1, molarMass: 6.94 },
  Ca: { name: 'Кальцийн ион', formula: 'Ca²⁺', charge: 2, molarMass: 40.08 },
  Ba: { name: 'Барийн ион', formula: 'Ba²⁺', charge: 2, molarMass: 137.3 },
  Mg: { name: 'Магнийн ион', formula: 'Mg²⁺', charge: 2, molarMass: 24.31 },
  Zn: { name: 'Цайрын ион', formula: 'Zn²⁺', charge: 2, molarMass: 65.38 },
  Cu: { name: 'Зэс (II)-ын ион', formula: 'Cu²⁺', charge: 2, molarMass: 63.55, color: '#5aa8ec', cRef: 0.3 },
  Fe2: { name: 'Төмөр (II)-ын ион', formula: 'Fe²⁺', charge: 2, molarMass: 55.85, color: '#cfe8b4', cRef: 0.1 },
  Fe3: { name: 'Төмөр (III)-ын ион', formula: 'Fe³⁺', charge: 3, molarMass: 55.85, color: '#eaa640', cRef: 0.1 },
  Ag: { name: 'Мөнгөний ион', formula: 'Ag⁺', charge: 1, molarMass: 107.9 },
  Pb: { name: 'Хар тугалганы ион', formula: 'Pb²⁺', charge: 2, molarMass: 207.2 },
  Mn: { name: 'Манган (II)-ын ион', formula: 'Mn²⁺', charge: 2, molarMass: 54.94, color: '#f6e8ee', cRef: 0.1 },
  Cl: { name: 'Хлорид ион', formula: 'Cl⁻', charge: -1, molarMass: 35.45 },
  I: { name: 'Иодид ион', formula: 'I⁻', charge: -1, molarMass: 126.9 },
  NO3: { name: 'Нитрат ион', formula: 'NO₃⁻', charge: -1, molarMass: 62 },
  SO4: { name: 'Сульфат ион', formula: 'SO₄²⁻', charge: -2, molarMass: 96.06 },
  SCN: { name: 'Тиоцианат ион', formula: 'SCN⁻', charge: -1, molarMass: 58.08 },
  MnO4: { name: 'Перманганат ион', formula: 'MnO₄⁻', charge: -1, molarMass: 118.9, color: '#8a2bd0', cRef: 0.008 },
  Ac: { name: 'Цууны хүчил / ацетат', formula: 'CH₃COOH', charge: 0, molarMass: 60.05 },
  NH3: { name: 'Аммиак / аммонийн ион', formula: 'NH₃ / NH₄⁺', charge: 0, molarMass: 17.03 },
  CO3: { name: 'Карбонат / гидрокарбонат', formula: 'CO₃²⁻ / HCO₃⁻', charge: 0, molarMass: 60.01 },
  H2O2: { name: 'Устөрөгчийн хэт исэл', formula: 'H₂O₂', charge: 0, molarMass: 34.01 },
  I2: { name: 'Иод', formula: 'I₂', charge: 0, molarMass: 253.8, color: '#b0622a', cRef: 0.004 },
  starch: { name: 'Цардуул', formula: '(C₆H₁₀O₅)ₙ', charge: 0, molarMass: 162 },
  sucrose: { name: 'Сахароз (элсэн чихэр)', formula: 'C₁₂H₂₂O₁₁', charge: 0, molarMass: 342.3 },
  soap: { name: 'Угаалгын шингэн', formula: 'Саван', charge: 0, molarMass: 300 },
  phph: { name: 'Фенолфталеин', formula: 'ФФ', charge: 0, molarMass: 318.3 },
  btb: { name: 'Бромтимол цэнхэр', formula: 'БТЦ', charge: 0, molarMass: 624.4 },
  mo: { name: 'Метилоранж', formula: 'МО', charge: 0, molarMass: 327.3 },
  ui: { name: 'Универсаль индикатор', formula: 'УИ', charge: 0, molarMass: 300 },
  dyeR: { name: 'Улаан будаг', formula: 'Улаан', charge: 0, molarMass: 500, color: '#e2363c', cRef: 4e-5 },
  dyeY: { name: 'Шар будаг', formula: 'Шар', charge: 0, molarMass: 500, color: '#f5cc10', cRef: 4e-5 },
  dyeG: { name: 'Ногоон будаг', formula: 'Ногоон', charge: 0, molarMass: 500, color: '#2fbf63', cRef: 4e-5 },
  dyeB: { name: 'Цэнхэр будаг', formula: 'Цэнхэр', charge: 0, molarMass: 500, color: '#2f5fe0', cRef: 4e-5 },
};

export interface SolidDef {
  name: string;
  formula: string;
  color: string;
  molarMass: number;
  /** Shiny metal or crystal (rendered with some metalness). */
  metal?: boolean;
  /**
   * Soluble solids dissolve over time (stirring, heat and grinding speed it up).
   * `solubility` is in mol/L of the solid; `dH` is the enthalpy of solution in kJ/mol
   * (negative warms the water). `water` is crystal water released per mole. With `doubling`, the
   * solubility (given at 20 °C) doubles every that many °C, so a hot solution crystallises on cooling.
   */
  dissolve?: { products: Partial<Record<AqId, number>>; solubility: number; dH: number; water?: number; doubling?: number };
}

export const SOLIDS: Record<SolidId, SolidDef> = {
 ...EXTRA_SOLIDS,
 ice:{name:'Мөс',formula:'H₂O(s)',color:'#e0f5ff',molarMass:18.015},
 Al:{name:'Хөнгөнцагаан',formula:'Al',color:'#bfcbd2',molarMass:26.98},
 P:{name:'Улаан фосфор',formula:'P',color:'#9c4134',molarMass:30.97},
 S:{name:'Хүхэр',formula:'S',color:'#e9cd35',molarMass:32.06},
 Si:{name:'Цахиур',formula:'Si',color:'#6d7085',molarMass:28.09},
 graphite:{name:'Графит',formula:'C',color:'#222b35',molarMass:12.01},
 iodine:{name:'Иодын талст',formula:'I₂',color:'#483852',molarMass:253.8},
 Fe2O3:{name:'Төмрийн (III) исэл',formula:'Fe₂O₃',color:'#a34028',molarMass:159.69},
 PbO2:{name:'Хар тугалганы (IV) исэл',formula:'PbO₂',color:'#493f36',molarMass:239.2},
 ZnO:{name:'Цайрын исэл',formula:'ZnO',color:'#f3f5eb',molarMass:81.38},
 gelatin:{name:'Желатин',formula:'Желатин',color:'#eed8ac',molarMass:1000},
 paper:{name:'Шүүлтүүрийн цаас',formula:'Целлюлоз',color:'#f7f1db',molarMass:162.14},
 sand:{name:'Элс',formula:'SiO₂',color:'#d1b98c',molarMass:60.08},
 citric:{name:'Нимбэгийн хүчил',formula:'C₆H₈O₇',color:'#f8fafb',molarMass:192.12,dissolve:{products:{Cit:1},solubility:3,dH:0}},
 litmus_red:{name:'Улаан лакмус',formula:'Лакмус',color:'#dd5470',molarMass:1000},
 litmus_blue:{name:'Хөх лакмус',formula:'Лакмус',color:'#5566d9',molarMass:1000},
 CoCl2:{name:'Усгүй кобальтын хлорид',formula:'CoCl₂',color:'#526ac6',molarMass:129.84},
 CoCl2_6:{name:'Кобальтын хлорид гексагидрат',formula:'CoCl₂·6H₂O',color:'#e69ec0',molarMass:237.93,dissolve:{products:{Co:1,Cl:2},solubility:4,dH:0,water:6}},
 plastic:{name:'Хуванцар бүрхүүл',formula:'Бүрхүүл',color:'#f1f5f9',molarMass:1000},
  KCl: { name: 'Калийн хлорид', formula: 'KCl', color: '#f3f5f7', molarMass: 74.55, dissolve: { products: {K:1,Cl:1}, solubility:4.5, dH:17.2 } },
  ZnSO4: { name: 'Цайрын сульфат', formula: 'ZnSO₄', color: '#f0f4f5', molarMass: 161.44, dissolve: { products: {Zn:1,SO4:1}, solubility:3.5, dH:0 } },
  NaCl: { name: 'Натрийн хлорид', formula: 'NaCl', color: '#f3f5f7', molarMass: 58.44, dissolve: { products: { Na: 1, Cl: 1 }, solubility: 6.1, dH: 3.9 } },
  CuSO4_5: { name: 'Зэсийн (II) сульфат пентагидрат', formula: 'CuSO₄·5H₂O', color: '#2f80e4', molarMass: 249.7, dissolve: { products: { Cu: 1, SO4: 1 }, solubility: 1.3, dH: 11.5, water: 5 } },
  CuSO4: { name: 'Усгүй зэсийн (II) сульфат', formula: 'CuSO₄', color: '#e6e9e4', molarMass: 159.6, dissolve: { products: { Cu: 1, SO4: 1 }, solubility: 1.3, dH: -66.5 } },
  NaHCO3: { name: 'Натрийн гидрокарбонат', formula: 'NaHCO₃', color: '#f6f6f2', molarMass: 84.01, dissolve: { products: { Na: 1, CO3: 1 }, solubility: 1.14, dH: 16.7 } },
  Na2CO3: { name: 'Натрийн карбонат', formula: 'Na₂CO₃', color: '#f6f6f4', molarMass: 106, dissolve: { products: { Na: 2, CO3: 1 }, solubility: 2.0, dH: -26.7 } },
  CaCO3: { name: 'Кальцийн карбонат (гантиг)', formula: 'CaCO₃', color: '#e9e5dc', molarMass: 100.1 },
  Zn: { name: 'Цайр', formula: 'Zn', color: '#a2aab1', molarMass: 65.38, metal: true },
  Mg: { name: 'Магни', formula: 'Mg', color: '#cfd3d8', molarMass: 24.31, metal: true },
  Fe: { name: 'Төмөр', formula: 'Fe', color: '#5a5e63', molarMass: 55.85, metal: true },
  Cu: { name: 'Зэс', formula: 'Cu', color: '#c4693a', molarMass: 63.55, metal: true },
  Ag: { name: 'Мөнгө', formula: 'Ag', color: '#dfe3e8', molarMass: 107.9, metal: true },
  NaOH: { name: 'Натрийн гидроксид', formula: 'NaOH', color: '#f5f6f6', molarMass: 40, dissolve: { products: { Na: 1 }, solubility: 25, dH: -44.5 } },
  NH4NO3: { name: 'Аммонийн нитрат', formula: 'NH₄NO₃', color: '#f7f7f4', molarMass: 80.04, dissolve: { products: { NH3: 1, NO3: 1 }, solubility: 15, dH: 25.7 } },
  MnO2: { name: 'Манганы (IV) исэл', formula: 'MnO₂', color: '#2b2522', molarMass: 86.94 },
  KMnO4: { name: 'Калийн перманганат', formula: 'KMnO₄', color: '#3e1150', molarMass: 158, metal: true, dissolve: { products: { K: 1, MnO4: 1 }, solubility: 0.4, dH: 43.6 } },
  sucrose: { name: 'Элсэн чихэр', formula: 'C₁₂H₂₂O₁₁', color: '#fbfbf8', molarMass: 342.3, dissolve: { products: { sucrose: 1 }, solubility: 5.8, dH: 5.8 } },
  caramel: { name: 'Карамель', formula: 'Карамель', color: '#8b4a14', molarMass: 342.3 },
  C: { name: 'Нүүрстөрөгч (нүүрс)', formula: 'C', color: '#161515', molarMass: 12.01 },
  AgCl: { name: 'Мөнгөний хлорид', formula: 'AgCl', color: '#f4f4f1', molarMass: 143.3 },
  AgI: { name: 'Мөнгөний иодид', formula: 'AgI', color: '#efe08c', molarMass: 234.8 },
  BaSO4: { name: 'Барийн сульфат', formula: 'BaSO₄', color: '#f5f5f5', molarMass: 233.4 },
  PbI2: { name: 'Хар тугалганы (II) иодид', formula: 'PbI₂', color: '#ffd21c', molarMass: 461 },
  PbSO4: { name: 'Хар тугалганы (II) сульфат', formula: 'PbSO₄', color: '#f2f2ee', molarMass: 303.3 },
  PbCl2: { name: 'Хар тугалганы (II) хлорид', formula: 'PbCl₂', color: '#f4f4f0', molarMass: 278.1 },
  CuOH2: { name: 'Зэсийн (II) гидроксид', formula: 'Cu(OH)₂', color: '#85b9df', molarMass: 97.56 },
  FeOH3: { name: 'Төмрийн (III) гидроксид', formula: 'Fe(OH)₃', color: '#a24f1d', molarMass: 106.9 },
  FeOH2: { name: 'Төмрийн (II) гидроксид', formula: 'Fe(OH)₂', color: '#6d8c4c', molarMass: 89.86 },
  MgOH2: { name: 'Магнийн гидроксид', formula: 'Mg(OH)₂', color: '#f4f5f5', molarMass: 58.32 },
  ZnOH2: { name: 'Цайрын гидроксид', formula: 'Zn(OH)₂', color: '#f3f4f4', molarMass: 99.4 },
  CaOH2: { name: 'Кальцийн гидроксид', formula: 'Ca(OH)₂', color: '#f4f4f2', molarMass: 74.09 },
  PbOH2: { name: 'Хар тугалганы (II) гидроксид', formula: 'Pb(OH)₂', color: '#f1f1ee', molarMass: 241.2 },
  AgOH: { name: 'Мөнгөний исэл', formula: 'Ag₂O', color: '#5b3d26', molarMass: 115.9 },
  MnOH2: { name: 'Манганы (II) гидроксид', formula: 'Mn(OH)₂', color: '#cdb79c', molarMass: 88.95 },
  CuO: { name: 'Зэсийн (II) исэл', formula: 'CuO', color: '#1d1b1a', molarMass: 79.55 },
  NH4Cl: {name:'Аммонийн хлорид',formula:'NH₄Cl',color:'#f4f5f5',molarMass:53.49,dissolve:{products:{NH3:1,Cl:1},dH:14.8,solubility:6.9}},
  CuCO3: { name: 'Зэсийн (II) карбонат', formula: 'CuCO₃', color: '#4cb39e', molarMass: 123.6 },
  BaCO3: { name: 'Барийн карбонат', formula: 'BaCO₃', color: '#f5f5f3', molarMass: 197.3 },
  salt: { name: 'Давсны үлдэгдэл', formula: 'Давс', color: '#f1f1ec', molarMass: 60 },
};

/** mol/L of a soluble solid at `temp` °C. */
export function solubilityAt(d: NonNullable<SolidDef['dissolve']>, temp: number): number {
  return d.doubling ? d.solubility * 2 ** ((temp - 20) / d.doubling) : d.solubility;
}

/** Metal hydroxides that precipitate from basic solution (Ksp, OH⁻ per metal ion). */
export const HYDROXIDES: { ion: Cation; solid: SolidId; n: number; ksp: number }[] = [
  { ion: 'Al', solid: 'AlOH3', n: 3, ksp: 1e-33 },
  { ion: 'Ni', solid: 'NiOH2', n: 2, ksp: 5.5e-16 },
  { ion: 'Fe3', solid: 'FeOH3', n: 3, ksp: 1e-36 },
  { ion: 'Cu', solid: 'CuOH2', n: 2, ksp: 2.2e-20 },
  { ion: 'Pb', solid: 'PbOH2', n: 2, ksp: 1.4e-20 },
  { ion: 'Zn', solid: 'ZnOH2', n: 2, ksp: 3e-17 },
  { ion: 'Fe2', solid: 'FeOH2', n: 2, ksp: 4.9e-17 },
  { ion: 'Mn', solid: 'MnOH2', n: 2, ksp: 1.9e-13 },
  { ion: 'Mg', solid: 'MgOH2', n: 2, ksp: 5.6e-12 },
  { ion: 'Ag', solid: 'AgOH', n: 1, ksp: 2e-8 },
  { ion: 'Ca', solid: 'CaOH2', n: 2, ksp: 5.5e-6 },
];

/** Sparingly soluble salts: cation^a anion^b ⇌ solid (anion 'CO3' means the carbonate ion). */
export const SALTS: { cation: Cation; a: number; anion: Anion | 'CO3'; b: number; solid: SolidId; ksp: number }[] = [
  { cation: 'Ag', a: 1, anion: 'I', b: 1, solid: 'AgI', ksp: 8.5e-17 },
  { cation: 'Ag', a: 1, anion: 'Cl', b: 1, solid: 'AgCl', ksp: 1.8e-10 },
  { cation: 'Ag', a: 2, anion: 'CrO4', b: 1, solid: 'Ag2CrO4', ksp: 1.1e-12 },
  { cation: 'Ba', a: 1, anion: 'SO4', b: 1, solid: 'BaSO4', ksp: 1.1e-10 },
  { cation: 'Pb', a: 1, anion: 'I', b: 2, solid: 'PbI2', ksp: 9.8e-9 },
  { cation: 'Pb', a: 1, anion: 'SO4', b: 1, solid: 'PbSO4', ksp: 2.5e-8 },
  { cation: 'Pb', a: 1, anion: 'Cl', b: 2, solid: 'PbCl2', ksp: 1.7e-5 },
  { cation: 'Cu', a: 1, anion: 'CO3', b: 1, solid: 'CuCO3', ksp: 1.4e-10 },
  { cation: 'Ca', a: 1, anion: 'CO3', b: 1, solid: 'CaCO3', ksp: 3.4e-9 },
  { cation: 'Ba', a: 1, anion: 'CO3', b: 1, solid: 'BaCO3', ksp: 2.6e-9 },
];

/**
 * Activity series (most reactive first); a metal displaces the ions of any metal after it.
 * `dH` is the ion's enthalpy of formation, kJ/mol (M + 2H⁺ → M²⁺ + H₂), so displacements release
 * the difference. `waterRate`: also reacts with water itself, from `waterFrom` °C (Ca in cold
 * water; Mg only once the water is hot, and fast in steam).
 */
export const ACTIVITY: { solid: SolidId; ion: Cation; charge: number; acidRate: number; dH: number; waterRate?: number; waterFrom?: number }[] = [
  { solid: 'Ca', ion: 'Ca', charge: 2, acidRate: 2.2, dH: -543, waterRate: 0.4 },
  {solid:'Al',ion:'Al',charge:3,acidRate:.03,dH:-531},
  { solid: 'Mg', ion: 'Mg', charge: 2, acidRate: 1.4, dH: -467, waterRate: 0.002, waterFrom: 50 },
  { solid: 'Zn', ion: 'Zn', charge: 2, acidRate: 0.14, dH: -153 },
  { solid: 'Fe', ion: 'Fe2', charge: 2, acidRate: 0.035, dH: -87 },
  { solid: 'Ni', ion: 'Ni', charge: 2, acidRate: .02, dH: -50 },
  { solid: 'Pb', ion: 'Pb', charge: 2, acidRate: .004, dH: -1 },
  { solid: 'Cu', ion: 'Cu', charge: 2, acidRate: 0, dH: 64.8 },
  { solid: 'Ag', ion: 'Ag', charge: 1, acidRate: 0, dH: 105.6 },
];

/** Flame-test colors of cations (Bunsen burner + nichrome loop). */
export const FLAME_COLORS: Partial<Record<Cation, { color: string; name: string }>> = {
  Na: { color: '#ffb31a', name: 'шар улбар' },
  K: { color: '#c48dff', name: 'ягаан нил (голт бор)' },
  Li: { color: '#ff1f4b', name: 'час улаан' },
  Ca: { color: '#ff6a24', name: 'тоосгон улаан' },
  Cu: { color: '#21e6b0', name: 'ногоовтор цэнхэр' },
  Ba: { color: '#b6f062', name: 'цайвар ногоон' },
  Rb: { color: '#d23b8a', name: 'улаан ягаан' },
  Sr: { color: '#ff2340', name: 'час улаан' },
};

export function aqName(id: AqId): string {
  return AQ[id].name;
}
