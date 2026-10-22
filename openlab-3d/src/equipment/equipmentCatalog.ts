/**
 * Catalog of every piece of equipment: display name, category, description and safety
 * note, plus the physical data used by the simulation — collider, mass, capacity, how
 * fast it pours, whether it is glass (breaks) and whether it spills when tipped.
 */
export type EquipmentKind =
  | 'beaker'
  | 'erlenmeyer'
  | 'testTube'
  | 'testTubeRack'
  | 'graduatedCylinder'
  | 'reagentBottle'
  | 'dropperBottle'
  | 'reagentJar'
  | 'bunsenBurner'
  | 'tripod'
  | 'pipette'
  | 'scale'
  | 'thermometer'
  | 'phPaper'
  | 'burette'
  | 'goggles'
  | 'gloves'
  | 'fireExtinguisher'
  | 'spatula'
  | 'tongs'
  | 'glassRod'
  | 'wireLoop'
  | 'funnel'
  | 'washBottle'
  | 'watchGlass'
  | 'petriDish'
  | 'evaporatingDish'
  | 'volumetricFlask'
  | 'testTubeHolder'
  | 'mortar';

export type EquipmentCategory = 'Шилэн сав' | 'Урвалжийн сав' | 'Халаах' | 'Хэмжилт' | 'Багаж' | 'Аюулгүй ажиллагаа';

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = ['Шилэн сав', 'Хэмжилт', 'Халаах', 'Багаж', 'Аюулгүй ажиллагаа', 'Урвалжийн сав'];

type ColliderPart =
  | { shape: 'cuboid'; size: [number, number, number]; offset: [number, number, number]; mass: number }
  | { shape: 'cylinder'; radius: number; height: number; offset: [number, number, number]; mass: number };

export type ColliderShape =
  | { shape: 'cuboid'; size: [number, number, number] }
  | { shape: 'cylinder'; radius: number; height: number }
  | { shape: 'compound'; parts: ColliderPart[] };

export interface CatalogEntry {
  kind: EquipmentKind;
  name: string;
  category: EquipmentCategory;
  description: string;
  safety: string;
  /** Approximate bounding size in meters [width, height, depth]. */
  size: [number, number, number];
  collider: ColliderShape;
  /** Can be picked up, carried and placed. */
  pickable: boolean;
  /** Appears in the Tools drawer and can be spawned onto a bench. */
  spawnable: boolean;
  massKg: number;
  /** Set for vessels that can hold liquids or solids (pouring, mixing). */
  capacityMl?: number;
  /** mL/s when pouring from it (drops for pipettes and dropper bottles). */
  pourRate?: number;
  /** Dispenses single drops instead of a stream. */
  drops?: boolean;
  /** Breaks when it hits something hard. */
  glass?: boolean;
  /** Stands upright and spills its liquid when knocked over. */
  upright?: boolean;
  /** Tongs / test-tube holder: grips another item (hot ones too). */
  grip?: boolean;
  wearable?: 'goggles' | 'gloves';
  /** Heat capacity of the empty vessel, J/K. */
  heatJK?: number;
}

const cyl = (radius: number, height: number): ColliderShape => ({ shape: 'cylinder', radius, height });
const box = (w: number, h: number, d: number): ColliderShape => ({ shape: 'cuboid', size: [w, h, d] });

const TRIPOD_LEGS = [0, 1, 2].map((i) => {
  const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
  return { shape: 'cuboid' as const, size: [0.012, 0.19, 0.012] as [number, number, number], offset: [Math.cos(a) * 0.072, 0.095, Math.sin(a) * 0.072] as [number, number, number], mass: 0.1 };
});

export const CATALOG: Record<EquipmentKind, CatalogEntry> = {
  beaker: {
    kind: 'beaker',
    name: 'Химийн аяга (250 мл)',
    category: 'Шилэн сав',
    description: 'Асгах хошуутай, хэмжээсийн зураастай боросиликат шилэн аяга. Шингэн холих, халаах, хадгалахад хэрэглэнэ.',
    safety: 'Хэмжээсийн зураас нь ойролцоо утгатай тул нарийн хэмжихдээ хэмжээст цилиндр ашигла. Халуун шил хүйтэн шилтэй яг адилхан харагддаг.',
    size: [0.075, 0.095, 0.075],
    collider: cyl(0.036, 0.095),
    pickable: true,
    spawnable: true,
    massKg: 0.12,
    capacityMl: 250,
    pourRate: 18,
    glass: true,
    upright: true,
    heatJK: 100,
  },
  erlenmeyer: {
    kind: 'erlenmeyer',
    name: 'Эрленмейерийн колб (250 мл)',
    category: 'Шилэн сав',
    description: 'Нарийн хүзүүтэй конус хэлбэрийн колб. Цацрах, уурших нь бага тул эргүүлж сэгсрэх болон титрлэхэд тохиромжтой.',
    safety: 'Битүүмжилсэн колбыг хэзээ ч бүү халаа. Зөөлөн эргүүлж сэгсэрч, амсрыг нь хүнээс зайлуул.',
    size: [0.085, 0.14, 0.085],
    collider: cyl(0.042, 0.14),
    pickable: true,
    spawnable: true,
    massKg: 0.14,
    capacityMl: 250,
    pourRate: 14,
    glass: true,
    upright: true,
    heatJK: 118,
  },
  testTube: {
    kind: 'testTube',
    name: 'Туршилтын хуруу шил',
    category: 'Шилэн сав',
    description: 'Бага хэмжээний урвал, дээжид зориулсан 16 × 150 мм боросиликат хуруу шил. Шингэнтэй хуруу шилийг тавиурт босоо байлгана.',
    safety: 'Халаахдаа хавчуураар хазгай барьж, амсрыг нь хэн нэгэн рүү бүү чиглүүл.',
    size: [0.018, 0.018, 0.15],
    collider: box(0.018, 0.018, 0.15),
    pickable: true,
    spawnable: true,
    massKg: 0.02,
    capacityMl: 20,
    pourRate: 6,
    glass: true,
    heatJK: 17,
  },
  testTubeRack: {
    kind: 'testTubeRack',
    name: 'Хуруу шилний тавиур',
    category: 'Шилэн сав',
    description: 'Зургаан хуруу шилийг босоо байрлуулдаг хоёр давхар тавиур. Хуруу шил барьж байхдаа тавиур руу хараад Q дарвал үүрэнд нь хийнэ.',
    safety: 'Хуруу шил унахгүйн тулд тавиурыг ширээний захаас холуур тавь.',
    size: [0.2, 0.09, 0.07],
    collider: box(0.2, 0.09, 0.07),
    pickable: true,
    spawnable: true,
    massKg: 0.25,
  },
  graduatedCylinder: {
    kind: 'graduatedCylinder',
    name: 'Хэмжээст цилиндр (100 мл)',
    category: 'Хэмжилт',
    description: 'Шингэний эзэлхүүнийг ±1 мл нарийвчлалтай хэмжих нарийн, өндөр цилиндр. Менискийн (шингэний хотгор гадаргуу) доод хэсгийг нүдний түвшинд уншина.',
    safety: 'Өндөр цилиндр амархан унадаг тул босоо байлгаж, ширээний захаас холдуул.',
    size: [0.06, 0.25, 0.06],
    collider: cyl(0.03, 0.25),
    pickable: true,
    spawnable: true,
    massKg: 0.2,
    capacityMl: 100,
    pourRate: 12,
    glass: true,
    upright: true,
    heatJK: 160,
  },
  reagentBottle: {
    kind: 'reagentBottle',
    name: 'Урвалжийн лонх',
    category: 'Урвалжийн сав',
    description: 'Уусмал хадгалах, эрэгдэг таглаатай хүрэн шилэн лонх. Барьж аваад өөр сав руу хараад R дарсаар асгана.',
    safety: 'Урвалж хэрэглэхийн өмнө шошгыг нь хоёр удаа уншиж, таглааг даруй буцааж тагла. Лонх руу буцааж бүү асга.',
    size: [0.065, 0.15, 0.065],
    collider: cyl(0.032, 0.14),
    pickable: true,
    spawnable: false,
    massKg: 0.3,
    capacityMl: 250,
    pourRate: 14,
    glass: true,
    heatJK: 250,
  },
  dropperBottle: {
    kind: 'dropperBottle',
    name: 'Дусаагууртай лонх (30 мл)',
    category: 'Урвалжийн сав',
    description: 'Заагч болон бага хэмжээгээр хэрэглэх урвалжийг дуслаар өгөх дусаагууртай хүрэн лонх. R дарах бүрт нэг дусал (0.05 мл).',
    safety: 'Дусаагуурыг өөр уусмалд бүү дүр — лонх доторх урвалж бохирдоно.',
    size: [0.036, 0.1, 0.036],
    collider: cyl(0.018, 0.1),
    pickable: true,
    spawnable: false,
    massKg: 0.08,
    capacityMl: 30,
    pourRate: 0.05,
    drops: true,
    glass: true,
    heatJK: 60,
  },
  reagentJar: {
    kind: 'reagentJar',
    name: 'Хатуу бодисын сав',
    category: 'Урвалжийн сав',
    description: 'Хатуу урвалж хадгалах өргөн амсартай таглаатай шилэн сав. Халбагаар (спатель) авч хэрэглэнэ.',
    safety: 'Хатуу бодисыг гараараа бүү хүр. Хэрэглэсэн халбагыг цэвэрлэж байж өөр бодисонд хийнэ.',
    size: [0.07, 0.095, 0.07],
    collider: cyl(0.034, 0.095),
    pickable: true,
    spawnable: false,
    massKg: 0.2,
    capacityMl: 120,
    pourRate: 1.5,
    glass: true,
    heatJK: 170,
  },
  bunsenBurner: {
    kind: 'bunsenBurner',
    name: 'Бунзены горелк',
    category: 'Халаах',
    description: 'Агаарын тохируулагчтай хийн горелк. Цэнхэр конус дөл хамгийн халуун бөгөөд цэвэр шатдаг. Дээр нь гурван хөлт тавиур тавьж савыг халаана.',
    safety: 'Урт үсээ боож, хамгаалалтын шил зүүж, асаалттай горелкийг хараа хяналтгүй бүү орхи.',
    size: [0.1, 0.17, 0.1],
    collider: cyl(0.045, 0.17),
    pickable: true,
    spawnable: true,
    massKg: 0.6,
  },
  tripod: {
    kind: 'tripod',
    name: 'Гурван хөлт тавиур (торон дэвсгэртэй)',
    category: 'Халаах',
    description: 'Бунзены горелкийн дээр аяга, колб, ууршуулах аягыг халаахад барих төмөр тавиур. Дээрх торон дэвсгэр дөлийг жигд тараана.',
    safety: 'Халаасны дараа тавиур удаан халуун байдаг. Горелкийг тавиурын яг доор тавь.',
    size: [0.17, 0.205, 0.17],
    collider: { shape: 'compound', parts: [{ shape: 'cylinder', radius: 0.078, height: 0.01, offset: [0, 0.198, 0], mass: 0.15 }, ...TRIPOD_LEGS] },
    pickable: true,
    spawnable: true,
    massKg: 0.45,
  },
  pipette: {
    kind: 'pipette',
    name: 'Пастерын пипетк',
    category: 'Багаж',
    description: 'Бага хэмжээний шингэнийг дуслаар шилжүүлэх резинэн толгойтой шилэн дусаагуур. Хоосон үед уусмал руу хараад R дарвал соруулна, дүүрсэн үед R дарах бүрт нэг дусал.',
    safety: 'Пипеткийг хэзээ ч амаараа бүү сор. Нарийн үзүүр нь амархан хугардаг.',
    size: [0.022, 0.022, 0.2],
    collider: box(0.022, 0.022, 0.2),
    pickable: true,
    spawnable: true,
    massKg: 0.01,
    capacityMl: 3,
    pourRate: 0.05,
    drops: true,
    glass: true,
    heatJK: 8,
  },
  scale: {
    kind: 'scale',
    name: 'Аналитик жин',
    category: 'Хэмжилт',
    description: 'Дээжийг 0.001 г нарийвчлалтай жигнэнэ. Шилэн хаалт нь агаарын урсгалаас заалтыг хамгаална.',
    safety: 'Химийн бодисыг тавган дээр шууд бүү жигнэ. Жигнэх цаас эсвэл сав ашиглаж, эхлээд тэглэ.',
    size: [0.22, 0.3, 0.32],
    collider: box(0.22, 0.075, 0.32),
    pickable: true,
    spawnable: true,
    massKg: 5,
  },
  thermometer: {
    kind: 'thermometer',
    name: 'Лабораторийн термометр',
    category: 'Хэмжилт',
    description: '−10 °C-ээс 110 °C хүртэл хэмждэг спиртэн шилэн термометр. Барьж байгаад сав руу хараад R дарвал температур хэмжинэ.',
    safety: 'Хутгуур болгож бүү ашигла. Хагарвал багшдаа мэдэгд.',
    size: [0.016, 0.016, 0.3],
    collider: box(0.016, 0.016, 0.3),
    pickable: true,
    spawnable: true,
    massKg: 0.02,
    glass: true,
  },
  phPaper: {
    kind: 'phPaper',
    name: 'pH цаас (универсаль)',
    category: 'Хэмжилт',
    description: 'Уусмалд хүргэхэд өнгө нь pH-ийг заадаг индикатор цаас. Барьж байгаад уусмал руу хараад R дарна.',
    safety: 'Цаасыг уусмалд бүхэлд нь бүү хий — ганц дусал хангалттай.',
    size: [0.06, 0.018, 0.04],
    collider: box(0.06, 0.018, 0.04),
    pickable: true,
    spawnable: true,
    massKg: 0.03,
  },
  burette: {
    kind: 'burette',
    name: 'Бюретка (50 мл) штативтай',
    category: 'Хэмжилт',
    description: 'Титрлэлтийн хуваарьтай нарийн хоолой. Дээрээс нь уусмал асгаж дүүргэ, доор нь колб тавиад E дарж кран нээ. Хулганы дугуйгаар урсгалыг тохируулна.',
    safety: 'Кран хаалттай эсэхийг шалгаж байж дүүргэ. Уусмалыг нүдний түвшнээс дээш өргөж бүү асга.',
    size: [0.22, 0.76, 0.14],
    collider: {
      shape: 'compound',
      parts: [
        { shape: 'cuboid', size: [0.22, 0.014, 0.14], offset: [0, 0.007, 0], mass: 2.2 },
        { shape: 'cylinder', radius: 0.007, height: 0.72, offset: [-0.085, 0.37, -0.045], mass: 0.3 },
      ],
    },
    pickable: true,
    spawnable: true,
    massKg: 2.5,
    capacityMl: 50,
    glass: false,
    heatJK: 200,
  },
  goggles: {
    kind: 'goggles',
    name: 'Хамгаалалтын нүдний шил',
    category: 'Аюулгүй ажиллагаа',
    description: 'Нүдийг бүрэн бүрхэж цацралтаас хамгаалдаг, шууд бус агааржуулалттай нүдний шил. Химийн бодис эсвэл шилэн сав хэрэглэх бүрт заавал зүүнэ.',
    safety: 'Хараа засах нүдний шилэн дээрээ зүүж болно. Хэрэглэсний дараа цэвэрлэж, ариутга.',
    size: [0.17, 0.07, 0.1],
    collider: box(0.17, 0.07, 0.1),
    pickable: true,
    spawnable: true,
    massKg: 0.08,
    wearable: 'goggles',
  },
  gloves: {
    kind: 'gloves',
    name: 'Нитрилэн бээлий',
    category: 'Аюулгүй ажиллагаа',
    description: 'Химийн бодисоос гарыг хамгаалах нэг удаагийн нитрилэн бээлий. E дарж өмснө.',
    safety: 'Бээлийтэй гараараа нүүр, утсандаа бүү хүр. Ажил дууссаны дараа тайлж хая.',
    size: [0.16, 0.02, 0.12],
    collider: box(0.16, 0.02, 0.12),
    pickable: true,
    spawnable: true,
    massKg: 0.02,
    wearable: 'gloves',
  },
  fireExtinguisher: {
    kind: 'fireExtinguisher',
    name: 'CO₂ гал унтраагуур',
    category: 'Аюулгүй ажиллагаа',
    description: 'Цахилгаан болон шатамхай шингэний галд тохиромжтой, 5 кг нүүрсхүчлийн хийн гал унтраагуур. Барьж аваад гал руу хараад R дарсаар цацна.',
    safety: 'Дараалал: хадаасыг сугал, галын ёроол руу чиглүүл, бариулыг шах, хажуу тийш шүүрдэж цац.',
    size: [0.2, 0.62, 0.2],
    collider: cyl(0.08, 0.62),
    pickable: true,
    spawnable: true,
    massKg: 9,
  },
  spatula: {
    kind: 'spatula',
    name: 'Лабораторийн халбага (спатель)',
    category: 'Багаж',
    description: 'Хатуу бодис, нунтаг авах зэвэрдэггүй ган халбага. Хатуу бодисын сав руу хараад R дарвал 0.5 г авна, дараа нь өөр сав руу хараад R дарж хийнэ.',
    safety: 'Бодис болгонд тусдаа халбага ашиглаж, хэрэглэсний дараа цэвэрлэ. Ингэснээр бодис хоорондоо бохирдохгүй.',
    size: [0.02, 0.008, 0.18],
    collider: box(0.02, 0.008, 0.18),
    pickable: true,
    spawnable: true,
    massKg: 0.03,
    capacityMl: 5,
  },
  tongs: {
    kind: 'tongs',
    name: 'Тигель хавчаар',
    category: 'Багаж',
    description: 'Халуун тигель, ууршуулах аяга, аяга зэргийг барьж зөөх ган хавчаар. Хавчаараа барьж байгаад сав дээр E дарвал хавчина.',
    safety: 'Халуун эд зүйлийг хэзээ ч гараар бүү бариарай. Хавчааран үзүүрийг хэрэглэхийн өмнө цэвэрхэн эсэхийг шалга.',
    size: [0.04, 0.012, 0.24],
    collider: box(0.04, 0.012, 0.24),
    pickable: true,
    spawnable: true,
    massKg: 0.08,
    grip: true,
  },
  glassRod: {
    kind: 'glassRod',
    name: 'Шилэн хутгуур',
    category: 'Багаж',
    description: 'Уусмалыг хутгах, шингэнийг шүүлтүүр рүү дагуулан цутгахад хэрэглэх шилэн саваа. Сав руу хараад R дарж хутгана — хатуу бодис хурдан уусна.',
    safety: 'Хутгахдаа савны ёроол, ханыг хүчтэй бүү цохь. Хагарсан саваа хурц ирмэгтэй болдог.',
    size: [0.006, 0.006, 0.2],
    collider: box(0.006, 0.006, 0.2),
    pickable: true,
    spawnable: true,
    massKg: 0.015,
    glass: true,
  },
  wireLoop: {
    kind: 'wireLoop',
    name: 'Нихром утас (дөлийн сорил)',
    category: 'Багаж',
    description: 'Модон бариултай нихром утсан гогцоо. Уусмалд дүрээд (R) асаалттай горелкийн дөлөнд барихад (R) металлын ион дөлийг өнгөтэй болгоно.',
    safety: 'Сорил бүрийн өмнө давсны хүчилд дүрж цэвэрлэ. Халуун үзүүрт бүү хүр.',
    size: [0.012, 0.012, 0.22],
    collider: box(0.012, 0.012, 0.22),
    pickable: true,
    spawnable: true,
    massKg: 0.02,
  },
  funnel: {
    kind: 'funnel',
    name: 'Шилэн юүлүүр (шүүлтүүр цаастай)',
    category: 'Шилэн сав',
    description: 'Шингэнийг нарийн амсартай саванд асгах, шүүлтүүрийн цаасаар тунадасыг шүүх юүлүүр. Тунадастай сав руу хараад R дарвал шүүнэ.',
    safety: 'Юүлүүрийг колбонд зөөлөн суулга. Нарийн хошуу нь амархан хугардаг.',
    size: [0.077, 0.112, 0.077],
    collider: cyl(0.032, 0.112),
    pickable: true,
    spawnable: true,
    massKg: 0.06,
    glass: true,
  },
  washBottle: {
    kind: 'washBottle',
    name: 'Угаалгын сав (нэрмэл ус)',
    category: 'Шилэн сав',
    description: 'Нарийн хошуутай хуванцар сав. Нэрмэл ус агуулж, шилэн сав зайлах, тунадас угаах, уусмал шингэлэхэд хэрэглэнэ.',
    safety: 'Хошууг хүн рүү бүү чиглүүл. Зөвхөн нэрмэл ус эсвэл шошгон дээр бичсэн бодисоор дүүргэ.',
    size: [0.065, 0.2, 0.065],
    collider: cyl(0.033, 0.19),
    pickable: true,
    spawnable: true,
    massKg: 0.3,
    capacityMl: 250,
    pourRate: 8,
  },
  watchGlass: {
    kind: 'watchGlass',
    name: 'Цагийн шил',
    category: 'Шилэн сав',
    description: 'Аяга, колбыг таглах, бага хэмжээний дээжийг хатаахад хэрэглэх гүехэн хотгор шилэн хавтан. Шатаж буй сав руу хараад R дарвал тагалж галыг унтраана.',
    safety: 'Халуун шингэний дээр таглахдаа шилийг ирмэгээр нь барь.',
    size: [0.08, 0.008, 0.08],
    collider: cyl(0.04, 0.008),
    pickable: true,
    spawnable: true,
    massKg: 0.03,
    capacityMl: 8,
    pourRate: 4,
    glass: true,
    heatJK: 25,
  },
  petriDish: {
    kind: 'petriDish',
    name: 'Петрийн аяга',
    category: 'Шилэн сав',
    description: 'Таглаатай, гүехэн цилиндр шилэн аяга. Бага хэмжээний шингэн, тунадас, талст харахад хэрэглэнэ.',
    safety: 'Таглааг хэрэглэх үедээ л нээ. Өсгөвөртэй аягыг нээсний дараа гараа сайтар угаа.',
    size: [0.093, 0.019, 0.093],
    collider: cyl(0.046, 0.019),
    pickable: true,
    spawnable: true,
    massKg: 0.06,
    capacityMl: 40,
    pourRate: 8,
    glass: true,
    upright: true,
    heatJK: 50,
  },
  evaporatingDish: {
    kind: 'evaporatingDish',
    name: 'Ууршуулах аяга',
    category: 'Халаах',
    description: 'Шилэн бүрээстэй шаазан аяга. Уусмалыг гурван хөлт тавиур дээр халааж ууршуулан талстжуулах, дээжийг хатаахад хэрэглэнэ.',
    safety: 'Халсан аяга удаан халуунаа хадгалдаг. Тигель хавчаараар барь, хүйтэн гадаргуу дээр шууд бүү тавь.',
    size: [0.1, 0.04, 0.1],
    collider: cyl(0.048, 0.04),
    pickable: true,
    spawnable: true,
    massKg: 0.12,
    capacityMl: 60,
    pourRate: 8,
    glass: true,
    upright: true,
    heatJK: 95,
  },
  volumetricFlask: {
    kind: 'volumetricFlask',
    name: 'Хэмжээст колб (100 мл)',
    category: 'Хэмжилт',
    description: 'Уртхан нарийн хүзүүтэй, нэг тэмдэгтэй колб. Тодорхой концентрацтай уусмал бэлдэхэд хамгийн нарийн хэмжигддэг.',
    safety: 'Колбыг халаахгүй, халуун уусмал хийхгүй. Тэмдэг хүртэл ус нэмэхдээ менискийн доод хэсгийг нүдний түвшинд хар.',
    size: [0.085, 0.175, 0.085],
    collider: cyl(0.042, 0.173),
    pickable: true,
    spawnable: true,
    massKg: 0.16,
    capacityMl: 110,
    pourRate: 10,
    glass: true,
    upright: true,
    heatJK: 130,
  },
  testTubeHolder: {
    kind: 'testTubeHolder',
    name: 'Хуруу шил барих хавчаар',
    category: 'Багаж',
    description: 'Халаах үед хуруу шилийг гараас хол барьдаг модон бариултай хавчаар. Хавчаараа барьж хуруу шил дээр E дарвал хавчина, дараа нь асаалттай горелк руу хараад R дарж халаана.',
    safety: 'Хуруу шилийг дээд хэсгээс нь барьж, галын дөлд хазгай байрлуулан халаа. Амсрыг хүн рүү бүү чиглүүл.',
    size: [0.03, 0.012, 0.2],
    collider: box(0.03, 0.012, 0.2),
    pickable: true,
    spawnable: true,
    massKg: 0.04,
    grip: true,
  },
  mortar: {
    kind: 'mortar',
    name: 'Нунтаглуур (ступка ба пестик)',
    category: 'Багаж',
    description: 'Хатуу талстыг нунтаглах шаазан аяга. Талст хийгээд E дарж нунтаглавал бодис хурдан уусдаг болно.',
    safety: 'Пестикээр цохихгүй, үрэн нунтагла. Нунтаг дэгдэх тул хамгаалалтын шил зүү.',
    size: [0.12, 0.1, 0.12],
    collider: cyl(0.06, 0.047),
    pickable: true,
    spawnable: true,
    massKg: 0.5,
    capacityMl: 60,
    pourRate: 3,
    glass: true,
    heatJK: 400,
  },
};

export const isContainer = (kind: EquipmentKind): boolean => CATALOG[kind].capacityMl !== undefined && kind !== 'spatula';

export const SPAWNABLE_KINDS: EquipmentKind[] = (Object.keys(CATALOG) as EquipmentKind[]).filter((k) => CATALOG[k].spawnable);

/** Containers that are sources only: nothing may be poured back into them. */
export const STOCK_KINDS: EquipmentKind[] = ['reagentBottle', 'dropperBottle', 'reagentJar'];
