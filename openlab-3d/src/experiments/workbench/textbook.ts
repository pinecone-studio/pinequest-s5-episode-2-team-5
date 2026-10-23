import { INVESTIGATIONS } from '../../../../src/lib/textbook-investigations';
import type { Experiment } from '../../lab/experiment-schema';
export const TEXTBOOK_EXPERIMENTS: Experiment[] = INVESTIGATIONS.map((x) => ({
  id:x.id,title:x.title,level:'Дунд',goal:x.prompt,
  materials:x.mode==='model'?['Виртуал судалгааны багаж · хялбаршуулсан загвар']:['Өмнөхтэй ижил авах, цутгах, хутгах, халаах удирдлага','Судалгааны дэвтэрт бодит савныхаа хэмжилтийг авна'],
  safety:x.safety,
  steps:[
    {id:'predict',text:'Таамаглал, хувьсагчаа тодорхойл',hint:x.variables,completion:{events:[`inquiry:${x.id}:predict`]}},
    {id:'measure',text:'Хоёр ба түүнээс олон туршилтын хэмжилт ав',hint:'Судалгааны дэвтрийг нээ. Нөхцөл, хэмжилт, ажиглалтаа бүртгэ.',completion:{events:[`inquiry:${x.id}:measure`]}},
    {id:'explain',text:'Нотолгоонд тулгуурлан дүгнэ',hint:'Хоёр үр дүнгээ харьцуул. Ямар хязгаарлалт, алдаа байж болох вэ?',completion:{events:[`inquiry:${x.id}:explain`]}},
  ],explain:`Хими VIII, х.${x.bookPages}. ${x.variables}`,
}));
