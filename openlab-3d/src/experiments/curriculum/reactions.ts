import { AQ, SOLIDS, type AqId, type SolidId } from '../../chemistry/species';
import { acidState, acidityToNeutral, phOf } from '../../chemistry/equilibrium';
import { liquidMl, type Mixture } from '../../chemistry/mixture';
import type { GasId } from './materials';
export const aq=(m:Mixture,id:AqId)=>m.aq[id]??0;
export const sol=(m:Mixture,id:SolidId)=>m.s[id]??0;
export const gaseous=(m:Mixture,id:GasId)=>m.g?.[id]??0;
export function putA(m:Mixture,id:AqId,dn:number){m.aq[id]=Math.max(0,aq(m,id)+dn);}
export function putS(m:Mixture,id:SolidId,dn:number){m.s[id]=Math.max(0,sol(m,id)+dn);}
export function putG(m:Mixture,id:GasId,dn:number){m.g??={};m.g[id]=Math.max(0,gaseous(m,id)+dn);}
export interface ChemicalChange {equation:string;extent:number;effect:'gas'|'color'|'precipitate'|'physical'}
/** Finite-reactant, stoichiometric pathways. Rates are accelerated teaching kinetics.
 * The caller owns/clones the mixture. No products are selected by an experiment ID. */
export function reactCurriculum(m:Mixture,dt:number):ChemicalChange[]{
 const changes:ChemicalChange[]=[];if(!(dt>0))return changes;
 if(m.temp>60&&sol(m,'wax')>0){const dn=sol(m,'wax')*(-Math.expm1(-.1*dt));putS(m,'wax',-dn);putA(m,'waxLiquid',dn);}

 const fraction=(k:number)=>-Math.expm1(-k*dt);
 const report=(equation:string,extent:number,effect:ChemicalChange['effect']='color')=>{if(extent>1e-14)changes.push({equation,extent,effect});};
 // Dissolution of the newly stocked glucose is mass-conserving.
 if(m.water>0&&sol(m,'glucose')>0){const dn=Math.min(sol(m,'glucose'),Math.max(0,m.water/1000*3-aq(m,'glucose')))*fraction(.2);putS(m,'glucose',-dn);putA(m,'glucose',dn);}
 // Insoluble copper oxide consumes acid equivalents and produces the dissolved salt.
 if(m.water>0&&sol(m,'CuO')>0){const dn=Math.min(sol(m,'CuO'),Math.max(0,acidityToNeutral(m))/2)*fraction(.08*2**((m.temp-22)/25));putS(m,'CuO',-dn);putA(m,'Cu',dn);m.water+=dn*18.015;report('CuO + 2H⁺ → Cu²⁺ + H₂O',dn);}
 // Solid Fe/S and metal oxidation require heat and an actual oxygen reservoir.
 if(m.temp>=200&&sol(m,'Fe')>0&&sol(m,'S')>0){const dn=Math.min(sol(m,'Fe'),sol(m,'S'))*fraction(.08);putS(m,'Fe',-dn);putS(m,'S',-dn);putS(m,'FeS',dn);report('Fe + S → FeS',dn,'precipitate');}
 for(const [metal,oxide,threshold] of [['Cu','CuO',250],['Mg','MgO',500]] as const){
  if(m.temp>=threshold){const dn=Math.min(sol(m,metal),gaseous(m,'O2')*2)*fraction(.1);putS(m,metal,-dn);putG(m,'O2',-dn/2);putS(m,oxide,dn);report(`2${metal} + O₂ → 2${oxide}`,dn/2,'precipitate');}
 }
 if(m.temp>=850&&sol(m,'CaCO3')>0){const dn=sol(m,'CaCO3')*fraction(.04);putS(m,'CaCO3',-dn);putS(m,'CaO',dn);putG(m,'CO2',dn);report('CaCO₃ → CaO + CO₂',dn,'gas');}
 if(m.water>0&&sol(m,'CaO')>0){const dn=Math.min(sol(m,'CaO'),m.water/18.015)*fraction(.5);putS(m,'CaO',-dn);m.water-=dn*18.015;putS(m,'CaOH2',dn);m.temp+=dn*63000/(4.18*m.water+40);report('CaO + H₂O → Ca(OH)₂',dn,'precipitate');}
 if(m.water>0&&sol(m,'CaOH2')>0){const dn=Math.min(sol(m,'CaOH2'),Math.max(0,.02*m.water/1000-aq(m,'Ca')))*fraction(.3);putS(m,'CaOH2',-dn);putA(m,'Ca',dn);}
 // Loaded CO2 carbonates lime; gas in a receiver is not merely a decorative counter.
 if(gaseous(m,'CO2')>0&&sol(m,'CaOH2')>0){const dn=Math.min(gaseous(m,'CO2'),sol(m,'CaOH2'))*fraction(.3);putG(m,'CO2',-dn);putS(m,'CaOH2',-dn);putS(m,'CaCO3',dn);m.water+=dn*18.015;report('Ca(OH)₂ + CO₂ → CaCO₃ + H₂O',dn,'precipitate');}
 if(gaseous(m,'CO2')>0&&aq(m,'Ca')>0&&acidityToNeutral(m)<0){const dn=Math.min(gaseous(m,'CO2'),aq(m,'Ca'),-acidityToNeutral(m)/2)*fraction(.3);putG(m,'CO2',-dn);putA(m,'CO3',dn);m.water=Math.max(0,m.water-dn*18.015);report('CO₂ + Ca(OH)₂ → CaCO₃ + H₂O',dn,'precipitate');}
 // Thiosulfate forms actual elemental sulfur and SO2. Acid equivalents limit extent.
 if(aq(m,'S2O3')>0&&m.water>0){const h=Math.max(0,acidityToNeutral(m));const dn=Math.min(aq(m,'S2O3'),h/2)*fraction(.025*2**((m.temp-25)/10));putA(m,'S2O3',-dn);putS(m,'S',dn);putG(m,'SO2',dn);m.water+=dn*18.015;report('S₂O₃²⁻ + 2H⁺ → S↓ + SO₂ + H₂O',dn,'precipitate');}
 // Hot concentrated sulfuric acid oxidises Cu; sulfate is both spectator and oxidant.
 if(m.temp>=60&&m.from.includes('h2so4_conc')&&aq(m,'sulfuricNeat')/Math.max(.001,liquidMl(m)/1000)>=6){const dn=Math.min(sol(m,'Cu'),aq(m,'sulfuricNeat')/2,Math.max(0,acidityToNeutral(m))/4)*fraction(.04);putS(m,'Cu',-dn);putA(m,'sulfuricNeat',-2*dn);putA(m,'SO4',dn);putA(m,'Cu',dn);putG(m,'SO2',dn);m.water+=2*dn*18.015;report('Cu + 2H₂SO₄ → CuSO₄ + SO₂ + 2H₂O',dn,'gas');}
 // Ethene addition. A dark alkane control is intentionally inert.
 const ethene=gaseous(m,'C2H4');
 if(ethene>0&&aq(m,'Br2')>0){const dn=Math.min(ethene,aq(m,'Br2'))*fraction(.8);putG(m,'C2H4',-dn);putA(m,'Br2',-dn);putA(m,'dibromoethane',dn);report('C₂H₄ + Br₂ → C₂H₄Br₂',dn,'color');}
 if(gaseous(m,'C2H4')>0&&aq(m,'MnO4')>0&&m.water>0){const dn=Math.min(gaseous(m,'C2H4')/3,aq(m,'MnO4')/2,m.water/18.015/4)*fraction(.15);putG(m,'C2H4',-3*dn);putA(m,'MnO4',-2*dn);putA(m,'glycol',3*dn);putS(m,'MnO2',2*dn);m.water-=4*dn*18.015;report('3C₂H₄ + 2MnO₄⁻ + 4H₂O → 3C₂H₆O₂ + 2MnO₂ + 2OH⁻',dn,'precipitate');}
 // Acid dichromate oxidises ethanol to ethanoic acid. Charge balance consumes H+.
 if(m.temp>=40&&m.ethanol>0&&aq(m,'Cr2O7')>0){const dn=Math.min(m.ethanol*.789/46.069/3,aq(m,'Cr2O7')/2,Math.max(0,acidityToNeutral(m))/16)*fraction(.06);m.ethanol-=3*dn*46.069/.789;putA(m,'Cr2O7',-2*dn);putA(m,'Cr3',4*dn);putA(m,'Ac',3*dn);m.water+=11*dn*18.015;report('3C₂H₅OH + 2Cr₂O₇²⁻ + 16H⁺ → 3CH₃COOH + 4Cr³⁺ + 11H₂O',dn,'color');}
 // Acid permanganate does the same oxidation; purple MnO₄⁻ fades to pale Mn²⁺.
 if(m.temp>=40&&m.ethanol>0&&aq(m,'MnO4')>0){const dn=Math.min(m.ethanol*.789/46.069/5,aq(m,'MnO4')/4,Math.max(0,acidityToNeutral(m))/12)*fraction(.06);m.ethanol-=5*dn*46.069/.789;putA(m,'MnO4',-4*dn);putA(m,'Mn',4*dn);putA(m,'Ac',5*dn);m.water+=11*dn*18.015;report('5C₂H₅OH + 4MnO₄⁻ + 12H⁺ → 5CH₃COOH + 4Mn²⁺ + 11H₂O',dn,'color');}
 // Hot copper oxide is reduced by hydrogen held over it: black → pink copper.
 if(m.temp>=150&&sol(m,'CuO')>0&&gaseous(m,'H2')>0){const dn=Math.min(sol(m,'CuO'),gaseous(m,'H2'))*fraction(.2);putS(m,'CuO',-dn);putG(m,'H2',-dn);putS(m,'Cu',dn);putG(m,'H2O',dn);report('CuO + H₂ → Cu + H₂O',dn,'color');}
 // Iron(II) sulfide and acid give H₂S, which precipitates the sulfides of Cu, Pb and Cd.
 if(m.water>0&&sol(m,'FeS')>0){const dn=Math.min(sol(m,'FeS'),Math.max(0,acidityToNeutral(m))/2)*fraction(.1);putS(m,'FeS',-dn);putA(m,'Fe2',dn);putG(m,'H2S',dn);report('FeS + 2H⁺ → Fe²⁺ + H₂S',dn,'gas');}
 for(const [ion,sulfide] of [['Cu','CuS'],['Pb','PbS'],['Cd','CdS']] as const){
  if(m.water>0&&gaseous(m,'H2S')>0&&aq(m,ion)>0){const dn=Math.min(gaseous(m,'H2S'),aq(m,ion))*fraction(.5);putG(m,'H2S',-dn);putA(m,ion,-dn);putS(m,sulfide,dn);report(`${ion}²⁺ + H₂S → ${SOLIDS[sulfide].formula}↓ + 2H⁺`,dn,'precipitate');}
 }
 // Concentrated sulfuric acid strips water from sugar, leaving a hot column of carbon.
 if(m.from.includes('h2so4_conc')&&aq(m,'sulfuricNeat')/Math.max(.001,liquidMl(m)/1000)>=6&&sol(m,'sucrose')+aq(m,'sucrose')>0){const dn=(sol(m,'sucrose')+aq(m,'sucrose'))*fraction(.05);const s=Math.min(sol(m,'sucrose'),dn);putS(m,'sucrose',-s);putA(m,'sucrose',-(dn-s));putS(m,'C',12*dn);m.water+=11*dn*18.015;m.temp=Math.min(120,m.temp+dn*900000/(4.18*Math.max(5,liquidMl(m))+40));report('C₁₂H₂₂O₁₁ → 12C + 11H₂O',dn,'precipitate');}
 // Catalysed ethanol dehydration and hydrocarbon cracking are distinct heat regimes.
 const acid=(m.ethanol>0||aq(m,'Ac')+aq(m,'aceticNeat')+aq(m,'ethylAcetate')>0)&&acidState(m).h>.01;
 if(m.temp>=160&&m.temp<250&&m.ethanol>0&&m.from.includes('h2so4_conc')&&acid){const dn=m.ethanol*.789/46.069*fraction(.02);m.ethanol-=dn*46.069/.789;m.water+=dn*18.015;putG(m,'C2H4',dn);report('C₂H₅OH → C₂H₄ + H₂O',dn,'gas');}
 if(m.temp>=400&&sol(m,'alumina')>0&&aq(m,'decane')>0){const dn=aq(m,'decane')*fraction(.05);putA(m,'decane',-dn);putA(m,'octane',dn);putG(m,'C2H4',dn);report('C₁₀H₂₂ → C₈H₁₈ + C₂H₄',dn,'gas');}
 // Esterification uses the current amounts, including its reverse hydrolysis.
 if(m.temp>=40&&m.temp<150&&acid&&(aq(m,'Ac')+aq(m,'aceticNeat')+aq(m,'ethylAcetate'))>0){
  const a=aq(m,'Ac')+aq(m,'aceticNeat'),b=m.ethanol*.789/46.069,e=aq(m,'ethylAcetate'),w=m.water/18.015;
  let lo=-Math.min(e,w),hi=Math.min(a,b);
  for(let i=0;i<60;i++){const x=(lo+hi)/2;if((e+x)*(w+x)<4*(a-x)*(b-x))lo=x;else hi=x;}
  const dn=(lo+hi)/2*fraction(.03);
  if(dn>=0){const neat=Math.min(aq(m,'aceticNeat'),dn);putA(m,'aceticNeat',-neat);putA(m,'Ac',-(dn-neat));}else putA(m,'Ac',-dn);
  m.ethanol=Math.max(0,m.ethanol-dn*46.069/.789);putA(m,'ethylAcetate',dn);m.water=Math.max(0,m.water+dn*18.015);
  report('CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O',Math.abs(dn),'color');
 }
 // These pathways also work in ordinary glassware, rather than only in a guide.
 if(m.temp>=60){const yeast=sol(m,'yeast'),enzyme=sol(m,'amylase');putS(m,'yeast',-yeast);putS(m,'deadYeast',yeast);putS(m,'amylase',-enzyme);putS(m,'inactiveAmylase',enzyme);}
 if(m.water>0&&sol(m,'yeast')>0){
  const hydro=Math.min(aq(m,'sucrose'),m.water/18.015)*fraction(.0001);putA(m,'sucrose',-hydro);m.water-=hydro*18.015;putA(m,'glucose',2*hydro);
  const dn=aq(m,'glucose')*fraction(.00003*Math.exp(-(((m.temp-32)/18)**2)));putA(m,'glucose',-dn);m.ethanol+=2*dn*46.069/.789;putG(m,'CO2',2*dn);report('C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂',dn,'gas');
 }
 if(m.water>0&&aq(m,'starch')>0){
  const ph=phOf(m)??7,enzyme=sol(m,'amylase')>0&&ph>4&&ph<9;
  const k=ph<3?.0002*2**((m.temp-25)/10):enzyme?.002*Math.exp(-(((m.temp-37)/20)**2)):0;
  const dn=Math.min(aq(m,'starch')*fraction(k),m.water/18.015*(enzyme?2:1));putA(m,'starch',-dn);putA(m,enzyme?'maltose':'glucose',enzyme?dn/2:dn);m.water-=dn*18.015/(enzyme?2:1);report(enzyme?'2(C₆H₁₀O₅) + H₂O → C₁₂H₂₂O₁₁ (амилаза)':'(C₆H₁₀O₅) + H₂O → C₆H₁₂O₆ (хүчил)',dn);
 }
 if(m.water>0&&aq(m,'cyclohexane')>0&&aq(m,'diamine')>0&&aq(m,'sebacoyl')>0){const dn=Math.min(aq(m,'diamine'),aq(m,'sebacoyl'))*fraction(.08);putA(m,'diamine',-dn);putA(m,'sebacoyl',-dn);putS(m,'nylon610',dn);putS(m,'nylonEnds',dn);putA(m,'Cl',dn);report('Диамин + себакоилхлорид → полиамидын холбоо + HCl',dn,'precipitate');}
 // A flame alone cannot create methane products without loaded CH4 and O2.
 if(m.burning&&gaseous(m,'CH4')>0){
  const ratio=gaseous(m,'O2')/gaseous(m,'CH4');
  const oxygen=ratio>=2?2:ratio>=1.5?1.5:1;
  const dn=Math.min(gaseous(m,'CH4'),gaseous(m,'O2')/oxygen)*fraction(.15);
  putG(m,'CH4',-dn);putG(m,'O2',-oxygen*dn);putG(m,'H2O',2*dn);
  if(oxygen===2){putG(m,'CO2',dn);report('CH₄ + 2O₂ → CO₂ + 2H₂O',dn,'gas');}
  else if(oxygen===1.5){putG(m,'CO',dn);report('2CH₄ + 3O₂ → 2CO + 4H₂O',dn/2,'gas');}
  else{putS(m,'C',dn);report('CH₄ + O₂ → C + 2H₂O',dn,'precipitate');}
 }
 if(m.burning&&sol(m,'wax')+aq(m,'waxLiquid')>0){const dn=Math.min(sol(m,'wax')+aq(m,'waxLiquid'),gaseous(m,'O2')/38)*fraction(.05);const s=Math.min(sol(m,'wax'),dn);putS(m,'wax',-s);putA(m,'waxLiquid',-(dn-s));putG(m,'O2',-38*dn);putG(m,'CO2',25*dn);putG(m,'H2O',26*dn);report('C₂₅H₅₂ + 38O₂ → 25CO₂ + 26H₂O',dn,'gas');}
 return changes;
}
/** Standard physical sample properties. These remain approximate teaching data. */
export const MATERIAL_PROPERTIES:Partial<Record<SolidId,{density:number;conducts:boolean;magnetic:boolean;ductile:boolean}>>={
 Fe:{density:7.87,conducts:true,magnetic:true,ductile:true},Cu:{density:8.96,conducts:true,magnetic:false,ductile:true},Al:{density:2.70,conducts:true,magnetic:false,ductile:true},Zn:{density:7.14,conducts:true,magnetic:false,ductile:true},Ni:{density:8.90,conducts:true,magnetic:true,ductile:true},Ag:{density:10.49,conducts:true,magnetic:false,ductile:true},S:{density:2.07,conducts:false,magnetic:false,ductile:false},P:{density:2.2,conducts:false,magnetic:false,ductile:false},graphite:{density:2.26,conducts:true,magnetic:false,ductile:false},wax:{density:.90,conducts:false,magnetic:false,ductile:false},benzoic:{density:1.27,conducts:false,magnetic:false,ductile:false},sand:{density:2.65,conducts:false,magnetic:false,ductile:false},
};
export const amountMass=(m:Mixture,id:AqId|SolidId,solid=false)=>solid?(m.s[id as SolidId]??0)*SOLIDS[id as SolidId].molarMass:(m.aq[id as AqId]??0)*AQ[id as AqId].molarMass;
