import {CATALOG,type EquipmentKind} from '../../equipment/equipmentCatalog';
import {REAGENTS,type ReagentId} from '../../chemistry/reagents';
import { INVESTIGATIONS } from '../../../../src/lib/textbook-investigations';
import type { Experiment } from '../../lab/experiment-schema';
export const TEXTBOOK_EXPERIMENTS: Experiment[] = INVESTIGATIONS.map((x) => ({
  id:x.id,title:x.title,level:'Дунд',goal:x.prompt,
  materials:x.mode==='model'?['Виртуал судалгааны багаж · хялбаршуулсан загвар']:x.supplies.map(s=>s.startsWith('reagent:')?REAGENTS[s.slice(8) as ReagentId].name:CATALOG[s as EquipmentKind].name),
  safety:x.safety,
  steps:[
    {id:x.grade===9?'predict-bench':'predict',text:'Таамаглал, хувьсагчаа тодорхойл',hint:x.variables,completion:{events:[`inquiry:${x.id}:predict${x.grade===9?'-bench':''}`]}},
    {id:x.grade===9?'measure-bench':'measure',text:'Хоёр ба түүнээс олон туршилтын хэмжилт ав',hint:[...(x.method??[]),'Судалгааны дэвтрийг нээ. Сав/багажийг сонгоод хэмжилтээ ав.'].join(' '),completion:{events:[`inquiry:${x.id}:measure${x.grade===9?'-bench':''}`]}},
    {id:x.grade===9?'explain-bench':'explain',text:'Нотолгоонд тулгуурлан дүгнэ',hint:'Хоёр үр дүнгээ харьцуул. Ямар хязгаарлалт, алдаа байж болох вэ?',completion:{events:[`inquiry:${x.id}:explain${x.grade===9?'-bench':''}`]}},
  ],explain:`Хими ${x.grade === 9 ? 'IX' : 'VIII'}, х.${x.bookPages}. ${x.variables}`,
}));
