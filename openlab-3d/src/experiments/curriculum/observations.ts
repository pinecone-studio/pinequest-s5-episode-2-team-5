import {AQ,SOLIDS,type AqId,type SolidId} from '../../chemistry/species';
import {atom,type MoleculeSpec,type ReactionObservation} from '../../chemistry/reaction-view';
import {GASES,type GasId} from './materials';
import type {RigState} from '../grade9/process';
import {isCurriculumRig} from './kinds';
type S=[string,number?,('solid'|'gas')?];
const recipes:Record<string,[S[],S[]]>={
 'Fe + S → FeS':[[['Fe',1,'solid'],['S',1,'solid']],[['FeS',1,'solid']]],
 '2Cu + O₂ → 2CuO':[[['Cu',2,'solid'],['O2',1,'gas']],[['CuO',2,'solid']]],
 '2Mg + O₂ → 2MgO':[[['Mg',2,'solid'],['O2',1,'gas']],[['MgO',2,'solid']]],
 'CaCO₃ → CaO + CO₂':[[['CaCO3',1,'solid']],[['CaO',1,'solid'],['CO2',1,'gas']]],
 'CaO + H₂O → Ca(OH)₂':[[['CaO',1,'solid'],['H2O']],[['CaOH2',1,'solid']]],
 'S₂O₃²⁻ + 2H⁺ → S↓ + SO₂ + H₂O':[[['S2O3'],['H',2]],[['S',1,'solid'],['SO2',1,'gas'],['H2O']]],
 'Cu + 2H₂SO₄ → CuSO₄ + SO₂ + 2H₂O':[[['Cu',1,'solid'],['sulfuricNeat',2]],[['Cu'],['SO4'],['SO2',1,'gas'],['H2O',2]]],
 'C₂H₄ + Br₂ → C₂H₄Br₂':[[['C2H4',1,'gas'],['Br2']],[['dibromoethane']]],
 '3C₂H₄ + 2MnO₄⁻ + 4H₂O → 3C₂H₆O₂ + 2MnO₂ + 2OH⁻':[[['C2H4',3,'gas'],['MnO4',2],['H2O',4]],[['glycol',3],['MnO2',2,'solid'],['OH',2]]],
 '3C₂H₅OH + 2Cr₂O₇²⁻ + 16H⁺ → 3CH₃COOH + 4Cr³⁺ + 11H₂O':[[['ethanol',3],['Cr2O7',2],['H',16]],[['Ac',3],['Cr3',4],['H2O',11]]],
 'C₂H₅OH → C₂H₄ + H₂O':[[['ethanol']],[['C2H4',1,'gas'],['H2O']]],
 'C₁₀H₂₂ → C₈H₁₈ + C₂H₄':[[['decane']],[['octane'],['C2H4',1,'gas']]],
 'CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O':[[['Ac'],['ethanol']],[['ethylAcetate'],['H2O']]],
 'CH₄ + 2O₂ → CO₂ + 2H₂O':[[['CH4',1,'gas'],['O2',2,'gas']],[['CO2',1,'gas'],['H2O',2,'gas']]],
 '2CH₄ + 3O₂ → 2CO + 4H₂O':[[['CH4',2,'gas'],['O2',3,'gas']],[['CO',2,'gas'],['H2O',4,'gas']]],
 'CH₄ + O₂ → C + 2H₂O':[[['CH4',1,'gas'],['O2',1,'gas']],[['C',1,'solid'],['H2O',2,'gas']]],
 'C₂₅H₅₂ + 38O₂ → 25CO₂ + 26H₂O':[[['wax',1,'solid'],['O2',38,'gas']],[['CO2',25,'gas'],['H2O',26,'gas']]],
 'N₂O₄ ⇌ 2NO₂':[[['N2O4',1,'gas']],[['NO2',2,'gas']]],
 'N₂ + 3H₂ ⇌ 2NH₃':[[['N2',1,'gas'],['H2',3,'gas']],[['NH3',2,'gas']]],
 'C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂':[[['glucose']],[['ethanol',2],['CO2',2,'gas']]],
 'Fe³⁺ + SCN⁻ ⇌ FeSCN²⁺':[[['Fe3'],['SCN']],[['FeSCN']]],
};
function spec([id,count=1,phase]:S):MoleculeSpec{
 const def=phase==='solid'?SOLIDS[id as SolidId]:phase==='gas'?GASES[id as GasId]:AQ[id as AqId];
 const special:Record<string,[string,string]>={H:['Устөрөгчийн ион','H⁺'],OH:['Гидроксид','OH⁻'],H2O:['Ус','H₂O'],ethanol:['Этанол','C₂H₅OH']};
 return atom(id,def?.name??special[id]?.[0]??id,def?.formula??special[id]?.[1]??id,def&&'color' in def?def.color??'#bdd6df':'#bdd6df',count,phase);
}
export function curriculumObservations(before:RigState,after:RigState):ReactionObservation[]{
 if(!isCurriculumRig(after.kind)||(after.data.reactionRate??0)<=0)return [];
 let recipe=recipes[after.equation];
 if(after.kind==='electrolysisCell'){const metal=after.equation.startsWith('Ni')?'Ni':'Cu';recipe=[[[metal]],[[metal,1,'solid']]];}
 if(after.kind==='galvanicCell')recipe=[[['Zn',1,'solid'],['Cu']],[['Zn'],['Cu',1,'solid']]];
 if(!recipe)return [];
 if(after.equation.includes('⇌')){
  const a=after.chambers[0],b=before.chambers[0];
  const reverse=after.equation.startsWith('N₂O₄')?(a.g?.NO2??0)<(b.g?.NO2??0):after.equation.startsWith('N₂ +')?(a.g?.NH3??0)<(b.g?.NH3??0):after.equation.startsWith('CH₃COOH')?(a.aq.ethylAcetate??0)<(b.aq.ethylAcetate??0):(a.aq.FeSCN??0)<(b.aq.FeSCN??0);
  if(reverse)recipe=[recipe[1],recipe[0]];
 }
 return [{preset:'generic',key:`curriculum:${after.experiment}:${after.equation}`,reactants:recipe[0].map(spec),products:recipe[1].map(spec),rate:after.data.reactionRate,temp:after.temperature,equation:after.equation,sentence:after.message,effect:recipe[1].some(s=>s[2]==='solid')?'precipitate':recipe[1].some(s=>s[2]==='gas')?'gas':'color'}];
}
