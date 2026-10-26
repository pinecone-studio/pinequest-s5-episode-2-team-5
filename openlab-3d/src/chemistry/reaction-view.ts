import { GASES, type GasId } from '../experiments/curriculum/materials';
/** Semantic observations of the existing chemistry model. No UI/store or invented rates. */
import { AQ, SOLIDS, SALTS, HYDROXIDES, ACTIVITY, type AqId, type SolidId } from './species';
import { acidityToNeutral, cuAmmine } from './equilibrium';
import { liquidMl, type Mixture } from './mixture';
import type { StepResult } from './kinetics';

export type ReactionKind = 'acid' | 'metal' | 'precipitate' | 'neutral' | 'peroxide' | 'evap' | 'generic';
export interface MoleculeSpec { id: string; name: string; formula: string; color: string; count: number; phase?: 'gas' | 'solid' }
export interface ReactionObservation {
  preset: ReactionKind; key: string; reactants: MoleculeSpec[]; products: MoleculeSpec[]; spectators?: MoleculeSpec[];
  rate: number; temp: number; equation: string; sentence: string; effect: 'gas' | 'foam' | 'precipitate' | 'color' | 'water';
  rateUnit?: 'mol/s' | 'g/s';
  info?: boolean; catalyst?: 'iodide';
}
export const atom = (id: string, name: string, formula: string, color: string, count = 1, phase?: MoleculeSpec['phase']): MoleculeSpec => ({ id, name, formula, color, count, ...(phase ? { phase } : {}) });
const H = () => atom('H', 'Устөрөгчийн ион', 'H⁺', '#ffffff');
const OH = () => atom('OH', 'Гидроксид ион', 'OH⁻', '#f08080');
const W = (phase?: 'gas') => atom(phase ? 'steam' : 'H2O', 'Ус', phase ? 'H₂O↑' : 'H₂O', '#f16d70', 1, phase);
export function ion(id: AqId, count = 1): MoleculeSpec { const d = AQ[id]; return atom(id, d.name, d.formula, id === 'Na' ? '#ae77ff' : id === 'Cl' ? '#52db73' : d.color ?? '#b8d7ee', count); }
export function solid(id: SolidId, count = 1): MoleculeSpec { const d = SOLIDS[id]; return atom(`solid-${id}`, d.name, d.formula, d.color, count, 'solid'); }
const terms = (values: MoleculeSpec[]) => values.map((s) => `${s.count > 1 ? s.count : ''}${s.formula}${s.phase === 'solid' ? '↓' : s.phase === 'gas' && !s.formula.endsWith('↑') ? '↑' : ''}`).join(' + ');
function observation(preset: ReactionKind, reactants: MoleculeSpec[], products: MoleculeSpec[], rate: number, temp: number, effect: ReactionObservation['effect'], sentence?: string): ReactionObservation {
  return { preset, key: `${preset}:${reactants.map((s) => `${s.count}${s.id}`).join(',')}→${products.map((s) => `${s.count}${s.id}`).join(',')}`, reactants, products, rate, temp, effect, equation: `${terms(reactants)} → ${terms(products)}`, sentence: sentence ?? `${reactants.map((s) => s.name.toLocaleLowerCase()).join(' ба ')} холилдоход ${products.map((s) => s.name.toLocaleLowerCase()).join(', ')} үүсч байна (${effect === 'gas' ? 'хий ялгарна' : effect === 'precipitate' ? 'тунадас бууна' : effect === 'foam' ? 'хий, хөөс үүснэ' : effect === 'color' ? 'өнгө өөрчлөгдөнө' : 'ус үүснэ'}).` };
}
export function carbonateReaction(rate: number, temp: number, bicarbonate = false, textbook = false): ReactionObservation {
  const c = atom(bicarbonate ? 'HCO3' : 'CO3', bicarbonate ? 'Гидрокарбонат ион' : 'Карбонат ион', bicarbonate ? 'HCO₃⁻' : 'CO₃²⁻', '#b2b9c4');
  const h = { ...H(), count: bicarbonate ? 1 : 2 };
  const r = observation('acid', [c, h], [W(), atom('CO2', 'Нүүрсхүчлийн хий', 'CO₂', '#cad1d8', 1, 'gas')], rate, temp, 'gas');
  if (textbook) { r.equation = 'Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂↑'; r.spectators = [ion('Na', 2), ion('Cl', 2)]; }
  return r;
}
export function precipitationReaction(id: SolidId, rate: number, temp: number): ReactionObservation | null {
  const salt = SALTS.find((s) => s.solid === id);
  const hydroxide = HYDROXIDES.find((s) => s.solid === id);
  if (!salt && !hydroxide) return null;
  const reactants = salt ? [ion(salt.cation, salt.a), { ...ion(salt.anion), formula: salt.anion === 'CO3' ? 'CO₃²⁻' : AQ[salt.anion].formula, count: salt.b }] : [ion(hydroxide!.ion), { ...OH(), count: hydroxide!.n }];
  return observation('precipitate', reactants, [solid(id)], rate, temp, 'precipitate');
}
export function evaporationReaction(rate: number, temp: number, crystal?: SolidId): ReactionObservation {
  const r = observation('evap', [W()], [W('gas')], rate, temp, 'water', 'Ус ууршихад уусмал өтгөрч байна; ханасан үед ууссан давс талстжина.');
  r.rateUnit = 'g/s';
  if (crystal) {
    const def = SOLIDS[crystal];
    r.products.push(solid(crystal)); r.key += `:${crystal}`;
    const ions = Object.entries(def.dissolve?.products ?? {}).map(([id, n]) => ion(id as AqId, n));
    r.spectators = ions;
    r.equation += ions.length ? `; ${terms(ions)}${def.dissolve?.water ? ` + ${def.dissolve.water}H₂O` : ''} → ${def.formula}(т)` : `; ${def.formula}(у) → ${def.formula}(т)`;
  }
  return r;
}
/** A known incomplete mixture is still an observation, never a blocked action. */
export function incompletePeroxide(m: Mixture, rate = 0): ReactionObservation | null {
  const peroxide = (m.aq.H2O2 ?? 0) > 1e-9;
  const soap = (m.aq.soap ?? 0) > 1e-9;
  if (peroxide && !(m.aq.I || m.aq.Fe3 || m.s.MnO2 || m.s.Fe2O3 || m.s.PbO2 || m.s.CuO)) {
    const r = observation('peroxide', [{ ...ion('H2O2'), count: 2 }], [{ ...W(), count: 2 }, atom('O2', 'Хүчилтөрөгч', 'O₂', '#ff3030', 1, 'gas')], rate, m.temp, 'gas', `${soap ? 'Саван бол катализатор биш. ' : ''}H₂O₂ маш удаан задардаг тул өөрчлөлт бараг харагдахгүй. Катализатор (KI) нэмээрэй.`);
    r.info = true; return r;
  }
  if (!peroxide && soap) {
    const r = observation('peroxide', [ion('soap')], [], 0, m.temp, 'water', 'H₂O₂ байхгүй тул урвал явахгүй.');
    r.info = true; r.key += ':missing-peroxide'; r.equation = 'H₂O₂ байхгүй — урвал явахгүй';
    r.spectators = m.aq.I ? [ion('K'), ion('I')] : []; return r;
  }
  return null;
}
export function mixObservations(dst: Mixture, added: Mixture, after: Mixture, neutralized: number, formed: SolidId[], duration = .25): ReactionObservation[] {
  const result: ReactionObservation[] = [];
  for (const id of formed) {
    const change = Math.max(0, (after.s[id] ?? 0) - (dst.s[id] ?? 0) - (added.s[id] ?? 0));
    const r = precipitationReaction(id, change / duration, after.temp);
    if (r && change > 1e-9) result.push(r);
  }
  if (result.length) return result;
  // Carbonate protonation produces dissolved CO₂; kinetics publishes its gas-release rate.
  if (neutralized > 1e-8 && (dst.aq.CO3 || added.aq.CO3 || dst.s.Na2CO3 || added.s.Na2CO3)) return result;
  if (neutralized > 1e-8) {
    let reactants = [H(), OH()], products = [W()];
    if (dst.from.includes('acetic') || added.from.includes('acetic')) {
      reactants = [atom('HAc', 'Цууны хүчил', 'CH₃COOH', '#dde9ed'), OH()]; products = [atom('Ac-', 'Ацетат ион', 'CH₃COO⁻', '#b2ccde'), W()];
    } else if (dst.aq.NH3 || added.aq.NH3) { reactants = [ion('NH3'), H()]; products = [atom('NH4', 'Аммонийн ион', 'NH₄⁺', '#b8d7ee')]; }
    result.push(observation('neutral', reactants, products, neutralized / duration, after.temp, 'water'));
  }
  if (!result.length && after.aq.Cu && after.aq.NH3 && cuAmmine(after) > .1 && Math.max(cuAmmine(dst), cuAmmine(added)) < .1) {
    result.push(observation('generic', [ion('Cu'), { ...ion('NH3'), count: 4 }], [atom('CuNH3', 'Зэсийн аммиакат комплекс', '[Cu(NH₃)₄]²⁺', '#3730e0')], Math.min(after.aq.Cu, after.aq.NH3 / 4) / duration, after.temp, 'color'));
  }
  if (!result.length && after.aq.Fe3 && after.aq.SCN && !(dst.aq.Fe3 && dst.aq.SCN) && !(added.aq.Fe3 && added.aq.SCN)) {
    result.push(observation('generic', [ion('Fe3'), ion('SCN')], [atom('FeSCN', 'Төмрийн тиоцианат комплекс', '[FeSCN]²⁺', '#e33030')], Math.min(after.aq.Fe3, after.aq.SCN) / duration, after.temp, 'color'));
  }
  if (!result.length && after.aq.starch && after.aq.I2 && !(dst.aq.starch && dst.aq.I2) && !(added.aq.starch && added.aq.I2)) {
    const r = observation('generic', [ion('starch'), ion('I2')], [atom('starchIodine', 'Цардуул–иодын комплекс', 'цардуул·I₂', '#38307c')], Math.min(after.aq.I2, after.aq.starch * .3) / duration, after.temp, 'color', 'Цардуул ба иод холилдоход хөх өнгийн комплекс үүсч байна (өнгө өөрчлөгдөнө).');
    r.equation = 'Цардуул + I₂ ⇌ цардуул·I₂ (комплекс)'; result.push(r);
  }
  if (!result.length && ['phph', 'btb', 'mo', 'ui'].some((id) => (after.aq[id as AqId] ?? 0) > 0) && Math.abs(acidityToNeutral(dst) - acidityToNeutral(after)) > 1e-7) {
    const id = (['phph', 'btb', 'mo', 'ui'] as AqId[]).find((id) => after.aq[id])!;
    result.push(observation('generic', [atom('HIn', `${AQ[id].name} (хүчиллэг хэлбэр)`, 'HIn', '#f0b1b6')], [H(), atom('In', `${AQ[id].name} (суурилаг хэлбэр)`, 'In⁻', '#8095e7')], Math.abs(acidityToNeutral(dst) - acidityToNeutral(after)) / duration, after.temp, 'color', `${AQ[id].name} хүчил, шүлттэй холилдоход индикаторын өнгөт хэлбэрийн харьцаа өөрчлөгдөж байна (өнгө өөрчлөгдөнө).`));
    result[result.length - 1].equation = 'HIn ⇌ H⁺ + In⁻';
  }
  if (!result.length) { const info = incompletePeroxide(after); if (info) result.push(info); }
  return result;
}
export function stepObservations(before: Mixture, result: StepResult, dt: number): ReactionObservation[] {
  const m = result.m, out: ReactionObservation[] = [];
  if (result.gas.CO2 > 1e-9 && !result.notes.some((n) => n.startsWith('decompose:'))) out.push(carbonateReaction(result.gas.CO2, m.temp, before.from.includes('s_nahco3')));
  if (result.gas.H2 > 1e-10) {
    const metal = ACTIVITY.find((a) => (before.s[a.solid] ?? 0) > (m.s[a.solid] ?? 0));
    if (metal) { const coefficient = metal.charge % 2 ? 2 : 1; const s = { ...solid(metal.solid), id: `metal-${metal.solid}`, count: coefficient, phase: undefined }; out.push(observation('metal', [s, { ...H(), count: metal.charge * coefficient }], [ion(metal.ion, coefficient), atom('H2', 'Устөрөгчийн хий', 'H₂', '#ffffff', metal.charge * coefficient / 2, 'gas')], result.gas.H2, m.temp, 'gas')); }
  }
  for(const [oxidant,halide,product,anion] of [['Cl2','Br','Br2','Cl'],['Cl2','I','I2','Cl'],['Br2','I','I2','Br']] as [AqId,AqId,AqId,AqId][]){const delta=(m.aq[product]??0)-(before.aq[product]??0);if(delta>1e-12&&(before.aq[oxidant]??0)>(m.aq[oxidant]??0)&&before.aq[halide])out.push(observation('generic',[ion(oxidant),ion(halide,2)],[ion(anion,2),ion(product)],delta/dt,m.temp,'color'));}
  if(result.notes.includes('decompose:CuCO3'))out.push(observation('generic',[solid('CuCO3')],[solid('CuO'),atom('CO2','Нүүрсхүчлийн хий','CO₂','#cad1d8',1,'gas')],result.gas.CO2,m.temp,'gas'));
  const redox = (before.aq.MnO4 ?? 0) > (m.aq.MnO4 ?? 0) + 1e-12;
  if (result.gas.O2 > 1e-10 && !redox && (before.aq.H2O2 ?? 0) > (m.aq.H2O2 ?? 0)) {
    const r = observation('peroxide', [{ ...ion('H2O2'), count: 2 }], [{ ...W(), count: 2 }, atom('O2', 'Хүчилтөрөгч', 'O₂', '#f25460', 1, 'gas')], result.gas.O2, m.temp, m.foam > .1 ? 'foam' : 'gas', 'Устөрөгчийн хэт исэл катализаторын нөлөөгөөр ус, хүчилтөрөгч болж задарч байна; саван хийг хөөс болгон барина.');
    r.equation = `2H₂O₂ → 2H₂O + O₂↑${(before.aq.I ?? 0) > 0 ? '  (KI — катализатор)' : ''}`;
        if (before.aq.I) { r.spectators = [ion('K'), ion('I')]; r.key += ':KI'; r.catalyst = 'iodide'; }
    const catalyst = before.aq.I || before.aq.Fe3 || before.s.MnO2 || before.s.Fe2O3 || before.s.PbO2 || before.s.CuO;
    r.sentence = `Устөрөгчийн хэт исэл ${catalyst ? 'катализаторын нөлөөгөөр' : 'аажмаар'} ус, хүчилтөрөгч болж задарч байна (хий ялгарна).${before.aq.soap ? ' Саван хийг хөөс болгон барина.' : ''}`;
    const info = incompletePeroxide(before, r.rate);
    out.push(info ?? r);
  }
  if (redox) {
    const acidic = (m.aq.Mn ?? 0) > (before.aq.Mn ?? 0);
    const r = observation('generic', [{ ...ion('MnO4'), count: 2 }, { ...ion('H2O2'), count: acidic ? 5 : 3 }], [acidic ? { ...ion('Mn'), count: 2 } : solid('MnO2', 2), atom('O2', 'Хүчилтөрөгч', 'O₂', '#f25460', acidic ? 5 : 3, 'gas')], Math.max(result.gas.O2, ((before.aq.MnO4 ?? 0) - (m.aq.MnO4 ?? 0)) / dt), m.temp, acidic ? 'color' : 'precipitate', 'Перманганат ба устөрөгчийн хэт исэл холилдоход хүчилтөрөгч ялгарч, манганы нэгдлийн өнгө өөрчлөгдөж байна.');
    r.equation = acidic ? '2MnO₄⁻ + 5H₂O₂ + 6H⁺ → 2Mn²⁺ + 5O₂↑ + 8H₂O' : '2MnO₄⁻ + 3H₂O₂ → 2MnO₂↓ + 3O₂↑ + 2OH⁻ + 2H₂O';
    out.push(r);
  }
  if (before.burning && m.burning && before.ethanol > m.ethanol + 1e-8) {
    out.push(observation('generic', [atom('ethanol', 'Этанол', 'C₂H₅OH', '#c6deef'), atom('O2', 'Хүчилтөрөгч', 'O₂', '#f25460', 3)], [atom('CO2', 'Нүүрсхүчлийн хий', 'CO₂', '#cad1d8', 2, 'gas'), { ...W('gas'), count: 3 }], (before.ethanol - m.ethanol) * .789 / 46.07 / dt, m.temp, 'gas', 'Этанол хүчилтөрөгчтэй шатахад нүүрсхүчлийн хий, ус үүсч дулаан ялгарна (дөл ажиглагдана).'));
  }
  for (const id of result.formed) { const r = precipitationReaction(id, Math.max(0, (m.s[id] ?? 0) - (before.s[id] ?? 0)) / dt, m.temp); if (r) out.push(r); }
  if (result.gas.steam > 1e-8) {
    const crystal = (Object.keys(m.s) as SolidId[]).find((id) => SOLIDS[id].dissolve && (m.s[id] ?? 0) > (before.s[id] ?? 0) + 1e-9);
    out.push(evaporationReaction(result.gas.steam, m.temp, crystal));
  }
  if (!out.length) for (const id of Object.keys(before.s) as SolidId[]) {
    const def = SOLIDS[id], change = (before.s[id] ?? 0) - (m.s[id] ?? 0);
    if (!def.dissolve || change < 1e-10) continue;
    const reactant = { ...solid(id), phase: undefined };
    const products = Object.entries(def.dissolve.products).map(([id, n]) => ion(id as AqId, n));
    if (id === 'NaOH') products.push(OH());
    if (id === 'NH4NO3' || id === 'NH4Cl') products[0] = atom('NH4', 'Аммонийн ион', 'NH₄⁺', '#b8d7ee');
    if (id === 'NaHCO3') products[1] = atom('HCO3', 'Гидрокарбонат ион', 'HCO₃⁻', '#c4c9d2');
    if (def.dissolve.water) products.push({ ...W(), count: def.dissolve.water });
    out.push(observation('generic', [reactant], products, change / dt, m.temp, 'color', `${def.name} усанд уусч байна; уусмалын найрлага, температур өөрчлөгдөнө.`));
  }
  // Engine notes cover less common transformations; preserve actual species labels.
  if (!out.length && result.changed && result.notes.some((n) => n.startsWith('displace:') || n.startsWith('decompose:') || n.startsWith('hydrate:'))) {
    const consumed = (Object.keys(before.s) as SolidId[]).filter((id) => (before.s[id] ?? 0) > (m.s[id] ?? 0) + 1e-9).map((id) => ({ ...solid(id), phase: undefined }));
    const produced = (Object.keys(m.s) as SolidId[]).filter((id) => (m.s[id] ?? 0) > (before.s[id] ?? 0) + 1e-9).map((id) => solid(id));
    if (consumed.length && produced.length) { const r = observation('generic', consumed, produced, consumed.reduce((n, s) => n + (before.s[s.id.replace('solid-', '') as SolidId] ?? 0), 0) / dt, m.temp, 'color'); r.equation = 'A + B → C · ажиглагдсан хувирал'; out.push(r); }
  }
  if (!out.length) { const info = incompletePeroxide(m); if (info) out.push(info); }
  return out.filter((r) => (r.info || r.rate > 0) && Number.isFinite(r.rate) && liquidMl(m) >= 0);
}

/** Physical mixing has moving particles but no invented chemical products or rate. */
export function physicalMixing(m: Mixture): ReactionObservation {
  const species = Object.entries(m.aq).filter(([,n]) => n > 1e-10).map(([id]) => ion(id as AqId));
  for(const [id,n] of Object.entries(m.g??{}))if((n??0)>1e-12){const d=GASES[id as GasId];species.push(atom(id,d.name,d.formula,d.color,1,'gas'));}
  if (m.water > 0) species.unshift(W());
  if (m.ethanol > 0) species.push(atom('ethanol', 'Этанол', 'C₂H₅OH', '#ffffff'));
  for (const [id,n] of Object.entries(m.s)) if (n > 1e-10) species.push(solid(id as SolidId));
  return { preset: 'generic', key: `mixing:${species.map((s)=>s.id).join(',')}`, reactants: species, products: [],
    rate: 0, temp: m.temp, info: true, effect: 'water', equation: 'Юүлэх · Холих',
    sentence: 'Юүлсэн бодисын бөөмс сав дотор холилдож байна. Шинэ бодис үүсэхийг энэ дүрслэл илэрхийлэхгүй.' };
}
