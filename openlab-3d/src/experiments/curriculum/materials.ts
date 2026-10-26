import type { AqDef, SolidDef } from '../../chemistry/species';
import type { Reagent } from '../../chemistry/reagents';

export const GASES = {
 O2:{name:'Хүчилтөрөгч',formula:'O₂',molarMass:31.998,color:'#c2e9ff'},
 N2:{name:'Азот',formula:'N₂',molarMass:28.014,color:'#cbd5e1'},
 H2:{name:'Устөрөгч',formula:'H₂',molarMass:2.016,color:'#e2e8f0'},
 CO2:{name:'Нүүрстөрөгчийн (IV) оксид',formula:'CO₂',molarMass:44.009,color:'#cbd5e1'},
 CO:{name:'Нүүрстөрөгчийн (II) оксид',formula:'CO',molarMass:28.01,color:'#cbd5e1'},
 SO2:{name:'Хүхрийн (IV) оксид',formula:'SO₂',molarMass:64.06,color:'#e2e8f0'},
 CH4:{name:'Метан',formula:'CH₄',molarMass:16.043,color:'#cbd5e1'},
 C2H4:{name:'Этен',formula:'C₂H₄',molarMass:28.054,color:'#cbd5e1'},
 NO2:{name:'Азотын диоксид',formula:'NO₂',molarMass:46.0055,color:'#a66a36'},
 N2O4:{name:'Азотын тетроксид',formula:'N₂O₄',molarMass:92.011,color:'#e2e8f0'},
 NH3:{name:'Аммиак хий',formula:'NH₃',molarMass:17.031,color:'#e2e8f0'},
 H2O:{name:'Усны уур',formula:'H₂O',molarMass:18.015,color:'#e2e8f0'},
 Ar:{name:'Аргон',formula:'Ar',molarMass:39.948,color:'#cbd5e1'},
 tracer:{name:'Тархалтын тэмдэгт хий',formula:'Тэмдэгт',molarMass:100,color:'#a78bfa'},
} as const;
export type GasId=keyof typeof GASES;
const aq=(name:string,formula:string,charge:number,molarMass:number,color?:string):AqDef=>({name,formula,charge,molarMass,...(color?{color,cRef:.1}:{})});
const solvent=(name:string,formula:string,molarMass:number,density:number,boiling:number):AqDef=>({...aq(name,formula,0,molarMass),density,boiling});
export const EXTRA_AQ = {
 Ni:aq('Никелийн ион','Ni²⁺',2,58.6934,'#8ec88c'), Cr3:aq('Хром (III)','Cr³⁺',3,51.996,'#58a777'),
 CrO4:aq('Хромат','CrO₄²⁻',-2,115.994,'#edcc32'), S2O3:aq('Тиосульфат','S₂O₃²⁻',-2,112.13),
 AlOH4:aq('Тетрагидроксоалюминат','[Al(OH)₄]⁻',-1,95.01), FeSCN:aq('Төмөр-тиоцианатын комплекс','FeSCN²⁺',2,113.925,'#b72a28'),
 glucose:aq('Глюкоз','C₆H₁₂O₆',0,180.156), maltose:aq('Мальтоз','C₁₂H₂₂O₁₁',0,342.297),
 diamine:aq('Гексаметилендиамин','H₂N(CH₂)₆NH₂',0,116.208), sebacoyl:aq('Себакоилхлорид','ClCO(CH₂)₈COCl',0,239.14),
 dissolvedO2:aq('Ууссан хүчилтөрөгч','O₂(aq)',0,31.998),
 sulfuricNeat:solvent('Концентрацтай хүхрийн хүчил','H₂SO₄',98.079,1.84,337),
 dibromoethane:solvent('1,2-дибромэтан','C₂H₄Br₂',187.862,2.18,131.4),
 acetone:solvent('Ацетон','C₃H₆O',58.08,.7845,56.05), oilFluid:solvent('Ургамлын тос','Триглицерид (жишээ)',885.45,.91,350),
 hexane:solvent('Гексан','C₆H₁₄',86.178,.659,68.7), octane:solvent('Октан','C₈H₁₈',114.232,.703,125.6),
 decane:solvent('Декан','C₁₀H₂₂',142.286,.730,174.1), hexadecane:solvent('Гексадекан','C₁₆H₃₄',226.448,.773,287),
 cyclohexane:solvent('Циклогексан','C₆H₁₂',84.162,.779,80.7), aceticNeat:solvent('Цэвэр этаны хүчил','CH₃COOH',60.052,1.049,118.1),
 ethylAcetate:solvent('Этил этаноат','CH₃COOC₂H₅',88.106,.902,77.1), glycol:solvent('Этиленгликоль','C₂H₆O₂',62.068,1.113,197.3),
 waxLiquid:solvent('Шингэн парафин','C₂₅H₅₂',352.691,.80,400), benzoic:solvent('Хайлсан бензойны хүчил','C₇H₆O₂',122.123,1.08,249),
};
export type ExtraAqId=keyof typeof EXTRA_AQ;
const solid=(name:string,formula:string,molarMass:number,color:string):SolidDef=>({name,formula,molarMass,color});
export const EXTRA_SOLIDS = {
 Ag:{...solid('Мөнгө','Ag',107.9,'#dfe3e8'),metal:true},
 FeS:solid('Төмрийн сульфид','FeS',87.91,'#343b3a'), MgO:solid('Магнийн оксид','MgO',40.304,'#f5f5ed'),
 CaO:solid('Кальцийн оксид','CaO',56.077,'#e7e5dc'), AlOH3:solid('Хөнгөнцагааны гидроксид','Al(OH)₃',78.004,'#f5f5f1'),
 Ni:{...solid('Никель','Ni',58.6934,'#a7b6ad'),metal:true}, NiOH2:solid('Никелийн гидроксид','Ni(OH)₂',92.708,'#8dcc87'),
 wax:solid('Парафины лаа','C₂₅H₅₂',352.691,'#e9ddba'), benzoic:solid('Бензойны хүчил','C₇H₆O₂',122.123,'#f4f2e8'),
 clay:solid('Шаварлаг эрдэс','Шавар (г-аар бүртгэнэ)',1,'#a78c78'), silt:solid('Лаг шороо','Лаг (г-аар бүртгэнэ)',1,'#b49c7c'),
 humus:solid('Ялзмаг','Органик хөрс (г)',1,'#4b3930'), seed:solid('Буурцгийн үр','Үр (жишээ 0.2 г/ш)',1,'#a9875b'),
 plant:solid('Ургамлын биомасс','Биомасс (г)',1,'#5c9b45'), glucose:{...solid('Глюкоз','C₆H₁₂O₆',180.156,'#f5f5ef'),dissolve:{products:{glucose:1},solubility:3,dH:0}},
 inactiveAmylase:solid('Денатурацлагдсан амилаза','Идэвхгүй энзим (г)',1,'#d8cbb4'), deadYeast:solid('Идэвхгүй исгэгч','Идэвхгүй исгэгч (г)',1,'#a88b67'),
 yeast:solid('Хуурай исгэгч','Исгэгч (г)',1,'#d7ba82'), amylase:solid('Амилаза энзим','Энзим (г)',1,'#f1e8d7'),
 alumina:solid('Хөнгөнцагааны оксидын катализатор','Al₂O₃',101.961,'#e3e3da'),
 glassBead:solid('Шилэн бөмбөлөг','Шилэн бөмбөлөг (г)',1,'#a7d9df'),
 modelC:solid('Загварын C бөмбөлөг','C загварын хэсэг',1,'#475569'), modelH:solid('Загварын H бөмбөлөг','H загварын хэсэг',1,'#f8fafc'),
 nylon610:solid('Найлон-6,10 давтагдах нэгж','[C₁₆H₃₀N₂O₂]ₙ',282.428,'#f4f1e2'),
 nylonEnds:solid('Найлоны төгсгөлийн бүлгүүд','–NH₂ / –COCl төгсгөл',36.46,'#eee8d5'),
 PET:solid('PET савны дээж','PET (г)',1,'#a4d6df'), PE:solid('PE уутны дээж','PE (г)',1,'#dddfea'),
};
export type ExtraSolidId=keyof typeof EXTRA_SOLIDS;
export type ExtraReagentId='gas_o2'|'gas_n2'|'gas_h2'|'gas_co2'|'gas_ch4'|'gas_ethene'|'gas_no2'|'gas_n2o4'|'gas_air'|'gas_tracer'|'s_nickel'|'s_silver'|'s_wax'|'s_benzoic'|'s_glucose'|'s_yeast'|'s_amylase'|'s_alumina'|'s_glass_beads'|'model_carbon'|'model_hydrogen'|'pet_waste'|'pe_waste'|'soil_sandy'|'soil_loam'|'soil_clay'|'s_seeds'|'acetone'|'hexane'|'octane'|'decane'|'crude_oil'|'cyclohexane'|'glacial_acetic'|'h2so4_conc'|'hno3'|'alcl3'|'niso4'|'thiosulfate'|'cu_chromate'|'glucose'|'amylase'|'diamine'|'sebacoyl'|'corn_syrup'|'deoxygenated_water'|'kaolin'|'s_silt'|'s_humus';
const jar=(id:ExtraReagentId,material:ExtraSolidId,name:string):Reagent=>({id,name,label:EXTRA_SOLIDS[material].formula,category:'solid',container:'reagentJar',stock:100,solid:material,hazards:[],note:'Ширээн дээр хэмжиж хийдэг дээж. Нэгж нь г.',stripe:EXTRA_SOLIDS[material].color});
const bottle=(id:ExtraReagentId,name:string,solutes:Reagent['solution'],hazards:Reagent['hazards']=[]):Reagent=>({id,name,label:name.split(' · ')[0],category:'special',container:'reagentBottle',stock:250,solution:solutes,hazards,note:'Хэмжсэн мл-ээр шилжүүл. Шошгын концентрацыг шалга.',stripe:'#6b9cbd'});
const pure=(id:ExtraReagentId,material:ExtraAqId,name:string):Reagent=>({...bottle(id,name,{solutes:{}}),liquid:material,hazards:['flammable','irritant']});
const gas=(id:ExtraReagentId,kind:GasId,name:string=GASES[kind].name):Reagent=>({id,name,label:GASES[kind].formula,category:'special',container:'gasCylinder',stock:2000,gas:kind,hazards:kind==='H2'||kind==='CH4'||kind==='C2H4'?['flammable']:kind==='NO2'||kind==='N2O4'?['toxic']:[],note:'Хийн баллон. 22°C орчимд 24 л/моль жишгээр мл-ээр тунлана. Хоолой, хаалттай угсралт хэрэглэ.',stripe:GASES[kind].color});
export const EXTRA_REAGENTS:Reagent[]=[
 gas('gas_o2','O2'),gas('gas_n2','N2'),gas('gas_h2','H2'),gas('gas_co2','CO2'),gas('gas_ch4','CH4'),gas('gas_ethene','C2H4'),gas('gas_no2','NO2'),gas('gas_n2o4','N2O4'),gas('gas_tracer','tracer'),
 {...gas('gas_air','N2','Агаар · 21% O₂'),gas:undefined,gasBlend:{N2:.78,O2:.21,Ar:.01}},
 jar('s_nickel','Ni','Никелийн дээж'),jar('s_silver','Ag','Мөнгөний дээж'),jar('s_wax','wax','Парафины лаа'),jar('s_benzoic','benzoic','Бензойны хүчил'),
 jar('s_glucose','glucose','Глюкозын талст'),jar('s_yeast','yeast','Хуурай исгэгч'),jar('s_amylase','amylase','Амилаза'),jar('s_alumina','alumina','Крекингийн катализатор'),jar('s_glass_beads','glassBead','Ижил хэмжээтэй шилэн бөмбөлгүүд'),
 {...jar('model_carbon','modelC','C загварын бөмбөлгүүд'),stock:6,note:'6 C зангилаатай молекул бүтээх физик загварын хэсгүүд; урвалж нүүрстөрөгч биш.'},
 {...jar('model_hydrogen','modelH','H загварын бөмбөлгүүд'),stock:14,note:'14 H холбоосын физик загварын хэсгүүд; устөрөгч хий биш.'},
 jar('pet_waste','PET','PET савны хаягдлын дээж'),jar('pe_waste','PE','PE уутны хаягдлын дээж'),jar('s_seeds','seed','Ижил төрлийн буурцгийн үр'),jar('kaolin','clay','Каолин шавар'),jar('s_silt','silt','Лаг шороо'),jar('s_humus','humus','Ялзмаг'),
 ...([['soil_sandy','Элсэрхэг хөрс',{sand:.8,silt:.1,clay:.05,humus:.05}],['soil_loam','Ердийн хөрс',{sand:.4,silt:.35,clay:.2,humus:.05}],['soil_clay','Шаварлаг хөрс',{sand:.2,silt:.25,clay:.5,humus:.05}]] as const).map(([id,name,blend])=>({id,name,label:name,category:'solid',container:'reagentJar',stock:100,blend,hazards:[],stripe:'#8f7357',note:'Бүрдэл нь ил тод тэмдэглэсэн сургалтын хөрсний дээж; бодит орчны шинжилгээ биш.'} as Reagent)),
 pure('acetone','acetone','Ацетон'),pure('hexane','hexane','Гексан'),pure('octane','octane','Октан'),pure('decane','decane','Декан'),pure('cyclohexane','cyclohexane','Циклогексан'),pure('glacial_acetic','aceticNeat','Мөсөн цууны хүчил'),
 {...bottle('crude_oil','Газрын тосны сургалтын холимог',{solutes:{}}),liquidBlend:{hexane:.2,octane:.3,decane:.3,hexadecane:.2},color:'#5f452c',hazards:['flammable','env']},
 {...pure('h2so4_conc','sulfuricNeat','Концентрацтай H₂SO₄ · ≈18.8 М'),hazards:['corrosive']},bottle('hno3','Азотын хүчил · 1 М',{solutes:{NO3:1}},['corrosive']),
 bottle('alcl3','AlCl₃ · 0.1 М',{solutes:{Al:.1,Cl:.3}}),bottle('niso4','NiSO₄ · 0.1 М',{solutes:{Ni:.1,SO4:.1}},['toxic','env']),
 bottle('thiosulfate','Na₂S₂O₃ · 0.1 М',{solutes:{Na:.2,S2O3:.1}}),bottle('cu_chromate','CuCrO₄ · 0.01 М',{solutes:{Cu:.01,CrO4:.01}},['toxic','env']),
 bottle('glucose','Глюкоз · 0.5 М',{solutes:{glucose:.5}}),{...bottle('amylase','Амилаза · 1 г/л',{solutes:{}}),blend:{amylase:1},stock:100,note:'Энзимийн суспенз. 1 мл хэсэгт 0.001 г энзим.'},
 bottle('diamine','Гексаметилендиамин · 0.5 М',{solutes:{diamine:.5}},['corrosive']),
 {...bottle('sebacoyl','Себакоилхлорид · 0.1 М (циклогексан)',{solutes:{sebacoyl:.1}},['corrosive','flammable']),solvent:'cyclohexane'},
 bottle('corn_syrup','Эрдэнэ шишийн сироп · сахарозын жишээ',{solutes:{sucrose:2}}),
 {...bottle('deoxygenated_water','Буцалгаад хөргөсөн агааргүй ус',{solutes:{}}),note:'Ууссан O₂-гүй гэж бэлтгэсэн хяналт. Нээлттэй орхивол дахин агаар орно.'},
];
