/**
 * Catalog of every piece of equipment: display name, category, description and safety
 * note, plus the physical footprint used for pickable colliders and placement.
 */
export type EquipmentKind =
  | 'beaker'
  | 'erlenmeyer'
  | 'testTube'
  | 'testTubeRack'
  | 'graduatedCylinder'
  | 'reagentBottle'
  | 'bunsenBurner'
  | 'pipette'
  | 'scale'
  | 'thermometer'
  | 'goggles'
  | 'fireExtinguisher'
  | 'spatula'
  | 'tongs'
  | 'glassRod'
  | 'funnel'
  | 'washBottle'
  | 'watchGlass'
  | 'petriDish'
  | 'evaporatingDish'
  | 'volumetricFlask'
  | 'testTubeHolder'
  | 'mortar';

export type EquipmentCategory = 'Шилэн сав' | 'Халаах' | 'Хэмжилт' | 'Багаж' | 'Аюулгүй ажиллагаа';

export type ColliderShape =
  | { shape: 'cuboid'; size: [number, number, number] }
  | { shape: 'cylinder'; radius: number; height: number };

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
  /** Set for vessels that can hold and receive liquids (pouring, mixing). */
  capacityMl?: number;
}

const cyl = (radius: number, height: number): ColliderShape => ({ shape: 'cylinder', radius, height });
const box = (w: number, h: number, d: number): ColliderShape => ({ shape: 'cuboid', size: [w, h, d] });

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
  },
  testTube: {
    kind: 'testTube',
    name: 'Туршилтын хуруу шил',
    category: 'Шилэн сав',
    description: 'Бага хэмжээний урвал, дээжид зориулсан 16 × 150 мм боросиликат хуруу шил.',
    safety: 'Халаахдаа хавчуураар хазгай барьж, амсрыг нь хэн нэгэн рүү бүү чиглүүл.',
    size: [0.018, 0.018, 0.15],
    collider: box(0.018, 0.018, 0.15),
    pickable: true,
    spawnable: true,
    massKg: 0.02,
    capacityMl: 15,
  },
  testTubeRack: {
    kind: 'testTubeRack',
    name: 'Хуруу шилний тавиур',
    category: 'Шилэн сав',
    description: 'Зургаан хуруу шилийг босоо байрлуулдаг хоёр давхар полипропилен тавиур.',
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
  },
  reagentBottle: {
    kind: 'reagentBottle',
    name: 'Урвалжийн лонх',
    category: 'Шилэн сав',
    description: 'Гэрэлд мэдрэмтгий уусмал хадгалах, эрэгдэг таглаатай хүрэн шилэн лонх.',
    safety: 'Урвалж хэрэглэхийн өмнө шошгыг нь хоёр удаа уншиж, таглааг даруй буцааж тагла.',
    size: [0.065, 0.14, 0.065],
    collider: cyl(0.032, 0.14),
    pickable: true,
    spawnable: true,
    massKg: 0.3,
    capacityMl: 250,
  },
  bunsenBurner: {
    kind: 'bunsenBurner',
    name: 'Бунзены горелк',
    category: 'Халаах',
    description: 'Агаарын тохируулагчтай хийн горелк. Цэнхэр конус дөл хамгийн халуун бөгөөд цэвэр шатдаг.',
    safety: 'Урт үсээ боож, хамгаалалтын шил зүүж, асаалттай горелкийг хараа хяналтгүй бүү орхи.',
    size: [0.1, 0.17, 0.1],
    collider: cyl(0.045, 0.17),
    pickable: true,
    spawnable: true,
    massKg: 0.6,
  },
  pipette: {
    kind: 'pipette',
    name: 'Пастерын пипетк',
    category: 'Шилэн сав',
    description: 'Бага хэмжээний шингэнийг дуслаар шилжүүлэх резинэн толгойтой шилэн дусаагуур.',
    safety: 'Пипеткийг хэзээ ч амаараа бүү сор. Нарийн үзүүр нь амархан хугардаг.',
    size: [0.022, 0.022, 0.2],
    collider: box(0.022, 0.022, 0.2),
    pickable: true,
    spawnable: true,
    massKg: 0.01,
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
    description: '−10 °C-ээс 110 °C хүртэл хэмждэг спиртэн шилэн термометр.',
    safety: 'Хутгуур болгож бүү ашигла. Хагарвал багшдаа мэдэгд.',
    size: [0.016, 0.016, 0.3],
    collider: box(0.016, 0.016, 0.3),
    pickable: true,
    spawnable: true,
    massKg: 0.02,
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
  },
  fireExtinguisher: {
    kind: 'fireExtinguisher',
    name: 'CO₂ гал унтраагуур',
    category: 'Аюулгүй ажиллагаа',
    description: 'Цахилгаан болон шатамхай шингэний галд тохиромжтой, 5 кг нүүрсхүчлийн хийн гал унтраагуур.',
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
    description: 'Хатуу бодис, нунтаг авах зэвэрдэггүй ган халбага. Нэг үзүүр нь шанага, нөгөө нь хавтгай ир хэлбэртэй.',
    safety: 'Бодис болгонд тусдаа халбага ашиглаж, хэрэглэсний дараа цэвэрлэ. Ингэснээр бодис хоорондоо бохирдохгүй.',
    size: [0.02, 0.008, 0.18],
    collider: box(0.02, 0.008, 0.18),
    pickable: true,
    spawnable: true,
    massKg: 0.03,
  },
  tongs: {
    kind: 'tongs',
    name: 'Тигель хавчаар',
    category: 'Багаж',
    description: 'Халуун тигель, ууршуулах аяга зэргийг барьж зөөх хөндлөн огтлолцсон ган хавчаар.',
    safety: 'Халуун эд зүйлийг хэзээ ч гараар бүү бариарай. Хавчааран үзүүрийг хэрэглэхийн өмнө цэвэрхэн эсэхийг шалга.',
    size: [0.04, 0.012, 0.24],
    collider: box(0.04, 0.012, 0.24),
    pickable: true,
    spawnable: true,
    massKg: 0.08,
  },
  glassRod: {
    kind: 'glassRod',
    name: 'Шилэн хутгуур',
    category: 'Шилэн сав',
    description: 'Уусмалыг хутгах, шингэнийг шүүлтүүр рүү дагуулан цутгахад хэрэглэх хатуу шилэн саваа.',
    safety: 'Хутгахдаа савны ёроол, ханыг хүчтэй бүү цохь. Хагарсан саваа хурц ирмэгтэй болдог.',
    size: [0.006, 0.006, 0.2],
    collider: box(0.006, 0.006, 0.2),
    pickable: true,
    spawnable: true,
    massKg: 0.015,
  },
  funnel: {
    kind: 'funnel',
    name: 'Шилэн юүлүүр',
    category: 'Шилэн сав',
    description: 'Шингэнийг нарийн амсартай саванд асгах, шүүлтүүрийн цаас хэрэглэн шүүх юүлүүр.',
    safety: 'Юүлүүрийг колбонд хийхдээ барьж, түлхэхгүйгээр зөөлөн суулга. Нарийн хошуу нь амархан хугардаг.',
    size: [0.077, 0.112, 0.077],
    collider: cyl(0.032, 0.112),
    pickable: true,
    spawnable: true,
    massKg: 0.06,
  },
  washBottle: {
    kind: 'washBottle',
    name: 'Угаалгын сав (ус цацагч)',
    category: 'Шилэн сав',
    description: 'Нарийн хошуутай хуванцар сав. Нэрмэл ус агуулж, шилэн сав зайлах, тунадас угаах, уусмал шингэлэхэд хэрэглэнэ.',
    safety: 'Хошууг хүн рүү бүү чиглүүл. Зөвхөн нэрмэл ус эсвэл шошгон дээр бичсэн бодисоор дүүргэ.',
    size: [0.065, 0.2, 0.065],
    collider: cyl(0.033, 0.19),
    pickable: true,
    spawnable: false,
    massKg: 0.3,
    capacityMl: 250,
  },
  watchGlass: {
    kind: 'watchGlass',
    name: 'Цагийн шил',
    category: 'Шилэн сав',
    description: 'Аяга, колбыг таглах, бага хэмжээний дээжийг хатаах, хэмжихэд хэрэглэх гүехэн хотгор шилэн хавтан.',
    safety: 'Халуун шингэний дээр таглахдаа шилийг ирмэгээр нь барь. Хагарсан шилийг хуванцар хогийн саванд бүү хая.',
    size: [0.08, 0.006, 0.08],
    collider: cyl(0.04, 0.006),
    pickable: true,
    spawnable: true,
    massKg: 0.03,
  },
  petriDish: {
    kind: 'petriDish',
    name: 'Петрийн аяга',
    category: 'Шилэн сав',
    description: 'Таглаатай, гүехэн цилиндр шилэн аяга. Бага хэмжээний шингэн, тунадас, биологийн өсгөвөр харахад хэрэглэнэ.',
    safety: 'Таглааг хэрэглэх үедээ л нээ. Өсгөвөртэй аягыг нээсний дараа гараа сайтар угаа.',
    size: [0.093, 0.019, 0.093],
    collider: cyl(0.046, 0.019),
    pickable: true,
    spawnable: true,
    massKg: 0.06,
    capacityMl: 40,
  },
  evaporatingDish: {
    kind: 'evaporatingDish',
    name: 'Ууршуулах аяга',
    category: 'Халаах',
    description: 'Шилэн бүрээстэй шаазан аяга. Уусмалыг ууршуулж талстжуулах, дээжийг халуунд хатаахад хэрэглэнэ.',
    safety: 'Халсан аяга удаан халуунаа хадгалдаг. Тигель хавчаараар барь, хүйтэн гадаргуу дээр шууд бүү тавь.',
    size: [0.1, 0.04, 0.1],
    collider: cyl(0.048, 0.04),
    pickable: true,
    spawnable: true,
    massKg: 0.12,
    capacityMl: 60,
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
    capacityMl: 100,
  },
  testTubeHolder: {
    kind: 'testTubeHolder',
    name: 'Хуруу шил барих хавчаар',
    category: 'Багаж',
    description: 'Халаах үед хуруу шилийг гараас хол барьдаг модон бариултай пүрштэй хавчаар.',
    safety: 'Хуруу шилийг дээд хэсгээс нь барьж, галын дөлд хазгай байрлуулан халаа. Амсрыг хүн рүү бүү чиглүүл.',
    size: [0.03, 0.012, 0.2],
    collider: box(0.03, 0.012, 0.2),
    pickable: true,
    spawnable: true,
    massKg: 0.04,
  },
  mortar: {
    kind: 'mortar',
    name: 'Нунтаглуур (ступка ба пестик)',
    category: 'Багаж',
    description: 'Хатуу талстыг нунтаглах шаазан аяга ба түүний пестик. Бодисыг хэсэг хэсгээр нь нунтагла.',
    safety: 'Пестикээр цохихгүй, үрэн нунтагла. Нунтаг дэгдэх тул хамгаалалтын шил зүү.',
    size: [0.12, 0.1, 0.12],
    collider: cyl(0.06, 0.047),
    pickable: true,
    spawnable: true,
    massKg: 0.5,
  },
};

export const isContainer = (kind: EquipmentKind): boolean => CATALOG[kind].capacityMl !== undefined;

export const SPAWNABLE_KINDS: EquipmentKind[] = (Object.keys(CATALOG) as EquipmentKind[]).filter((k) => CATALOG[k].spawnable);
