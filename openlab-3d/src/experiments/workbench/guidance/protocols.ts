import type {GuideStep} from './plans';
import type {Check,Endpoint} from './conditions';
import {CATALOG,type BenchKey,type EquipmentKind} from '../../../equipment/equipmentCatalog';
import type {ReagentId} from '../../../chemistry/reagents';
const check=(metric:Check['metric'],min?:number,max?:number,other:Partial<Check>={}):Check=>({metric,...(min===undefined?{}:{min}),...(max===undefined?{}:{max}),...other});
const s=(species:string,min=1e-6,port?:number,target?:BenchKey)=>check('solid',min,undefined,{species,port,target});
const a=(species:string,min=1e-6,port?:number,target?:BenchKey)=>check('aqueous',min,undefined,{species,port,target});
const data=(key:string,min:number)=>check('data',min,undefined,{key});
const wait=(label:string,checks:Check[],other:Partial<Endpoint>={}):GuideStep=>({type:'observe',label,target:checks.find(c=>c.target)?.target,duration:2,until:{label,checks,minimum:2,timeout:90,speed:8,...other}});
const record=(label:string,target?:BenchKey,port?:number):GuideStep=>({type:'record',label,target,port});
const config=(label:string,change:Extract<GuideStep,{type:'configure'}>['change'],target?:BenchKey):GuideStep=>({type:'configure',label,change,target});
const dose=(reagent:ReagentId,amount:number,port=0,target?:BenchKey,filter?:EquipmentKind):Extract<GuideStep,{type:'dose'}>=>({type:'dose',reagent,amount,port,target,filter});
const move=(from:EquipmentKind,to:EquipmentKind,amount:number,filter?:EquipmentKind):Extract<GuideStep,{type:'move'}>=>({type:'move',from,to,amount,filter,label:`${CATALOG[from].name} → ${CATALOG[to].name}: ${amount} мл${filter?' · шүүх':''}`});
/** Every supported demo has a measured primary endpoint, not a generic end-of-timer success. */
function primary(id:string):Check[]{
 const explicit:Record<string,Check[]>={
  'g7-salt-dissolving':[a('Na',.008),check('solid',undefined,1e-7,{species:'NaCl'})],
  'g7-salt-evaporation':[check('liquid',4.9,undefined,{target:'evaporatingDish'})],
  'g7-phenolphthalein':[check('ph',11)],'g7-magnesium-ph':[check('acid',undefined,1e-5)],
  'g10-salt-oxide':[a('Cu',.00045),check('acid',undefined,1e-5)],
  'g10-titration':[check('ph',undefined,3)],
  'g10-precipitation':[s('AgCl',1e-5)],'g10-displacement':[s('Cu',1e-5)],
  'g10-flame':[check('sample',1e-6,undefined,{species:'Na',target:'wireLoop'})],

  'g7-sugar-motion':[check('extent',.9)],'g7-liquid-layers':[data('mixing',.9),data('oil',4.9)],'g7-gas-motion':[data('dispersion',.9)],'g7-diffusion-comparison':[data('dispersion',.8),data('liquidDispersion',.8)],
  'g7-wax-water':[a('waxLiquid',.002,1),check('solid',undefined,1e-7,{species:'ice',port:0})],
  'g7-ethanol-vapour':[check('ethanol',4.8,undefined,{port:1})],
  'g7-copper-oxidation':[s('CuO',.0015)],'g7-material-properties':[check('mass',.99)],'g7-density':[check('data',8.8,undefined,{key:'unused'})],
  'g7-metal-acid':[check('acid',undefined,1e-5,{port:0}),s('Cu',.001,4)],
  'g7-iron-sulfur-properties':[s('Fe',.009),s('S',.009)],'g7-iron-sulfur-mixture':[s('Fe',.009),s('S',.009)],'g7-iron-sulfur-reaction':[s('FeS',.0098)],
  'g7-candle-changes':[a('waxLiquid',.0002)],'g7-magnesium-burning':[s('MgO',.004)],
  'g7-chloride':[check('volume',55)],'g7-sulfate':[check('volume',55)],
  'g7-hydroxides':[s('AlOH3',1e-5,0),s('CuOH2',1e-5,1)],'g7-indicators':[check('ph',undefined,3,{port:0}),check('ph',11,undefined,{port:1})],
  'g7-rust-conditions':[s('FeOH3',1e-5,1),s('Fe',.017,2)],'g7-metal-corrosion':[data('surface0',.01)],'g7-rust-protection':[s('FeOH3',1e-5)],
  'g7-soil-settling':[data('settled0',.1)],'g7-soil-composition':[data('settled0',.1)],'g7-soil-growth':[data('height',.1)],'g7-soil-retention':[check('water',19.9)],'g7-soil-ph-survey':[check('ph',0,14)],'g7-freezing-investigation':[s('ice',.001,0),s('ice',.001,1)],
  'g10-mole':[check('solidMass',.99)],'g10-solution':[a('Na',.0016),check('solid',undefined,1e-7,{species:'NaCl'})],
  'g10-melting':[a('benzoic',.007,0),a('benzoic',.007,1)],'g10-boiling':[check('liquid',4.8,undefined,{port:1})],
  'g10-chromatography':[check('extent',12)],'g10-cations':[s('CuOH2',1e-5,0),s('FeOH3',1e-5,2)],'g10-anions':[s('BaSO4',1e-5,0),s('AgCl',1e-5,1)],
  'g10-gas-tests':[s('CaCO3',1e-5,2)],'g10-rate-zinc':[check('solid',undefined,1e-7,{species:'Zn'})],'g10-rate-concentration':[check('volume',55)],'g10-rate-surface':[check('solid',undefined,1e-7,{species:'CaCO3'})],
  'g10-thiosulfate':[check('data',undefined,0,{key:'crossVisible'}),s('S',1e-5)],'g10-catalysts':[check('aqueous',undefined,1e-5,{species:'H2O2'})],
  'g10-hydrate':[s('CuSO4',.0039),check('water',.35,undefined,{port:2})],'g10-equilibrium':[a('FeSCN',1e-5)],'g10-ion-migration':[data('migration',.95)],
  'g10-galvanic':[data('cellCurrent',1e-4)],'g10-electrolysis':[data('deposited',.0001)],'g10-electroplating':[data('deposited',.0001)],'g10-corrosion':[s('FeOH3',1e-5)],
  'g10-limestone':[s('CaO',.00098)],'g10-carbonate':[check('solid',undefined,1e-7,{species:'CaCO3'})],'g10-sulfur-acid':[a('Cu',.0015)],
  'g10-combustion':[check('gas',.002,undefined,{species:'CO2'}),check('gas',undefined,1e-6,{species:'CH4'})],
  'g10-oil-distillation':[check('liquid',undefined,.1),...[1,2,3,4].map(port=>check('liquid',.1,undefined,{port}))],
  'g10-viscosity':[data('distance',.099)],'g10-cracking':[a('dibromoethane',1e-5,2),check('aqueous',undefined,1e-6,{species:'decane'})],'g10-isomers':[data('kitComplete',1)],
  'g10-alkene':[a('dibromoethane',1e-5)],'g10-ethene-preparation':[a('dibromoethane',1e-5,2),check('ethanol',undefined,.1)],'g10-ethanol-oxidation':[a('Cr3',1e-5),check('aqueous',undefined,1e-6,{species:'Cr2O7'})],
  'g10-fermentation':[check('ethanol',.1),check('aqueous',undefined,1e-5,{species:'glucose'}),s('CaCO3',1e-6,2)],
  'g10-acid-ph':[check('ph',undefined,2,{port:0}),check('ph',2,4,{port:1})],'g10-acid-carbonate':[check('solid',undefined,1e-7,{species:'NaHCO3'})],
  'g10-esterification':[a('ethylAcetate',.01)],'g10-nylon':[s('nylon610',.0002,2)],'g10-starch':[check('aqueous',undefined,1e-5,{species:'starch',port:7}),a('maltose',1e-5,7),a('starch',1e-5,4)],'g10-plastic-audit':[check('solidMass',.99,undefined,{port:0}),check('solidMass',.99,undefined,{port:1})],
  'g10-no2-equilibrium':[check('gas',1e-5,undefined,{species:'NO2'}),check('gas',1e-5,undefined,{species:'N2O4'})],'g10-haber':[check('gas',1e-7,undefined,{species:'NH3'})],
  'g9-liquid-motion':[check('extent',.8)],'g9-state-change':[check('solid',undefined,1e-7,{species:'ice'}),check('temperature',40)],'g9-gas-expansion':[check('volume',11)],
  'g9-liquid-diffusion':[check('extent',.9)],'g9-gas-diffusion':[s('NH4Cl',1e-5,2)],'g9-diffusion-temperature':[check('extent',.9)],'g9-diffusion-surface':[check('extent',.9)],'g9-diffusion-media':[check('extent',.8)],
  'g9-period3':[check('extent',.9)],'g9-halogens':[a('Br2',1e-6),a('I2',1e-6,1)],'g9-transition-colours':[a('Fe2',1e-5)],'g9-catalyst-screen':[check('aqueous',undefined,1e-5,{species:'H2O2'})],
  'g9-element-types':[check('extent',.9)],'g9-chromatography':[check('extent',12)],'g9-filtration':[check('liquid',9.9,undefined,{target:'erlenmeyer'}),check('solidMass',.99,undefined,{target:'funnel'})],
  'g9-crystallisation':[s('NaCl',1e-5,undefined,'evaporatingDish')],'g9-mass-conservation':[check('solid',undefined,1e-7,{species:'Na2CO3'})],'g9-reaction-types':[s('CuO',1e-5),s('CaCO3',1e-5,2)],
  'g9-precipitation':[s('CuOH2',1e-5)],'g9-thermal-pairs':[a('NH3',1e-5)],'g9-fuel-energy':[check('temperature',30)],'g9-citric-endotherm':[check('solid',undefined,1e-7,{species:'NaHCO3'}),a('Cit',1e-5)],
  'g9-litmus':[check('ph',undefined,3,{port:0}),check('ph',11,undefined,{port:1})],'g9-ph-ranking':[check('ph',0,7)],'g9-zinc-hcl':[check('solid',undefined,1e-7,{species:'Zn'})],
  'g9-carbonate-co2':[check('solid',undefined,1e-7,{species:'CaCO3'}),s('CaCO3',1e-5,2)],'g9-antacid':[check('acid',undefined,1e-6)],'g9-air-oxygen':[s('CuO',.0015)],
  'g9-corrosion':[s('FeOH3',1e-5)],'g9-ammonia-preparation':[check('volume',20)],'g9-water-tests':[a('Cu',1e-6)],'g9-air-distillation':[check('volume',99)],
  'reaction-timing':[check('solid',undefined,1e-7,{species:'CaCO3'})],'melting-point':[check('solid',undefined,1e-7,{species:'ice',port:0}),check('solid',undefined,1e-7,{species:'ice',port:1})],'group2-water':[s('Mg',.004),check('volume',undefined,.1)],'group2-acid':[check('volume',55)],
  'halogens':[a('Br2',1e-6),a('I2',1e-6,1)],'physical-change':[check('solid',undefined,1e-7,{species:'ice'})],
  'rate-concentration':[check('solid',undefined,1e-7,{species:'CaCO3'})],'rate-temperature':[check('solid',undefined,1e-7,{species:'CaCO3'})],'rate-surface':[check('solid',undefined,1e-7,{species:'CaCO3'})],
  'candle-products':[check('gas',1e-6,undefined,{species:'CO2'})],'fuel-energy':[check('temperature',30)],
  'nacl-solution':[a('Na',.001),check('acid',undefined,1e-5)],'copper-salt':[a('Cu',.0007),check('solid',undefined,1e-7,{species:'CuCO3'})],'zinc-salt':[a('Zn',.001),check('solid',undefined,1e-7,{species:'Zn'})],
  'activity-matrix':[s('Cu',1e-5)],'acid-heat':[check('acid',undefined,1e-6)],'vinegar-soda':[check('solid',undefined,1e-7,{species:'NaHCO3'})],'kcl-dissolution':[a('K',.01),check('solid',undefined,1e-7,{species:'KCl'})],
  'wastewater':[check('ph',6,8)],'catalyst-reuse':[check('aqueous',undefined,1e-5,{species:'H2O2'}),s('MnO2',.001)],
  'nacl':[a('Na',.001),check('acid',undefined,1e-6)],'elephant':[check('aqueous',undefined,1e-5,{species:'H2O2'})],'metals':[s('Cu',1e-5)],'indicators':[check('ph',undefined,3)],'titration':[check('ph',undefined,3)],'precipitates':[s('CuOH2',1e-5)],'gases':[check('solid',undefined,1e-7,{species:'NaHCO3'})],
  'color-tests':[a('starch',1e-5),a('I2',1e-7)],'thermo':[a('NH3',.01)],'cuso4':[a('Cu',1e-5)],'boil':[check('temperature',98)],'crystals':[s('NaCl',1e-5)],'fire':[check('ethanol',undefined,.2),check('burning',undefined,0)],
 };
 // Property measurements are references calculated from the loaded sample, not new chemical products.
 if(id==='g7-density')return [check('mass',25.9),s('Cu',.015)];
 const result=explicit[id];if(!result)throw Error(`Missing measured completion criteria: ${id}`);return result;
}
const salts:Record<string,{solid:string;source?:EquipmentKind}>={nacl:{solid:'NaCl'},'nacl-solution':{solid:'NaCl'},'copper-salt':{solid:'CuSO4_5'},'zinc-salt':{solid:'ZnSO4'},'g10-salt-oxide':{solid:'CuSO4_5'},'g7-salt-dissolving':{solid:'NaCl'},'g7-salt-evaporation':{solid:'NaCl',source:'evaporatingDish'},'g9-crystallisation':{solid:'NaCl',source:'evaporatingDish'},crystals:{solid:'NaCl',source:'evaporatingDish'},cuso4:{solid:'CuSO4_5',source:'evaporatingDish'}};
/** Workup uses real transfers, filtrate, retained solids and a cooled/dry final sample. */
function saltWorkup(id:string):GuideStep[]{
 const recipe=salts[id];if(!recipe)return [];
 const from=recipe.source??'beaker';
 const all=(from:EquipmentKind,to:EquipmentKind,filter?:EquipmentKind):GuideStep=>({...move(from,to,1,filter),all:true,label:`${CATALOG[from].name} дахь бүх дээжийг ${CATALOG[to].name}-т ${filter?'шүүж ':''}шилжүүл.`});
 const out:GuideStep[]=[];
 if(from!=='evaporatingDish')out.push({type:'place',item:'funnel',onto:'erlenmeyer',label:'Цаастай юүлүүрийг конус колбонд суурилуул.'},all(from,'erlenmeyer','funnel'),dose('water',1,0,'erlenmeyer','funnel'),record('Шүүлтүүр дээрх үлдэгдлийг угааж, давсны уусмалыг бүрэн цуглуулав.','erlenmeyer'),all('erlenmeyer','evaporatingDish'),{type:'place',item:'funnel',onto:'table',label:'Юүлүүрийг ширээнд буцааж тавь.'});
 out.push(config('Ууршуулагч аягийг халааж усыг багасга.',{heating:true},'evaporatingDish'),wait('Ус ууршиж хуурай давс үлдэхийг хүлээ.',[s(recipe.solid,1e-6,undefined,'evaporatingDish'),check('water',undefined,.001,{target:'evaporatingDish'})],{speed:8,timeout:120,minimum:0,stopHeat:true}),config('Халаагуурыг унтрааж талстыг хөргө.',{heating:false},'evaporatingDish'),wait('Давсыг 35°C-ээс доош хөргөнө.',[check('temperature',undefined,35,{target:'evaporatingDish'})],{speed:12,timeout:120}),all('evaporatingDish','watchGlass'),wait('Хуурай бүтээгдэхүүн хүлээн авах шилэнд цуглав.',[s(recipe.solid,1e-6,undefined,'watchGlass'),check('water',undefined,.001,{target:'watchGlass'})]),record('Гарган авсан хуурай, хөргөсөн давс.','watchGlass'));
 return out;
}
export function completeProtocol(id:string,starter:GuideStep[]):GuideStep[]{
 let setup:GuideStep[]=starter.filter(s=>s.type!=='observe'||id==='g9-air-distillation'||id==='g9-crystallisation').map(s=>s.type==='observe'?{...s,until:{label:s.label,checks:id==='g9-air-distillation'?[check('temperature',undefined,-199)]:[s2('NaCl','evaporatingDish')],speed:8,timeout:90}}:s);
 // 7-01: three beakers side by side — room, ice-cooled and hot water — and a sugar lump in each.
 if(id==='g7-sugar-motion'){
  const gone=(t:BenchKey)=>check('solid',undefined,1e-7,{species:'sucrose',target:t});
  return [
   dose('water',50,0,'beaker'),dose('cold_water',50,0,'beaker#2'),dose('hot_water',50,0,'beaker#3'),
   // Enough ice that some is still floating while the sugar dissolves, so the water stays near 0 °C.
   dose('s_ice',25,0,'beaker#2'),
   wait('Хүйтэн усыг мөсөөр хөргөж байна.',[check('temperature',undefined,5,{target:'beaker#2'}),check('solid',.001,undefined,{species:'ice',target:'beaker#2'})],{speed:1,timeout:60,minimum:0}),
   dose('s_sugar',1,0,'beaker#2'),dose('s_sugar',1,0,'beaker'),dose('s_sugar',1,0,'beaker#3'),
   wait('Халуун усанд ёотон уусч алга болохыг ажигла.',[gone('beaker#3')],{speed:2,timeout:300,minimum:0}),record('Халуун ус: ёотон хамгийн түрүүнд уусав.','beaker#3'),
   wait('Тасалгааны температуртай усанд уусахыг ажигла.',[gone('beaker')],{speed:2,timeout:300,minimum:0}),record('Тасалгааны ус: ёотон уусав.','beaker'),
   wait('Мөстэй хүйтэн усанд уусахыг ажигла.',[gone('beaker#2')],{speed:4,timeout:600,minimum:0}),record('Хүйтэн ус: ёотон хамгийн сүүлд уусав.','beaker#2'),
   {type:'finish',label:'Ус халуун байх тусам ёотон хурдан уусна: хэсгүүд хурдан хөдөлдөг.',target:'beaker',until:{label:'Гурван аяганд ёотон уусав.',checks:[gone('beaker'),gone('beaker#2'),gone('beaker#3')]}},
  ];
 }
 // 9-15: four mixtures in four beakers, each filtered: sand and tomato pulp stay on the paper, salt and alcohol pass.
 if(id==='g9-filtration'){
  const mixtures:[BenchKey,ReagentId,number,string,Check[]][]=[
   ['beaker','s_sand',1,'Элстэй ус: элс шүүлтүүр дээр үлдэнэ (гетероген).',[check('solidMass',.9,undefined,{target:'funnel'}),check('solidMass',undefined,1e-6,{target:'erlenmeyer'}),check('water',19,undefined,{target:'erlenmeyer'})]],
   ['beaker#2','tomato',5,'Улаан лоолийн жүүс: шир цаасан дээр, улаан шүүгдэс доош (гетероген).',[s('paper',1e-6,undefined,'funnel'),a('dyeR',1e-8,undefined,'erlenmeyer')]],
   ['beaker#3','s_nacl',1,'Давсны уусмал: цаасан дээр юу ч үлдэхгүй (гомоген).',[a('Na',.015,undefined,'erlenmeyer'),check('solidMass',undefined,1e-6,{target:'funnel'})]],
   ['beaker#4','ethanol',5,'Спиртийн уусмал: бүгд шүүгдэнэ (гомоген).',[check('ethanol',4,undefined,{target:'erlenmeyer'}),check('solidMass',undefined,1e-6,{target:'funnel'})]],
  ];
  const p:GuideStep[]=mixtures.flatMap(([cup,reagent,amount]):GuideStep[]=>[dose('water',20,0,cup),dose(reagent,amount,0,cup)]);
  p.push(wait('Давс бүрэн уусахыг хүлээ.',[check('solid',undefined,1e-7,{species:'NaCl',target:'beaker#3'})],{speed:4,timeout:120,minimum:0}));
  p.push({type:'place',item:'funnel',onto:'erlenmeyer',label:'Шүүлтүүр цаастай юүлүүрийг колбонд суулга.'});
  mixtures.forEach(([cup,,,label,checks],i)=>{
   p.push({type:'move',from:cup,to:'erlenmeyer',amount:1,all:true,filter:'funnel',label:`${i+1}-р холимгийг юүлүүрээр шү.`},wait(label,checks,{speed:4,timeout:60,minimum:0}),record(label,'erlenmeyer'));
   if(i<mixtures.length-1)p.push({type:'reset',label:'Шүүгдсийг асгаж колбыг угаана.',target:'erlenmeyer'},{type:'reset',label:'Шүүлтүүрийн цаасыг солино.',target:'funnel'});
  });
  p.push({type:'finish',label:'Гетероген холимгийг шүүж салгаж болно; гомоген холимог шүүлтүүрээр салахгүй.',target:'erlenmeyer',until:{label:'Дөрвөн холимгийг шүүв.',checks:mixtures[3][4]}});
  return p;
 }
 // 9-06: copper sulfate under room-temperature, cold and heated water in three beakers.
 if(id==='g9-diffusion-temperature'){
  const gone=(t:BenchKey)=>check('solid',undefined,1e-7,{species:'CuSO4_5',target:t});
  return [
   dose('s_cuso4',5,0,'beaker'),dose('s_cuso4',5,0,'beaker#2'),dose('s_cuso4',5,0,'beaker#3'),
   dose('water',100,0,'beaker'),{type:'place',item:'watchGlass',onto:'beaker',label:'Эхний аягыг цагийн шилээр тагла.'},
   dose('cold_water',100,0,'beaker#2'),
   dose('water',100,0,'beaker#3'),config('Гурав дахь аягыг халаагуур дээр халаа.',{heating:true},'beaker#3'),
   wait('Гурав дахь аяганы ус халж байна.',[check('temperature',60,undefined,{target:'beaker#3'})],{speed:4,timeout:180,minimum:0,stopHeat:true}),
   wait('Халуун усанд зэсийн сульфат түрүүлж уусна.',[gone('beaker#3')],{speed:2,timeout:300,minimum:0}),record('Халаасан ус: хамгийн түрүүнд уусав.','beaker#3'),
   wait('Тасалгааны усанд уусахыг ажигла.',[gone('beaker')],{speed:2,timeout:300,minimum:0}),record('Тасалгааны ус: уусав.','beaker'),
   wait('Хүйтэн усанд уусахыг ажигла.',[gone('beaker#2')],{speed:4,timeout:600,minimum:0}),record('Хүйтэн ус: хамгийн сүүлд уусав.','beaker#2'),
   {type:'finish',label:'Температур өндөр байх тусам диффуз ба уусалт хурдан.',target:'beaker',until:{label:'Гурван аяганд зэсийн сульфат уусав.',checks:[gone('beaker'),gone('beaker#2'),gone('beaker#3')]}},
  ];
 }
 if(id==='melting-point'){
  const purePlateau=[check('solid',.001,undefined,{species:'ice',port:0}),check('temperature',-.05,.05,{port:0})];
  const saltedPlateau=[check('solid',.001,undefined,{species:'ice',port:1}),check('temperature',-21.1,-.1,{port:1})];
  const pureMelted=[check('solid',undefined,1e-7,{species:'ice',port:0})];
  const saltedMelted=[check('solid',undefined,1e-7,{species:'ice',port:1})];
  const melted=[...pureMelted,...saltedMelted];
  return [
   ...setup,
   wait('Цэвэр мөс хайлах үеийн температурыг тогтооно.',purePlateau,{speed:4,timeout:90,minimum:0}),
   record('Цэвэр мөсний хайлах үеийн хэмжилт.','heatingBath',0),
   {type:'configure',label:'Харьцуулах үүрийг сонгож халаана.',target:'heatingBath',change:{port:1}},
   wait('Давстай мөсний хайлах үеийн температурыг тогтооно.',saltedPlateau,{speed:4,timeout:90,minimum:0}),
   record('Давстай мөсний хайлах үеийн хэмжилт.','heatingBath',1),
   wait('Давстай дээжийн мөс бүрэн хайлахыг хүлээнэ.',saltedMelted,{speed:8,timeout:90,minimum:0}),
   record('Давстай дээжийн эцсийн төлөв ба температурыг тэмдэглэ.','heatingBath',1),
   {type:'configure',label:'Цэвэр мөсний үүрийг сонгож халаана.',target:'heatingBath',change:{port:0}},
   wait('Цэвэр дээжийн мөс бүрэн хайлахыг хүлээнэ.',pureMelted,{speed:8,timeout:90,minimum:0,stopHeat:true}),
   record('Цэвэр дээжийн эцсийн төлөв ба температурыг тэмдэглэ.','heatingBath',0),
   {type:'finish',label:'Цэвэр ба давстай мөсний хайлах хэмжилтийг харьцуулж дуусгалаа.',target:'heatingBath',until:{label:'Хоёр дээжийн мөс хайлсан.',checks:melted}},
  ];
 }
 if(id==='g9-filtration'){const at=setup.findIndex(s=>s.type==='move'&&s.filter==='funnel');if(at>=0)setup.splice(at,0,{type:'place',item:'funnel',onto:'erlenmeyer',label:'Цаастай юүлүүрийг шүүгдэс хүлээн авах колбонд суулга.'});}
 if(id==='g10-galvanic')setup=[...setup.map(s=>s.type==='configure'&&s.change.connected?{...s,change:{...s.change,connected:false}}:s),wait('Нээлттэй хэлхээний хүчдэлийг унш.',[data('cellVoltage',1)]),record('Ачаалал залгахаас өмнөх хүчдэл.'),config('Ачааллыг холбо.',{connected:true})];
 const initial=primary(id),label='Урвал / хэмжилтийн бодит эцсийн төлөвийг хүлээ.';
 const p:GuideStep[]=[...setup,wait(label,initial,{speed:id==='g9-diffusion-media'?16:8,timeout:id==='g9-diffusion-media'?240:120,minimum:id==='group2-water'?5:2}),record('Эхний туршилтын эцсийн хэмжилт.')];
 let lastChecks=initial;
 const again=(label:string,steps:GuideStep[],checks:Check[],options:Partial<Endpoint>={})=>{
  p.push({type:'reset',label:`Шинэ дээж: ${label}`},...steps,wait(label,checks,options),record(label));lastChecks=checks;
 };
 const variant=(f:(s:GuideStep)=>GuideStep)=>starter.map(f);
 if(id==='g7-liquid-layers')again('Нэмэх дарааллыг өөрчилсөн хяналт',[dose('corn_syrup',5),dose('water',10),dose('oil',5),{type:'start',label:'Давхаргыг ажигла.'}],initial);
 if(['g7-gas-motion','g7-diffusion-comparison'].includes(id))again('Сэнсний урсгалтай нөхцөл',variant(s=>s.type==='configure'&&s.change.light===0?{...s,change:{...s.change,light:1}}:s),initial);
 if(id==='g7-material-properties')for(const reagent of ['s_s','s_al','s_zn','s_p','s_graphite'] as const)again(`${reagent}: дамжуулах ба соронзын сорил`,[dose(reagent,1),{type:'start',label:'Материалыг шалга.'},config('Соронзын сорил.',{operation:'magnet'})],[check('solidMass',.99)]);
 if(id==='g7-density')for(const reagent of ['s_al','s_fe'] as const)again(`${reagent}: усны түрэлт ба нягт`,[dose('water',25),dose(reagent,1),{type:'start',label:'Жин ба түрэлтийг унш.'}],[check('mass',25.9)]);
 if(id==='g7-iron-sulfur-reaction'){
  again('Илүүдэл төмөртэй халаасан дээж',variant(s=>s.type==='dose'&&s.reagent==='s_fe'?{...s,amount:.84}:s),[s('FeS',.0098),s('Fe',.004)]);
  p.push(config('Илүүдэл төмрийг соронзоор ③-т ялга.',{operation:'magnet',running:true}),wait('Нэгдэл ба илүүдэл элемент салав.',[s('FeS',.0098),s('Fe',.004,2)]));lastChecks=[s('FeS',.0098),s('Fe',.004,2)];
 }
 if(['g7-chloride','g7-sulfate'].includes(id))again('Хүчил бага авсан хязгаарлагч нөхцөл',variant(s=>s.type==='dose'&&['hcl','h2so4'].includes(s.reagent)?{...s,amount:1}:s),[check('volume',11),s('Mg',.003)]);
 if(id==='g7-hydroxides'){p.push(dose('naoh',10,0),wait('Илүүдэл сууринд Al(OH)₃ дахин уусав.',[check('solid',undefined,1e-7,{species:'AlOH3'}),a('AlOH4',1e-4),s('CuOH2',1e-5,1)]));lastChecks=[a('AlOH4',1e-4),s('CuOH2',1e-5,1)];}
 if(id==='g7-indicators')p.push(dose('hcl',5,2),dose('naoh',5,3),dose('mo',.1,2),dose('mo',.1,3),dose('s_litmus_blue',.01,0),dose('s_litmus_red',.01,1),wait('Гурван индикаторын хүчил/суурийн сорил.',[check('ph',undefined,3,{port:2}),check('ph',11,undefined,{port:3})]),record('Индикатор бүрийн өнгө ба pH.'));
 if(id==='g7-rust-protection')p.push(config('Бүрхүүлд сэв гарга.',{scratched:true}),wait('Сэвтэй хамгаалалтын өөрчлөлтийг харьцуул.',[s('FeOH3',1e-4,1),s('FeOH3',1e-4,2)]),record('Бүтэн ба сэвтэй бүрхүүлийн харьцуулалт.'));
 if(['g9-diffusion-surface','rate-surface','g10-rate-surface'].includes(id))again('Нунтагласан дээжийн хяналт',[...starter.filter(s=>s.type!=='start'),config('Дээжийг нунтагла.',{port:id==='g9-diffusion-surface'?1:0,data:{grind:1}}),{type:'start',label:'Нунтагласан дээжийн хугацааг хэмж.'}],initial);
 if(id==='g9-diffusion-media')for(const medium of ['water','s_paper'] as const)again(`${medium}: тархалтын орчин`,[dose('water',20),...(medium==='s_paper'?[dose('s_paper',.1,2)]:[]),dose('kmno4',.1,1),{type:'start',label:'Тархалтыг хэмж.'}],[check('extent',.8)]);
 if(id==='g9-liquid-motion')again('Халуун ус дээр байрласан нөхцөл',[...starter.filter(s=>s.type!=='start'),config('Халуун савыг дээр байрлуул.',{hotAbove:true}),{type:'start',label:'Тогтвортой давхаргын холилдолтыг хэмж.'}],[check('extent',.5)],{timeout:180});
 if(['g9-transition-colours','g9-ph-ranking'].includes(id))for(const reagent of (id==='g9-transition-colours'?['dichromate','cocl2','cucl2']:['acetic','water','nh3','naoh']) as ReagentId[])again(`${reagent}: шинэ дээж`,[dose(reagent,5),{type:'start',label:'Өнгө / pH-ийг хэмж.'}],[check('liquid',4.9)]);
 if(['g9-period3','g9-element-types'].includes(id))for(const reagent of (id==='g9-period3'?['s_al','s_p','s_s']:['s_al','s_cu','s_iodine','s_mg','s_si','s_s','s_zn']) as ReagentId[])again(`${reagent}: материалын сорил`,[dose(reagent,.1),{type:'start',label:'Дамжуулалтыг шалга.'}],[check('solidMass',.099)]);
 if(['g9-catalyst-screen','g10-catalysts'].includes(id))for(const reagent of (id==='g9-catalyst-screen'?['s_fe2o3','s_pbo2','s_cuo','s_zno']:['s_cuo','s_zno']) as ReagentId[])again(`${reagent}: катализаторын харьцуулалт`,[dose('h2o2',5),dose(reagent,.1,1),{type:'start',label:'Катализаторыг холих.'}],[check('volume',.1)],{minimum:5});
 if(['g9-chromatography','g10-chromatography'].includes(id))again('Өөр бэхний харьцуулалт',variant(s=>s.type==='dose'&&s.reagent==='inkA'?{...s,reagent:'inkB'}:s),initial);
 if(['g9-thermal-pairs'].includes(id))again('Саармагжих экзотерм нөхцөл',[dose('hcl',5),dose('koh',5),{type:'start',label:'Хоёр уусмалыг холь.'}],[check('ph',6,8)]);
 if(['g9-gas-expansion','g9-air-oxygen'].includes(id)){
  p.push(config('Эхний температур хүртэл хөргө.',{heating:false,cooling:true}),wait('Эхний температур дахь эзлэхүүн.',[check('temperature',undefined,23)]),config('Хөргүүрийг унтраа.',{cooling:false}),wait('Температур тогтворжив.',[check('temperature',20,24)]),record('Ижил температурт буцааж хэмжсэн эзлэхүүн.'));
  lastChecks=id==='g9-gas-expansion'?[check('volume',9.5,10.5)]:[check('volume',75,86),s('CuO',.0015)];
 }
 if(['rate-concentration','g10-rate-concentration','g10-rate-zinc','g9-zinc-hcl'].includes(id))again('Хүчлийн хэмжээ бага нөхцөл',variant(s=>s.type==='dose'&&s.reagent==='hcl'?{...s,amount:1}:s),['g9-zinc-hcl'].includes(id)?[check('acid',undefined,1e-5)]:[check('volume',11)]);
 // 8-07/8-08: the same mass of calcium, which is more reactive than magnesium.
 if(id==='group2-water')again('Кальци хүйтэн устай хүчтэй урвалд орно',[dose('s_ca',.1),dose('water',10,1),{type:'start',label:'Кальцийг устай холь.'}],[check('volume',40)]);
 if(id==='group2-acid')again('Кальци давсны хүчилтэй',[dose('s_ca',.1),dose('hcl',5,1),{type:'start',label:'Кальцийг хүчилтэй холь.'}],[check('volume',40)]);
 if(id==='rate-temperature')again('Халаалтгүй температурын хяналт',variant(s=>s.type==='configure'&&s.change.heating?{...s,change:{heating:false}}:s),initial);
 if(id==='g10-electrolysis')again('Инерт анодтой электролиз',variant(s=>s.type==='dose'&&s.port===2&&s.reagent==='s_cu'?{...s,reagent:'s_graphite'}:s),[data('deposited',.0001),check('gas',1e-6,undefined,{species:'O2',port:2})]);
 if(id==='g10-combustion')again('Хүчилтөрөгч дутсан шаталт',variant(s=>s.type==='dose'&&s.reagent==='gas_o2'?{...s,amount:75}:s),[check('gas',.0018,undefined,{species:'CO'}),check('gas',undefined,1e-6,{species:'CH4'})]);
 if(id==='g10-viscosity')for(const reagent of ['water','corn_syrup'] as const)again(`${reagent}: ижил бөмбөлгийн уналт`,variant(s=>s.type==='dose'&&s.reagent==='oil'?{...s,reagent}:s),initial);
 if(id==='g10-alkene'){
  again('Алканы хяналт: бромын өнгө хадгалагдана.',[dose('bromine',5),dose('hexane',1,1),{type:'start',label:'Алканыг холь.'}],[a('Br2',1e-5)],{minimum:5});
  again('Алкены KMnO₄ сорил',[dose('kmno4',5),dose('gas_ethene',50,1),{type:'start',label:'Этен дамжуул.'}],[s('MnO2',1e-5)]);
 }
 if(id==='g10-equilibrium')p.push(dose('fecl3',1,1),{type:'start',label:'Fe³⁺ нэмсэн тэнцвэрийг холих.'},wait('Өөрчилсөн концентраци дахь тэнцвэр.',initial),record('Fe³⁺ нэмсний дараах өнгө ба хэмжээ.'),dose('water',25),wait('Шингэрүүлсэн системийн шинэ тэнцвэр.',[a('FeSCN',1e-6)]),record('Шингэрүүлсний дараах комплекс.'));
 if(id==='g10-esterification')p.push(wait('Эстержих систем тэнцвэрт хүрэв.',[a('ethylAcetate',.01),check('data',undefined,1e-7,{key:'reactionRate'})],{minimum:5}),record('Ус нэмэхийн өмнөх тэнцвэр.'),dose('water',5),wait('Ус нэмсний дараах шинэ тэнцвэр.',[a('ethylAcetate',1e-4),check('data',undefined,1e-7,{key:'reactionRate'})],{minimum:5}),record('Ус нэмсний дараах тэнцвэр.'));
 if(id==='g10-plastic-audit'){p.push({type:'portion',fromPort:0,toPort:2,grams:.5,label:'0.5 г PET-ийг дахин ашиглах ③ тавцанд шилжүүл.'},wait('Ангилсан масс бодитоор шилжив.',[check('solidMass',.49,undefined,{port:0}),check('solidMass',.49,undefined,{port:2})]));lastChecks=[check('solidMass',.49,undefined,{port:0}),check('solidMass',.49,undefined,{port:2})];}
 if(['titration','g10-titration','g7-phenolphthalein'].includes(id)){
  const reagent=id==='g7-phenolphthalein'?'hcl':'naoh';const until:Endpoint={label:'Саармагжих төгсгөлийн цэг',checks:[check('ph',6,8)]};
  p.push({...dose(reagent,10),stopWhen:until},wait('Төгсгөлийн цэг ба зарцуулсан хэмжээг бүртгэ.',until.checks),record('Саармагжих төгсгөлийн хэмжээ.'));lastChecks=until.checks;
 }
 if(id==='g10-flame')for(const [reagent,ion] of [['kcl','K'],['licl','Li'],['cacl2','Ca'],['cuso4','Cu']] as const)p.push({type:'flame',reagent,amount:.1,label:`Цэвэр гогцоонд ${reagent} авч дөлний өнгийг шалга.`},wait(`${ion} дээжийн дөлний сорил.`,[check('sample',1e-6,undefined,{species:ion,target:'wireLoop'})]),record(`${ion}: дөлний өнгө ба дээж.`,'wireLoop'));
 if(id==='g10-flame')lastChecks=[check('sample',1e-6,undefined,{species:'Cu',target:'wireLoop'})];

 if(id==='g9-mass-conservation')p.push(config('Битүү системийн дараах хийг сулла.',{closed:false}),record('Нээлттэй системийн масс өөрчлөлт.'));
 if(id==='g9-water-tests')again('Кобальтын усны сорил',[dose('s_cocl2anh',.1),dose('water',1),{type:'start',label:'Усны хоёр дахь сорил.'}],[a('Co',1e-6)]);
 if(id==='g9-litmus')p.push(dose('water',5,2),dose('s_litmus_red',.01,2),dose('water',5,3),dose('s_litmus_blue',.01,3),wait('Саармаг хяналтын уусмал.',[check('ph',6,8,{port:2}),check('ph',6,8,{port:3})]),record('Хүчил, суурь ба саармаг лакмусын хяналтууд.'));
 if(id==='g9-antacid')again('Антацид хүрэлцэхгүй хяналт',variant(s=>s.type==='dose'&&s.reagent==='s_mgoh2'?{...s,amount:.1}:s),[check('acid',.001),check('solid',undefined,1e-7,{species:'MgOH2'})]);
 if(id==='g7-soil-retention'){
  p.push(config('Шүүлтүүрийг нээж шаварлаг дээжийг шүү.',{operation:'filter',running:true}),wait('Шаварлаг хөрсний шүүгдэс цуглав.',[check('water',15,undefined,{port:2})]),record('Шаварлаг хөрсний шингэн барилт.'));
  again('Элсэрхэг хөрсний шингэн барилт',[dose('soil_sandy',1),dose('water',20),{type:'start',label:'Шинэ хөрсний дээж.'},config('Шүүлтүүрийг нээ.',{operation:'filter',running:true})],[check('water',18,undefined,{port:2})]);
 }
 if(['g7-soil-settling','g7-soil-composition'].includes(id))for(const reagent of ['soil_sandy','soil_clay'] as const)again(`${reagent}: хөрсний бүрдэл ба тунасан хэсэг`,[dose(reagent,1),dose('water',10),{type:'start',label:'Хөрсийг тунгаа.'}],[data('settled0',.01)]);
 if(id==='g7-soil-growth')for(const reagent of ['alcl3','limewater'] as const)again(`${reagent}: pH өөрчилсөн ижил хугацааны соёололт`,[dose('soil_loam',1),dose('s_seeds',1),dose('water',5),dose(reagent,.1),config('Ижил гэрэл ба түргэвчилсэн өдрийн цаг.',{timeScale:86400,light:1}),{type:'start',label:'Үрийг соёолуулах.'}],[data('height',.1)]);
 if(id==='g7-soil-ph-survey')for(const reagent of ['hcl','limewater'] as const)again(`${reagent}: хөрсний хяналтын pH`,[dose('soil_loam',1),dose('water',10),dose(reagent,.1),dose('ui',.1),{type:'start',label:'Хөрсний pH-ийг хэмж.'}],[check('ph',0,14)]);
 if(id==='g10-acid-carbonate')again('Ижил хэмжээтэй сул хүчил',variant(s=>s.type==='dose'&&s.reagent==='hcl'?{...s,reagent:'acetic'}:s),initial);
 if(id==='g10-acid-ph')p.push(dose('water',5,0),dose('water',5,1),wait('Хоёр хүчлийг ижил хэмжээгээр шингэрүүлэв.',[check('ph',.1,2,{port:0}),check('ph',2,4,{port:1})]),record('Шингэрүүлсний дараах хоёр хүчлийн pH.'));
 if(id==='g10-isomers'){
  const bonds:[number,number][][]=[[[0,1],[1,2],[2,3],[3,4],[1,5]],[[0,1],[1,2],[2,3],[3,4],[2,5]],[[0,1],[1,2],[2,3],[1,4],[1,5]],[[0,1],[1,2],[2,3],[1,4],[2,5]]];
  bonds.forEach((edges,i)=>p.push(config(`Гексаны ${i+2}-р изомерийг угсар.`,{bonds:edges}),wait('Зөв C₆H₁₄ бүтэц ба лавлах буцлах цэг.',[data('kitComplete',1),data('isomer',i+1)]),record(`${i+2}-р изомерийн бүтэц ба буцлах цэг.`)));
 }
 if(id==='g10-fermentation'){
  p.push({type:'reset',label:'Буцалгасан исгэгчтэй хяналт бэлтгэ.'},dose('water',5),dose('s_yeast',.1),config('Эхлээд сахарагүй исгэгчийг 90°C-д идэвхгүйжүүл.',{heating:true,targetTemperature:90,timeScale:60}),{type:'start',label:'Исгэгчийг халаа.'},wait('Исгэгч дулаанаар идэвхгүйжив.',[s('deadYeast',.09)]),config('Исгэгчийг хөргө.',{heating:false,cooling:true,targetTemperature:22}),wait('Хяналтын дээж хөрөв.',[check('temperature',undefined,35)]),dose('glucose',10),wait('Идэвхгүй исгэгч сахар исгэхгүй.',[a('glucose',.0049),check('ethanol',undefined,.001)],{minimum:5}),record('Идэвхтэй ба идэвхгүй исгэгчийн харьцуулалт.'));
  lastChecks=[a('glucose',.0049),check('ethanol',undefined,.001)];
 }
 if(id==='catalyst-reuse'){
  p.push({type:'place',item:'funnel',onto:'beaker',label:'Катализаторыг шүүж авах юүлүүр бэлтгэ.'},{...move('graduatedCylinder','beaker',1,'funnel'),all:true},dose('water',2,0,'beaker','funnel'),{...move('funnel','graduatedCylinder',1),all:true,label:'Шүүж авсан MnO₂-ийг буцаан ав.'},dose('h2o2',10),{type:'start',label:'Шинэ H₂O₂ дээр катализаторыг дахин ашигла.'},wait('Дахин ашигласан MnO₂ шинэ пероксидыг задлав.',initial),record('Дахин ашигласан катализаторын хэмжээ.'),{type:'place',item:'funnel',onto:'table',label:'Юүлүүрийг буцаа.'});
 }

 if(id==='g9-filtration'){
  p.push(dose('water',2,0,'erlenmeyer','funnel'),{...move('funnel','watchGlass',1),all:true,label:'Шүүсэн элсийг тусад нь цуглуул.'},wait('Холимгийг бүрэн шүүж хоёр хэсгийг тусгаарлав.',[check('liquid',11.9,undefined,{target:'erlenmeyer'}),s('sand',.016,undefined,'watchGlass'),check('liquid',undefined,.001,{target:'beaker'})]),record('Угаасан элс ба цуглуулсан шүүгдэс.','watchGlass'));
  lastChecks=[check('liquid',11.9,undefined,{target:'erlenmeyer'}),s('sand',.016,undefined,'watchGlass')];
 }
 p.push(...saltWorkup(id));
 const precip:Record<string,string>={'precipitates':'CuOH2','g9-precipitation':'CuOH2','g10-precipitation':'AgCl'};
 if(precip[id]){
  p.push({type:'place',item:'funnel',onto:'erlenmeyer',label:'Цаастай юүлүүрийг колбонд байрлуул.'},{...move('beaker','erlenmeyer',1,'funnel'),all:true},dose('water',2,0,'erlenmeyer','funnel'),{...move('funnel','watchGlass',1),all:true,label:'Угаасан тунадасыг хүлээн авах шилэнд цуглуул.'},wait('Тунадас шүүгдэж, угаагдаж тусдаа цуглав.',[s(precip[id],1e-6,undefined,'watchGlass'),check('water',undefined,.001,{target:'watchGlass'})]),record('Цуглуулсан тунадас.','watchGlass'),{type:'place',item:'funnel',onto:'table',label:'Юүлүүрийг ширээнд буцаа.'});lastChecks=[s(precip[id],1e-6,undefined,'watchGlass')];
 }

 if(id==='g10-nylon')p.push(config('Үүссэн утсыг ороож ④-т цуглуул.',{operation:'draw',running:true}),wait('Утас хүлээн авах үүрэнд орсныг шалга.',[s('nylon610',1e-6,3)]));
 if(id==='g10-limestone')p.push(config('Зуухыг унтрааж CaO-г хөргө.',{heating:false,cooling:true,targetTemperature:22}),wait('Ус нэмэхээс өмнө CaO-г хөргөнө.',[check('temperature',undefined,35)]),dose('water',5),wait('CaO усжиж Ca(OH)₂ үүсэхийг хүлээ.',[s('CaOH2',1e-5)]),dose('gas_co2',50),wait('Шохойн усны сорил: CaCO₃ үүсэв.',[s('CaCO3',1e-5)]));
 if(id==='g10-hydrate')p.push(config('Хатаах зуухыг унтрааж хөргө.',{heating:false,cooling:true,targetTemperature:22}),wait('Усгүй давс хөрөв.',[check('temperature',undefined,35)]),dose('water',.2),wait('Ус нэмэхэд гидрат дахин үүсэв.',[s('CuSO4_5',1e-5)]));
 if(['g7-iron-sulfur-properties','g7-iron-sulfur-mixture'].includes(id))p.push(config('Соронзоор Fe-ийг ялга.',{operation:'magnet',running:true}),wait('Ялгасан төмөр ③-т цуглав.',[s('Fe',.009,2),s('S',.009)]));
 if(id==='g7-soil-retention')p.push(config('Шүүлтүүрийг нээ.',{operation:'filter',running:true}),wait('Шүүгдэс ③-т цугларч байна.',[check('water',15,undefined,{port:2})]));
 if(id==='g7-candle-changes')p.push(config('Хайлсан парафиныг асаа.',{operation:'ignite',running:true}),wait('Шаталтын бүтээгдэхүүнийг шалга.',[check('gas',1e-6,undefined,{species:'CO2'})]));
 if(id==='g7-wax-water')p.push(config('Хайлсан дээжийг хөргө.',{heating:false,cooling:true,targetTemperature:-10}),wait('Парафин дахин хатуурав.',[s('wax',.002,1)]));
 if(id==='g10-no2-equilibrium')p.push(config('Поршений эзлэхүүнийг 100 мл болгон шах.',{volumeMl:100}),wait('Шахсан системийн шинэ тэнцвэр.',[check('gas',1e-5,undefined,{species:'N2O4'})],{minimum:8}));
 const heated=p.some(s=>s.type==='configure'&&s.change.heating);
 const glass=salts[id]?'watchGlass':undefined;
 if(heated&&!salts[id]){
  if(id==='g9-air-distillation')p.push(config('Салгасан хийнүүдийг тасалгааны температур хүртэл бүлээсгэ.',{cooling:false,heating:true}),wait('Хийнүүд тасалгааны температурт хүрэв.',[check('temperature',20,24)]));
  else if(!['g9-gas-expansion','g9-air-oxygen'].includes(id))p.push(config('Халаалтыг унтрааж төхөөрөмж, дээжийг хөргө.',{heating:false,cooling:true,targetTemperature:22}),wait('Дээж 35°C-ээс доош хөрөв.',[check('temperature',undefined,35)]));
  p.push(config('Халаалт, хөргөлт ба цахилгаан ачааллыг унтраа.',{heating:false,cooling:false,connected:false},glass));
 }
 if(id==='g10-melting')p.push(wait('Хөргөхөд бензойны хүчил дахин талстжив.',[s('benzoic',.007,0),s('benzoic',.007,1)]));
 const end=salts[id]?[s(salts[id].solid,1e-6,undefined,'watchGlass'),check('water',undefined,.001,{target:'watchGlass'}),check('temperature',undefined,35,{target:'watchGlass'})]: id==='g10-nylon'?[s('nylon610',1e-6,3)]:id==='g10-limestone'?[s('CaCO3',1e-5)]:id==='g10-hydrate'?[s('CuSO4_5',1e-5)]:id==='g7-wax-water'?[s('wax',.002,1)]:id==='g7-soil-retention'?[check('water',15,undefined,{port:2})]:id==='g7-candle-changes'?[check('gas',1e-6,undefined,{species:'CO2'})]:['g7-iron-sulfur-properties','g7-iron-sulfur-mixture'].includes(id)?[s('Fe',.009,2),s('S',.009)]:id==='g10-melting'?[s('benzoic',.007,0),s('benzoic',.007,1)]:id==='g9-gas-expansion'?[check('volume',9.5,10.5)]:heated?(lastChecks.some(c=>c.metric!=='temperature')?lastChecks.filter(c=>c.metric!=='temperature'):[check('temperature',undefined,35)]) :lastChecks;
 p.push(record('Эцсийн бүтээгдэхүүн ба хэмжилтийн дүн.',glass),{type:'finish',label:'Туршилт дууслаа. Эцсийн төлөв ба хэмжилтийг баталгаажууллаа.',until:{label:'Эцсийн үр дүн',checks:end},target:glass});
 return p;
}
const s2=(species:string,target:EquipmentKind)=>s(species,1e-6,undefined,target);
