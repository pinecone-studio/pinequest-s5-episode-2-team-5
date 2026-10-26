import {CATALOG,type EquipmentKind} from '../../equipment/equipmentCatalog';
import {REAGENTS,type ReagentId} from '../../chemistry/reagents';
import { INVESTIGATIONS, requiresBenchEvidence } from '../../../../src/lib/textbook-investigations';
import type { Experiment } from '../../lab/experiment-schema';
export const TEXTBOOK_EXPERIMENTS: Experiment[] = INVESTIGATIONS.map((x) => ({
  id:x.id,title:x.title,level:x.grade===7?'Эхлэл':'Дунд',goal:x.prompt,
  materials:x.mode==='model'?['Виртуал судалгааны багаж · хялбаршуулсан загвар']:x.supplies.map(s=>s.startsWith('reagent:')?REAGENTS[s.slice(8) as ReagentId].name:CATALOG[s as EquipmentKind].name),
  safety:x.safety,
  steps:[
    {id:requiresBenchEvidence(x)?'predict-bench':'predict',text:'Таамаглал, хувьсагчаа тодорхойл',hint:x.variables,completion:{events:[`inquiry:${x.id}:predict${requiresBenchEvidence(x)?'-bench':''}`]}},
    {id:requiresBenchEvidence(x)?'measure-bench':'measure',text:'Хоёр ба түүнээс олон туршилтын хэмжилт ав',hint:[...(x.method??[]),'Судалгааны дэвтрийг нээ. Сав/багажийг сонгоод хэмжилтээ ав.'].join(' '),completion:{events:[`inquiry:${x.id}:measure${requiresBenchEvidence(x)?'-bench':''}`]}},
    {id:requiresBenchEvidence(x)?'explain-bench':'explain',text:'Нотолгоонд тулгуурлан дүгнэ',hint:'Хоёр үр дүнгээ харьцуул. Ямар хязгаарлалт, алдаа байж болох вэ?',completion:{events:[`inquiry:${x.id}:explain${requiresBenchEvidence(x)?'-bench':''}`]}},
  ],explain:`Хими ${x.grade === 7 ? 'VII' : x.grade === 10 ? 'X' : x.grade === 9 ? 'IX' : 'VIII'}, х.${x.bookPages}. ${x.variables}`,
}));
