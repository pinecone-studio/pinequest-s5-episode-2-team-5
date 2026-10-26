import {PROFILES,rimHeight} from '../../equipment/profiles';
import {CURRICULUM_RIGS,isCurriculumRig} from '../curriculum/kinds';
import {isGrade9Rig} from './kinds';
import {CATALOG,type EquipmentKind} from '../../equipment/equipmentCatalog';
export type PortPoint=[number,number,number];
/** Shared by the vessel model, labels and pouring animation. Dimensions are in metres. */
export function portLayout(kind:string,i:number){
 const shape=isCurriculumRig(kind)?CURRICULUM_RIGS[kind].shape:'';
 let x=0,z=0,bottom=.014,height=.1,radius=.025;
 if(['rack','enzyme','exposure','magnet'].includes(shape)){x=(i%3-1)*.06;z=(Math.floor(i/3)-1)*.052;height=.09;radius=.018;}
 else if(['balance','materials'].includes(shape)){x=i===0?-.04:i===1?.065:0;z=i===2?.048:0;bottom=.045;height=.045;radius=i===0?.033:.02;}
 else if(shape==='density'){x=i===0?-.045:i===1?.06:0;z=i===2?.05:0;bottom=.045;height=i===0?.17:.07;radius=i===0?.021:.025;}
 else if(shape==='volumetric'){x=i===0?0:i===1?-.075:.075;bottom=.045;height=i===0?.235:.08;radius=i===0?.027:.017;}
 else if(['furnace','oven'].includes(shape)){x=i===0?0:i===1?-.085:.085;z=i===0?.05:.025;bottom=i===0?.052:.014;height=i===0?.07:.06;radius=i===0?.025:.015;}
 else if(['reflux','fermenter','cracking','gaswash'].includes(shape)){x=i===0?-.045:i===1?.07:.055;z=i===0?0:i===1?.018:-.05;bottom=i===0?.042:.014;height=i===0?.1:i===1?.09:.08;radius=i===0?.03:i===1?.023:.02;}
 else if(['bath','optical','equilibrium'].includes(shape)){x=i===0?-.05:i===1?.05:.075;z=i===2?-.045:0;bottom=i===2?.02:.05;height=i===2?.08:.13;radius=i===2?.013:.022;}
 else if(['column','viscometer','distillation'].includes(shape)){x=i===0?-.025:.065;z=i===0?0:shape==='distillation'?(i-2.5)*.04:(i-1)*.05;height=i===0?.23:.06;radius=i===0?.026:.014;}
 else if(shape==='polymer'){x=i<3?-.045:.07;z=i===3?.05:0;height=i<3?.12:.026;radius=i<3?.035:.025;}
 else if(shape==='soil'){x=i===2?0:i===0?-.065:i===1?0:i===3?.065:(i-4.5)*.065;z=i===2?.05:i>=4?.065:-.025;height=i===2?.08:.13;radius=.025;}
 else if(shape==='pressure'){x=i===0?-.07:i===1?.07:0;z=.04;height=.06;radius=.015;}
 else if(['electrolysis','galvanic','migration'].includes(shape)){x=i===0?-.06:i===1?.06:shape==='galvanic'?0:.08;z=i===2?.045:0;height=i===2?.06:.1;radius=i===2?.013:.025;}
 else if(shape==='diffusion'){x=i===0?0:i===1?.08:-.08;z=i===0?0:.045;height=i===0?.17:.08;radius=.02;}
 else if(shape==='molecule'){x=i===0?-.06:i===1?.06:0;height=i===2?.2:.08;}
 else if(kind==='gasTrain'){x=i===0?-.065:i===1?.065:0;z=i===2?.055:0;bottom=i===0?.094:.014;}
 else if(kind==='reactionTile'){x=(i%3-1)*.065;z=i<3?-.035:.035;}
 else if(kind==='corrosionRack'){x=(i%4-1.5)*.05;z=i<4?-.04:.035;}
 else if(kind==='chromatographyTank'){height=i===2?.23:.05;bottom=0;}
 else if(kind==='diffusionTube'){x=i===0?-.105:i===1?.105:0;bottom=0;height=.1;}
 else if(kind==='gasSyringe'){x=i===0?-.075:i===1?.075:0;z=.045;}
 else {x=i===0?-.065:i===1?.065:0;z=i===2?.055:0;if(kind==='calorimeter'&&i===0)bottom+=.14;}
 const mouth:PortPoint=shape==='polymer'&&i===1?[-.025,.134,0]:shape==='polymer'&&i===2?[-.045,.075,0]:shape==='polymer'&&i===3?[.07,.04,.05]:isGrade9Rig(kind)?[x,bottom+height,z]:[0,kind in PROFILES?rimHeight(PROFILES[kind as keyof typeof PROFILES]):CATALOG[kind as EquipmentKind]?.size[1]??.1,0];
 return {x,z,bottom,height,radius,mouth};
}
export function portLabel(kind:string,i:number){
 if(isCurriculumRig(kind))return CURRICULUM_RIGS[kind].ports[i]??`Дээж ${i+1}`;
 const parts:Record<string,string[]>={
  gasSyringe:['Хийн дээжийн оролт','Нэмэх дээж','Хяналтын дээж'],
  diffusionTube:['Зүүн үзүүрийн хөвөн','Баруун үзүүрийн хөвөн','Хяналтын дээж'],
  calorimeter:['Калориметрийн ус','Спиртэн дэнгийн түлш','Хяналтын дээж'],
  conductivityTester:['Электродтой сорилын сав','Харьцуулах уусмал','Нөөц дээж'],
  convectionCell:['Эхний сав','Хоёр дахь сав','Нөөц дээж'],
  diffusionCell:['Үндсэн уусмал','Тархах бодис','Хяналтын орчин'],
 };
 if(parts[kind]?.[i])return parts[kind][i];
 if(kind==='corrosionRack')return `Зэврэлтийн сорил ${i+1}`;
 const labels:Record<string,string[]>={gasTrain:['Урвалын сав','Нэмэх урвалж','Хий хүлээн авагч'],reactionTile:['Сорил A','Сорил B','Сорил C','Сорил D','Сорил E','Сорил F'],chromatographyTank:['Уусгагч','Будаг','Шүүлтүүрийн цаас'],gasSyringe:['Хийн дээж'],diffusionTube:['Аммиак','Давсны хүчил'],calorimeter:['Халах ус','Түлш'],conductivityTester:['Шалгах уусмал','Харьцуулах уусмал'],heatingBath:['Халаах дээж','Харьцуулах дээж'],convectionCell:['Халуун хэсэг','Хүйтэн хэсэг']};
 return labels[kind]?.[i]??`Харьцуулах дээж ${i+1}`;
}

export function apparatusPurpose(kind:string){
 const shape=isCurriculumRig(kind)?CURRICULUM_RIGS[kind].shape:'';
 const specific:Record<string,string>={
  gasSyringe:'Хий орж ирэхэд поршен гадагш шилжинэ. Резинэн жийргийн ирмэгээр эзлэхүүнийг уншина; халаахад хий тэлж, хөргөхөд агшина.',
  chromatographyTank:'Бэхний гарааны шугам уусгагчийн түвшнээс дээш байна. Уусгагч цаасаар дээшилж, бүрэлдэхүүнүүд өөр өөр зайд шилжинэ.',
  gasTrain:'Урвалын саванд үүссэн хий холбох хоолойгоор хүлээн авагчид очно. Хөөсийг шингэн дотор, хуримтлагдсан хийг хүлээн авагчид ажигла.',
  diffusionTube:'Хоёр үзүүрээс NH₃ ба HCl тархана. NH₃ хурдан тархах тул цагаан NH₄Cl цагираг HCl-ийн үзүүрт ойр үүснэ.',
  calorimeter:'Дэнгийн дөл усны савыг доороос халаана. Усны температурын өсөлтийг зарцуулсан түлшний масстай харьцуулна.',
  conductivityTester:'Хоёр электрод нэг уусмалд дүрэгдэнэ. Дамжуулалттай уусмалд хэлхээний чийдэн асна. Хий үүсэх нь тусдаа химийн урвалаас хамаарна.',
  corrosionRack:'Тусдаа сорил бүрийн ус, агаар, металл ба бүрхүүлийг харьцуулна. Бор зэв тухайн дээжид үүссэн хэмжээгээр харагдана.',
  diffusionCell:'Өнгөт бодис шингэн дотор тархана. Энэ нь бодисын шилжилт; шинэ бодис үүсэх урвал биш.',
  convectionCell:'Халуун шингэн доор байвал дээшилж, хүйтэн шингэн доошилно. Халуун үе дээр байвал холилдолт удааширна.',
 };
 if(specific[kind])return specific[kind];
 const descriptions:Record<string,string>={
  balance:'Дээжийг жингийн тавцанд хийж массыг уншина. Харьцуулах болон ялгасан дээж тусдаа хэсэгт байна.',
  materials:'Дээжийн соронзон чанар, дамжуулалт, массыг тус тус шалгана. Туршилтын үр дүнг заалттай харьцуул.',
  density:'Хуурай дээжийг жинлээд усанд дүрнэ. Массыг түрэгдсэн усны эзлэхүүнд хувааж нягтыг олно.',
  volumetric:'Хатуу дээжийг усанд уусгаж, хэмжүүрт колбоны тэмдэг хүртэл шингэлнэ.',
  electrolysis:'Электролитэд хоёр электрод дүрж DC үүсгэгчийг холбоно. Катод дээр тунах бүтээгдэхүүнийг ажигла.',
  galvanic:'Хоёр хагас хэлхээг давсан гүүрээр холбоно. Вольтметрээр хүчдэлийг хэмжиж, дараа нь ачаалал холбоно.',
  migration:'Цахилгаан орны нөлөөгөөр өнгөт ионууд U хоолойн дагуу шилжинэ.',
  furnace:'Гол дээжийг зууханд халаана. Хийн гаралт ба нэмэх бодисын хэсгийг дугаараар ялгана.',
  oven:'Гидратыг халааж усыг салгана. Конденсатыг тусад нь цуглуулж, хөргөсний дараа дахин усжуулна.',
  reflux:'Урвалын савыг доороос халаана. Дээд хөргөгч уурыг хөргөж, холбогдсон саванд бүтээгдэхүүн цуглуулна.',
  distillation:'Холимгийг баганад халаана. Буцлах температурын муж бүрийн фракц тусдаа хүлээн авагчид орно.',
  polymer:'Усан ба органик үеийн заагт утас үүснэ. Үүссэн утсыг ороогчоор татаж тусдаа тавцанд цуглуулна.',
  pressure:'Поршен хийн эзлэхүүнийг өөрчилнө. Даралт, температур, өнгөний өөрчлөлтийг хамт ажигла.',
  enzyme:'Дугаартай сорилуудыг тусгаарлаж, температур ба хяналтын дээжийн нөлөөг харьцуулна.',
  exposure:'Дугаар бүр тусдаа орчинтой дээж. Ус, агаар, бүрхүүл ба хамгаалалтын ялгааг харьцуулна.',
  soil:'Хөрсний дээж, харьцуулах дээж, шүүгдэсийг тусдаа саванд хадгална.',
  viscometer:'Шингэнд шилэн бөмбөлөг унагаж туулсан зай ба хугацааг харьцуулна.',
 };
 return descriptions[shape]??'Дугаартай хэсэгт заасан дээжийг хийж, удирдлагыг ажиллуулаад бодит хэмжилт ба бүтээгдэхүүнийг ажигла.';
}

/** Functional parts are distinct from the numbered material input locations. */
export function apparatusParts(kind:string):readonly (readonly [string,string])[]{
 const shape=isCurriculumRig(kind)?CURRICULUM_RIGS[kind].shape:kind;
 const parts:Record<string,[string,string][]>={
  gasSyringe:[['Шилэн цилиндр','Хийг битүү хадгална; хуваарь нь мл.'],['Поршен ба резинэн жийрэг','Хийн эзлэхүүнтэй хамт шилжинэ.'],['Шток ба бариул','Поршентой нэг бүхэл болж хөдөлнө.']],
  pressure:[['Битүү цилиндр','Урвалын хийнүүд байрлана.'],['Поршен','Эзлэхүүнийг багасгахад даралт өснө.'],['Манометр','Даралтыг bar нэгжээр заана.']],
  galvanic:[['Zn электрод · анод (−)','Цайр уусч, электрон гадаад хэлхээнд гарна.'],['Cu электрод · катод (+)','Cu²⁺ ангижирч зэс ялгарна.'],['Давсан гүүр','Ионууд шилжиж цэнэгийн тэнцвэрийг хадгална.'],['Вольтметр','Хоёр электродын хүчдэлийн ялгааг хэмжинэ.']],
  electrolysis:[['Катод (−)','Металлын ион электрон авч металл болно.'],['Анод (+)','Материалаас хамаарч уусна эсвэл хий ялгаруулна.'],['DC үүсгэгч','Хэлхээнд гүйдэл өгнө.']],
  reflux:[['Урвалын сав','Холимгийг доороос халаана.'],['Буцах хөргөгч','Уур хөрч шингэн болон сав руу буцна.'],['Холбох хоолой','Хий / бүтээгдэхүүний шилжих зам.']],
  chromatographyTank:[['Цаас','Бэхний бүрэлдэхүүнүүдийн хөдөлгөөнгүй фаз.'],['Гарааны шугам','Уусгагчийн гадаргуугаас дээш байрлана.'],['Уусгагчийн фронт','Шингэн хүрсэн хамгийн дээд хил.']],
  gasTrain:[['Урвалын сав','Хий үүсэх холимог.'],['Бөглөө ба дамжуулах хоолой','Үүссэн хийг гадагш дамжуулна.'],['Хийн хүлээн авагч','Шилжсэн хийг тусад нь хуримтлуулна.']],
  viscometer:[['Шилэн бөмбөлөг','Хүндийн хүчээр шингэн дотор унана.'],['Хэмжих багана','Туулсан зайг харьцуулна.'],['Секундомер','Уналтын хугацааг хэмжинэ.']],
  polymer:[['Хоёр шингэн үе','Усан ба органик тэжээл нэг аяганд давхарлана.'],['Үеийн зааг','Найлонт хальс үүсэх хэсэг.'],['Ороогч','Үүссэн хальсыг утас болгон татна.']],
 };
 return parts[shape]??[];
}
