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
  | 'fireExtinguisher';

export type EquipmentCategory = 'Шилэн сав' | 'Халаах' | 'Хэмжилт' | 'Аюулгүй ажиллагаа';

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
  },
  bunsenBurner: {
    kind: 'bunsenBurner',
    name: 'Бунзены горелк',
    category: 'Халаах',
    description: 'Агаарын тохируулагчтай хийн горелк. Цэнхэр конус дөл хамгийн халуун бөгөөд цэвэр шатдаг.',
    safety: 'Урт үсээ боож, хамгаалалтын шил зүүж, асаалттай горелкийг хараа хяналтгүй бүү орхи.',
    size: [0.1, 0.17, 0.1],
    collider: cyl(0.045, 0.17),
    pickable: false,
    spawnable: false,
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
    collider: box(0.22, 0.3, 0.32),
    pickable: false,
    spawnable: false,
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
    pickable: false,
    spawnable: false,
    massKg: 9,
  },
};

export const SPAWNABLE_KINDS: EquipmentKind[] = (Object.keys(CATALOG) as EquipmentKind[]).filter((k) => CATALOG[k].spawnable);
