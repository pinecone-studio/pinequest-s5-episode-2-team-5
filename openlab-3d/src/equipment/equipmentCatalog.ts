/**
 * Catalog of every piece of equipment: display name, category, description and safety
 * note, plus the physical data used by the simulation — collider, mass, capacity, how
 * fast it pours, whether it is glass (breaks) and whether it spills when tipped.
 */
import { RIG_NAMES, type RigKind } from '../experiments/grade9/kinds';
export type EquipmentKind = RigKind | 'gasCylinder' | 'paperStrip' |
   'beaker'
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
  | 'mortar'
  | TextbookEquipmentKind;

/** Textbook apparatus that did not previously have its own procedural model. */
export type TextbookEquipmentKind =
  | 'stopwatch'
  | 'gasDeliveryTube'
  | 'retortStand'
  | 'crystallizingDish'
  | 'splint'
  | 'sandpaper'
  | 'cottonWool'
  | 'syringe'
  | 'matches'
  | 'handPump'
  | 'uTube'
  | 'aluminumCan'
  | 'plasticCup'
  | 'knife'
  | 'magnifyingGlass'
  | 'disposableDish'
  | 'plasticBottle'
  | 'seedPot'
  | 'tissue'
  | 'waterFilter'
  | 'corkStopper'
  | 'penCap'
  | 'modellingClay'
  | 'dripAdjuster'
  | 'wireGauze'
  | 'wellPlate'
  | 'filterPaper'
  | 'alcoholLamp'
  | 'electrode'
  | 'powerSupply'
  | 'voltmeter'
  | 'led'
  | 'deskLamp'
  | 'barometer'
  | 'hammer'
  | 'brush'
  | 'straw'
  | 'ruler'
  | 'pencil'
  | 'balloon'
  | 'crucible'
  | 'trough'
  | 'magnet'
  | 'plasticBag'
  | 'glassTube'
  | 'rubberBand'
  | 'wires';

/** Heat sources: a lit one heats the vessel on a tripod above it. */
export const HEATERS: EquipmentKind[] = ['bunsenBurner', 'alcoholLamp'];
export const isHeater = (kind: EquipmentKind): boolean => HEATERS.includes(kind);
/**
 * Heat a lit heater gives the vessel above it, W (accelerated like the rest of the lab). A spirit
 * lamp's small flame gives half a Bunsen burner's: it still boils a beaker or a test tube of water,
 * only about 2.5× more slowly, and evaporates it about 5× more slowly.
 */
export const HEATER_WATTS: Partial<Record<EquipmentKind, number>> = { bunsenBurner: 1300, alcoholLamp: 650 };
export const heaterWatts = (kind: EquipmentKind): number => HEATER_WATTS[kind] ?? 1300;

export type EquipmentCategory = 'Шилэн сав' | 'Урвалжийн сав' | 'Халаах' | 'Хэмжилт' | 'Багаж' | 'Аюулгүй ажиллагаа';

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = ['Шилэн сав', 'Хэмжилт', 'Халаах', 'Багаж', 'Аюулгүй ажиллагаа', 'Урвалжийн сав'];

export type ColliderPart =
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

const GRADE9_CATALOG=Object.fromEntries(Object.entries(RIG_NAMES).map(([kind,name])=>[kind,{
 kind,name,category:'Багаж',description:'Сурах бичгийн туршилтын зориулалтын угсралт. Бодисоо авч цутгана. Сонгоод багажийн удирдлага, хэмжилтийг нээнэ.',safety:'Хамгаалах шил хэрэглэ. Хийн угсралтыг бөглөж даралт бүү үүсгэ.',size:[.22,.28,.16],collider:box(.22,.28,.16),pickable:true,spawnable:true,massKg:.65,capacityMl:500,pourRate:15,heatJK:100,upright:true,
}])) as Record<RigKind,CatalogEntry>;

const textbookTool = (
  kind: TextbookEquipmentKind,
  name: string,
  size: [number, number, number],
  collider: ColliderShape,
  description: string,
  massKg = 0.08,
): CatalogEntry => ({
  kind, name, category: 'Багаж', description,
  safety: 'Багший зааврын дагуу хэрэглэж, туршилтын дараа цэвэрлэж хураа.',
  size, collider, pickable: true, spawnable: true, massKg,
});

/** An open textbook vessel: holds what is poured in, spills when knocked over. */
const holds = (capacityMl: number, heatJK: number, extra: Partial<CatalogEntry> = {}): Partial<CatalogEntry> => ({ capacityMl, pourRate: 12, heatJK, upright: true, ...extra });

/** Retort-stand ring centre (x, height) over its base plate. */
export const STAND_RING: [number, number] = [0.03, 0.23];
/** A funnel's stem below its cone: a ring or a flask mouth holds it by the cone. */
export const FUNNEL_STEM = 0.06;

const TEXTBOOK_CATALOG: Record<TextbookEquipmentKind, CatalogEntry> = {
  stopwatch: textbookTool('stopwatch', 'Хугацаа хэмжигч', [0.09, 0.035, 0.11], box(0.09, 0.035, 0.11), 'Туршилтын хугацаа, урвалын хурдыг хэмжинэ.', 0.12),
  gasDeliveryTube: textbookTool('gasDeliveryTube', 'Хий дамжуулах хоолой', [0.14, 0.12, 0.08], box(0.14, 0.12, 0.08), 'Үүссэн хийг савнаас цуглуулах төхөөрөмж рүү дамжуулна.', 0.03),
  // A real frame, not a solid block: base plate, rod and a ring that holds a funnel above a flask on the base.
  retortStand: textbookTool('retortStand', 'Штатив (цагаригтай)', [0.24, 0.28, 0.12], { shape: 'compound', parts: [
    { shape: 'cuboid', size: [0.2, 0.024, 0.12], offset: [0, 0.012, 0], mass: 0.6 },
    { shape: 'cylinder', radius: 0.008, height: 0.28, offset: [-0.07, 0.14, 0], mass: 0.15 },
    ...([[0, 0.024], [0, -0.024], [0.024, 0], [-0.024, 0]] as const).map(([x, z]): ColliderPart => ({ shape: 'cuboid', size: x ? [0.006, 0.006, 0.06] : [0.06, 0.006, 0.006], offset: [STAND_RING[0] + x, STAND_RING[1], z], mass: 0.0125 })),
  ] }, 'Хавчаар, цагираг тогтоон савыг байрлуулах төмөр суурь. Цагирагт юүлүүр тавиад доор нь колбо, аягаа суурин дээр тавина.', 0.8),
  crystallizingDish: { ...textbookTool('crystallizingDish', 'Талстжуулагч', [0.15, 0.035, 0.15], cyl(0.075, 0.035), 'Уусмалыг өргөн гадаргуутай саванд ууршуулж талстжуулна.', 0.18), ...holds(350, 150, { glass: true }) },
  splint: textbookTool('splint', 'Зомгол', [0.012, 0.012, 0.18], box(0.012, 0.012, 0.18), 'Хийг таних болон шаталтыг ажиглахад хэрэглэдэг модон зомгол.', 0.005),
  sandpaper: textbookTool('sandpaper', 'Зүлгүүр', [0.1, 0.003, 0.14], box(0.1, 0.003, 0.14), 'Металлын гадаргууг цэвэрлэхэд хэрэглэнэ.', 0.01),
  cottonWool: textbookTool('cottonWool', 'Хөвөн', [0.06, 0.04, 0.06], box(0.06, 0.04, 0.06), 'Шүүлтүүр болон бөглөөний завсарт хэрэглэдэг сул ширхэглэг хөвөн.', 0.002),
  syringe: textbookTool('syringe', 'Тариур', [0.035, 0.035, 0.19], box(0.035, 0.035, 0.19), 'Шингэнийг хэмжиж соруулан, хяналттай шахна.', 0.025),
  matches: textbookTool('matches', 'Чүдэнз', [0.045, 0.018, 0.07], box(0.045, 0.018, 0.07), 'Багшийн хяналтад гал асаахад хэрэглэнэ.', 0.01),
  handPump: textbookTool('handPump', 'Насос', [0.09, 0.2, 0.09], box(0.09, 0.2, 0.09), 'Хийг шахаж, хоолойгоор дамжуулна.', 0.35),
  uTube: textbookTool('uTube', 'U хэлбэрийн хоолой', [0.12, 0.14, 0.025], box(0.12, 0.14, 0.025), 'Хийг дамжуулах эсвэл шингэний түвшний өөрчлөлт ажиглах шилэн хоолой.', 0.04),
  // 13 g of aluminium: it conducts, so a can of ice water mists over outside.
  aluminumCan: { ...textbookTool('aluminumCan', 'Хөнгөнцагаан лааз', [0.067, 0.12, 0.067], cyl(0.034, 0.12), 'Дулаан дамжуулалт, халаалтын туршилтад хэрэглэнэ.', 0.02), ...holds(330, 12) },
  plasticCup: { ...textbookTool('plasticCup', 'Хуванцар аяга', [0.085, 0.09, 0.085], cyl(0.042, 0.09), 'Шингэн түр хийх, хэмжихэд хэрэглэдэг хөнгөн аяга.', 0.02), ...holds(250, 6) },
  knife: textbookTool('knife', 'Хутга', [0.025, 0.012, 0.17], box(0.025, 0.012, 0.17), 'Зөөлөн материалыг огтлоход хэрэглэнэ.', 0.06),
  magnifyingGlass: textbookTool('magnifyingGlass', 'Томруулагч шил', [0.11, 0.012, 0.18], box(0.11, 0.012, 0.18), 'Жижиг биет, талст болон гадаргууг томруулж ажиглана.', 0.04),
  disposableDish: { ...textbookTool('disposableDish', 'Нэг удаагийн таваг', [0.14, 0.018, 0.14], cyl(0.07, 0.018), 'Дээжийг ширээн дээр тарааж байрлуулах гүехэн хуванцар таваг.', 0.015), ...holds(150, 5) },
  // Capped: knocking it over does not spill it.
  plasticBottle: { ...textbookTool('plasticBottle', 'Ундааны сав', [0.07, 0.2, 0.07], cyl(0.035, 0.2), 'Ус болон туршилтын уусмал хадгалах хуванцар сав.', 0.04), ...holds(400, 10, { upright: false }) },
  seedPot: { ...textbookTool('seedPot', 'Үр суулгах сав', [0.1, 0.08, 0.1], cyl(0.05, 0.08), 'Үр соёолуулах зориулалтын жижиг сав.', 0.03), ...holds(300, 15) },
  tissue: textbookTool('tissue', 'Салфетка', [0.08, 0.006, 0.08], box(0.08, 0.006, 0.08), 'Шингэн шингээх, гадаргуу арчих цаасан салфетка.', 0.002),
  waterFilter: textbookTool('waterFilter', 'Шүүлтүүр', [0.07, 0.16, 0.07], cyl(0.035, 0.16), 'Усыг үе давхаргаар нэвтрүүлж механик хольцыг шүүнэ.', 0.1),
  corkStopper: textbookTool('corkStopper', 'Бөглөө', [0.035, 0.045, 0.035], cyl(0.018, 0.045), 'Савны амсрыг сул бөглөх зориулалтын үйсэн бөглөө.', 0.01),
  penCap: textbookTool('penCap', 'Балны таг', [0.02, 0.02, 0.055], box(0.02, 0.02, 0.055), 'Хуванцар хоолой эсвэл туршилтын амсрыг хаах жижиг таг.', 0.004),
  modellingClay: textbookTool('modellingClay', 'Баримлын шавар', [0.06, 0.045, 0.06], box(0.06, 0.045, 0.06), 'Хоолойн амсрыг түр битүүлэхэд хэрэглэнэ.', 0.06),
  dripAdjuster: textbookTool('dripAdjuster', 'Дуслын системийн тохируулагч', [0.05, 0.07, 0.035], box(0.05, 0.07, 0.035), 'Дуслын системээр гарах шингэний урсгалыг тохируулна.', 0.02),
  wireGauze: textbookTool('wireGauze', 'Шөрмөсөн чулуун тор', [0.14, 0.008, 0.14], box(0.14, 0.008, 0.14), 'Гурван хөлт тавиур дээр тавьж савны ёроолд дулааныг жигд тараана.', 0.12),
  wellPlate: textbookTool('wellPlate', 'Хонхортой таваг', [0.14, 0.018, 0.1], box(0.14, 0.018, 0.1), 'Бага хэмжээний урвалыг олон хонхорт тус тусад нь явуулна.', 0.05),
  filterPaper: textbookTool('filterPaper', 'Шүүлтүүрийн цаас', [0.09, 0.002, 0.09], cyl(0.045, 0.002), 'Тунадасыг юүлүүрээр шүүхэд хэрэглэдэг дугуй цаас.', 0.001),
  alcoholLamp: { ...textbookTool('alcoholLamp', 'Спиртэн дэн', [0.08, 0.12, 0.08], cyl(0.04, 0.12), 'Спиртийн дөлөөр хуруу шил, аягыг халаана. Гурван хөлт тавиурын доор тавьж асаана.', 0.25), category: 'Халаах', safety: 'Асаалттай дэнг бүү зөө. Малгайгаар нь бүрхэж унтраа.' },
  electrode: textbookTool('electrode', 'Электрод', [0.012, 0.15, 0.012], cyl(0.006, 0.15), 'Уусмалд дүрж хэлхээнд холбодог металл эсвэл бал чулуун саваа.', 0.02),
  powerSupply: textbookTool('powerSupply', 'Гүйдэл үүсгэгч', [0.14, 0.08, 0.1], box(0.14, 0.08, 0.1), 'Хэлхээнд тогтмол гүйдэл өгөх тэжээл, холбох утастай.', 0.6),
  voltmeter: textbookTool('voltmeter', 'Вольтметр', [0.11, 0.09, 0.08], box(0.11, 0.09, 0.08), 'Хоёр электродын хоорондох хүчдэлийг хэмжинэ.', 0.3),
  led: textbookTool('led', 'Гэрлэн диод', [0.02, 0.05, 0.02], box(0.02, 0.05, 0.02), 'Хэлхээгээр гүйдэл гүйж байгааг гэрэлтэж харуулна.', 0.005),
  deskLamp: textbookTool('deskLamp', 'Гэрлийн үүсгүүр', [0.14, 0.3, 0.14], box(0.14, 0.3, 0.14), 'Ургамал, дээжийг тогтмол гэрлээр гэрэлтүүлнэ.', 0.8),
  barometer: textbookTool('barometer', 'Барометр', [0.12, 0.12, 0.04], box(0.12, 0.12, 0.04), 'Агаар, хийн даралтыг хэмжинэ.', 0.4),
  hammer: textbookTool('hammer', 'Алх', [0.11, 0.03, 0.26], box(0.11, 0.03, 0.26), 'Материалын хатуулаг, хэврэгшлийг сорихдоо цохино.', 0.4),
  brush: textbookTool('brush', 'Багс', [0.02, 0.02, 0.2], box(0.02, 0.02, 0.2), 'Хамгаалах будаг, тосыг гадаргуу дээр нимгэн түрхэнэ.', 0.01),
  straw: textbookTool('straw', 'Соруул', [0.008, 0.008, 0.2], cyl(0.004, 0.2), 'Шохойн ус руу амьсгалын хийг үлээж нэвтрүүлнэ.', 0.002),
  ruler: textbookTool('ruler', 'Шугам', [0.035, 0.003, 0.3], box(0.035, 0.003, 0.3), 'Урт, зай, хроматограммын шилжилтийг хэмжинэ.', 0.02),
  pencil: textbookTool('pencil', 'Харандаа', [0.008, 0.008, 0.17], cyl(0.004, 0.17), 'Хроматографын цаасан дээр эхлэх шугам татна; бал уусахгүй.', 0.005),
  balloon: textbookTool('balloon', 'Бөмбөлөг', [0.08, 0.1, 0.08], cyl(0.04, 0.1), 'Үүссэн хийг цуглуулж, эзэлхүүний өөрчлөлтийг харуулна.', 0.003),
  // Porcelain: takes a Bunsen flame (≈700 °C dry), breaks if dropped.
  crucible: { ...textbookTool('crucible', 'Тигль', [0.05, 0.045, 0.05], cyl(0.025, 0.045), 'Хатуу бодисыг хүчтэй халаах шаазан сав.', 0.05), ...holds(25, 40, { glass: true }) },
  trough: { ...textbookTool('trough', 'Том сав (усан онгоц)', [0.3, 0.1, 0.2], box(0.3, 0.1, 0.2), 'Хийг ус түрж хураах, савыг усанд дүрэхэд хэрэглэх өргөн сав.', 0.6), ...holds(5000, 600, { glass: true, pourRate: 25 }) },
  magnet: textbookTool('magnet', 'Соронз', [0.06, 0.012, 0.03], box(0.06, 0.012, 0.03), 'Төмрийн үртэсийг хольцоос ялгана.', 0.05),
  plasticBag: textbookTool('plasticBag', 'Гялгар уут', [0.16, 0.01, 0.2], box(0.16, 0.01, 0.2), 'Хий эсвэл дээжийг битүү хадгалж, ажиглана.', 0.005),
  glassTube: textbookTool('glassTube', 'Шилэн хоолой', [0.014, 0.014, 0.3], cyl(0.007, 0.3), 'Хий, шингэнийг дамжуулах эсвэл диффузийг ажиглах шулуун шилэн хоолой.', 0.03),
  rubberBand: textbookTool('rubberBand', 'Резин', [0.05, 0.006, 0.05], cyl(0.025, 0.006), 'Уут, савны амсрыг битүү боох резинэн бүч.', 0.002),
  wires: textbookTool('wires', 'Холбох утас', [0.12, 0.012, 0.08], box(0.12, 0.012, 0.08), 'Хавчаартай улаан, хар утсаар хэлхээний хэсгүүдийг холбоно.', 0.02),
};

export const CATALOG: Record<EquipmentKind, CatalogEntry> = {
 ...GRADE9_CATALOG,
 ...TEXTBOOK_CATALOG,
 gasCylinder:{kind:'gasCylinder',name:'Хийн баллон ба хаалт',category:'Урвалжийн сав',description:'Шошготой хий. мл-ээр хэмжиж угсралтад дамжуулна.',safety:'Хийг битүү угсралтад дамжуул. Галын эх үүсвэрээс хол байлга.',size:[.06,.18,.06],collider:cyl(.03,.18),pickable:true,spawnable:false,massKg:1,capacityMl:2000,pourRate:20},
 paperStrip:{kind:'paperStrip',name:'Шүүлтүүрийн цаас / хроматографийн зурвас',category:'Багаж',description:'Шүүлтүүрийн целлюлоз цаас. Хроматографийн камерын цаасны үүрэнд байрлуулна.',safety:'Хуурай цэвэр цаас хэрэглэ.',size:[.03,.001,.2],collider:box(.03,.002,.2),pickable:true,spawnable:false,massKg:.001,capacityMl:1,pourRate:.2},
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
    // Stands in its own single-tube stand on a bench (Ø 42 mm foot).
    size: [0.042, 0.152, 0.042],
    collider: box(0.042, 0.152, 0.042),
    pickable: true,
    spawnable: true,
    massKg: 0.06,
    upright: true,
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
    // Narrow stem below a wide cone, so a ring holds it by the cone with the stem through the ring.
    collider: { shape: 'compound', parts: [
      { shape: 'cylinder', radius: 0.014, height: 0.06, offset: [0, 0.03, 0], mass: 0.01 },
      { shape: 'cylinder', radius: 0.035, height: 0.052, offset: [0, 0.086, 0], mass: 0.05 },
    ] },
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

/** A piece on the worktop: its kind, or `kind#n` for the 2nd, 3rd … of the same kind (three beakers). */
export type BenchKey = EquipmentKind | `${EquipmentKind}#${number}`;
export const baseKind = (key: string): EquipmentKind => key.split('#')[0] as EquipmentKind;
export const benchKey = (kind: EquipmentKind, n: number): BenchKey => (n <= 1 ? kind : `${kind}#${n}`);

export const isContainer = (kind: EquipmentKind): boolean => CATALOG[kind].capacityMl !== undefined && kind !== 'spatula';

export const SPAWNABLE_KINDS: EquipmentKind[] = (Object.keys(CATALOG) as EquipmentKind[]).filter((k) => CATALOG[k].spawnable);

/** Containers that are sources only: nothing may be poured back into them. */
export const STOCK_KINDS: EquipmentKind[] = ['gasCylinder', 'reagentBottle', 'dropperBottle', 'reagentJar'];
