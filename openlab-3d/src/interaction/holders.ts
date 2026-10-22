/**
 * Storage: every bench drawer and cabinet, the flammables cabinet and each test-tube rack
 * is a "holder" with a category. A holder's contents are seeded from its category the
 * first time anyone looks inside, then live in the inventory store.
 */
import type { EquipmentKind } from '../equipment/equipmentCatalog';
import { REAGENTS, type ReagentId } from '../chemistry/reagents';
import type { ItemVariant } from '../world/itemsLayout';

export type StorageCategory =
  | 'smallTools'
  | 'glassware'
  | 'heating'
  | 'measuring'
  | 'tubes'
  | 'safety'
  | 'filtration'
  | 'dishes'
  | 'acids'
  | 'bases'
  | 'salts'
  | 'indicators'
  | 'solidSalts'
  | 'metals'
  | 'special'
  | 'waterDyes'
  | 'flammables'
  | 'rack';

export type HolderType = 'drawer' | 'cabinet' | 'rack';

export const STORAGE_INFO: Record<StorageCategory, { label: string; color: string; type: HolderType; hint: string }> = {
  smallTools: { label: 'Жижиг багаж', color: '#64748b', type: 'drawer', hint: 'Спатель, хутгуур, пипетк, хавчаар, нихром утас, pH цаас' },
  glassware: { label: 'Шилэн сав', color: '#0ea5e9', type: 'drawer', hint: 'Химийн аяга, колб, цагийн шил, юүлүүр' },
  heating: { label: 'Халаах', color: '#ea580c', type: 'drawer', hint: 'Гурван хөлт тавиур, ууршуулах аяга, хавчаар' },
  measuring: { label: 'Хэмжих багаж', color: '#7c3aed', type: 'drawer', hint: 'Термометр, хэмжээст цилиндр, хэмжээст колб, pH цаас' },
  tubes: { label: 'Хуруу шил', color: '#0891b2', type: 'drawer', hint: 'Хуруу шил ба тавиур' },
  safety: { label: 'Хамгаалалт', color: '#16a34a', type: 'drawer', hint: 'Хамгаалалтын шил, бээлий' },
  filtration: { label: 'Шүүх, нунтаглах', color: '#a16207', type: 'drawer', hint: 'Юүлүүр, нунтаглуур, хутгуур' },
  dishes: { label: 'Аяга, таваг', color: '#0d9488', type: 'drawer', hint: 'Петрийн аяга, цагийн шил, ууршуулах аяга' },
  acids: { label: 'ХҮЧИЛ', color: '#dc2626', type: 'cabinet', hint: 'HCl, H₂SO₄, CH₃COOH' },
  bases: { label: 'ШҮЛТ', color: '#2563eb', type: 'cabinet', hint: 'NaOH, NH₃, Ca(OH)₂, Na₂CO₃' },
  salts: { label: 'ДАВСНЫ УУСМАЛ', color: '#16a34a', type: 'cabinet', hint: 'NaCl, KCl, CuSO₄, FeCl₃, KI …' },
  indicators: { label: 'ЗААГЧ', color: '#db2777', type: 'cabinet', hint: 'Фенолфталеин, метилоранж, БТЦ, универсаль, цардуул, иод' },
  solidSalts: { label: 'ХАТУУ ДАВС', color: '#78716c', type: 'cabinet', hint: 'NaCl, CuSO₄, сод, гантиг, NH₄NO₃, элсэн чихэр' },
  metals: { label: 'МЕТАЛЛ, ХАТУУ', color: '#475569', type: 'cabinet', hint: 'Zn, Mg, Fe, Cu, MnO₂, KMnO₄, NaOH' },
  special: { label: 'ТУСГАЙ УРВАЛЖ', color: '#7e22ce', type: 'cabinet', hint: 'AgNO₃, Pb(NO₃)₂, KSCN, KMnO₄, H₂O₂, саван' },
  waterDyes: { label: 'УС, БУДАГ', color: '#0284c7', type: 'cabinet', hint: 'Нэрмэл ус, угаалгын сав, хүнсний будаг' },
  flammables: { label: 'ШАТАМХАЙ', color: '#ca8a04', type: 'cabinet', hint: 'Этанол' },
  rack: { label: 'Тавиур', color: '#64748b', type: 'rack', hint: 'Хуруу шил' },
};

export const HOLDER_CAPACITY: Record<HolderType, number> = { drawer: 8, cabinet: 12, rack: 6 };

export interface StoredItem {
  id: string;
  kind: EquipmentKind;
  variant?: ItemVariant;
}

type Entry = [EquipmentKind, ItemVariant?];

const bottle = (id: ReagentId): Entry => [REAGENTS[id].container, { reagent: id }];

const TEMPLATES: Record<StorageCategory, Entry[]> = {
  smallTools: [['spatula'], ['spatula'], ['glassRod'], ['pipette'], ['pipette'], ['testTubeHolder'], ['wireLoop'], ['phPaper']],
  glassware: [['beaker'], ['beaker'], ['beaker'], ['erlenmeyer'], ['erlenmeyer'], ['watchGlass'], ['funnel']],
  heating: [['tripod'], ['evaporatingDish'], ['evaporatingDish'], ['tongs'], ['testTubeHolder']],
  measuring: [['thermometer'], ['thermometer'], ['graduatedCylinder'], ['volumetricFlask'], ['phPaper'], ['pipette']],
  tubes: [['testTubeRack'], ['testTube'], ['testTube'], ['testTube'], ['testTube'], ['testTube'], ['testTube']],
  safety: [['goggles'], ['goggles'], ['gloves'], ['gloves']],
  filtration: [['funnel'], ['funnel'], ['mortar'], ['glassRod'], ['spatula']],
  dishes: [['petriDish'], ['petriDish'], ['watchGlass'], ['watchGlass'], ['evaporatingDish']],
  acids: [bottle('hcl'), bottle('hcl'), bottle('h2so4'), bottle('acetic'), bottle('acetic')],
  bases: [bottle('naoh'), bottle('naoh'), bottle('nh3'), bottle('limewater'), bottle('na2co3')],
  salts: [bottle('nacl'), bottle('kcl'), bottle('licl'), bottle('cacl2'), bottle('bacl2'), bottle('cuso4'), bottle('fecl3'), bottle('feso4'), bottle('znso4'), bottle('na2so4'), bottle('ki')],
  indicators: [bottle('phph'), bottle('btb'), bottle('mo'), bottle('ui'), bottle('starch'), bottle('iodine')],
  solidSalts: [bottle('s_nacl'), bottle('s_cuso4'), bottle('s_cuso4anh'), bottle('s_nahco3'), bottle('s_caco3'), bottle('s_nh4no3'), bottle('s_sugar')],
  metals: [bottle('s_zn'), bottle('s_mg'), bottle('s_fe'), bottle('s_cu'), bottle('s_mno2'), bottle('s_kmno4'), bottle('s_naoh')],
  special: [bottle('agno3'), bottle('pbno3'), bottle('kscn'), bottle('kmno4'), bottle('h2o2'), bottle('soap')],
  waterDyes: [bottle('water'), bottle('water'), ['washBottle', { reagent: 'water' }], bottle('dyeRed'), bottle('dyeYellow'), bottle('dyeGreen'), bottle('dyeBlue')],
  flammables: [bottle('ethanol'), bottle('ethanol'), bottle('ethanol')],
  rack: [['testTube'], ['testTube'], ['testTube'], ['testTube']],
};

const categories = new Map<string, StorageCategory>();
/** Tube fills for racks placed by the layout (by rack item id). */
export const rackSeeds = new Map<string, (ItemVariant | undefined)[]>();
const seeds = new Map<string, StoredItem[]>();

export function registerHolder(id: string, category: StorageCategory): void {
  if (!categories.has(id)) categories.set(id, category);
}

export function holderCategory(id: string): StorageCategory {
  return categories.get(id) ?? (id.endsWith('testTubeRack') ? 'rack' : 'glassware');
}

export function holderType(id: string): HolderType {
  return STORAGE_INFO[holderCategory(id)].type;
}

/** Initial contents of a holder (stable array per id). */
export function seedHolder(id: string): StoredItem[] {
  let list = seeds.get(id);
  if (!list) {
    const category = holderCategory(id);
    if (category === 'rack' && rackSeeds.has(id)) {
      list = (rackSeeds.get(id) ?? []).map((variant, k) => ({ id: `${id}#${k}-testTube`, kind: 'testTube' as const, variant }));
    } else {
      list = TEMPLATES[category].map(([kind, variant], k) => ({ id: `${id}#${k}-${kind}`, kind, variant }));
    }
    seeds.set(id, list);
  }
  return list;
}

const ISLAND_STACKS: StorageCategory[][] = [
  ['smallTools', 'glassware', 'heating'],
  ['measuring', 'tubes', 'dishes'],
  ['safety', 'filtration', 'glassware'],
];
const ISLAND_DOORS: StorageCategory[] = ['acids', 'bases', 'indicators', 'salts', 'solidSalts', 'metals'];

const PLANS: Record<string, { stacks: StorageCategory[][]; doors: StorageCategory[] }> = {
  'chem-n1': { stacks: [['glassware', 'dishes', 'tubes'], ['measuring', 'filtration', 'smallTools']], doors: ['special', 'waterDyes'] },
  'chem-n2': { stacks: [['smallTools', 'glassware', 'safety'], ['dishes', 'tubes', 'heating']], doors: ['salts', 'indicators'] },
  'chem-n3': { stacks: [['glassware', 'measuring', 'filtration'], ['safety', 'dishes', 'tubes']], doors: ['waterDyes'] },
  'chem-n4': { stacks: [['heating', 'smallTools', 'glassware'], ['tubes', 'measuring', 'safety']], doors: ['acids', 'bases'] },
  'chem-w1': { stacks: [['measuring', 'smallTools', 'heating'], ['safety', 'dishes', 'glassware']], doors: ['solidSalts', 'metals'] },
  'chem-w2': { stacks: [['measuring', 'dishes', 'smallTools'], ['glassware', 'filtration', 'tubes']], doors: ['salts', 'special'] },
  'chem-w3': { stacks: [['safety', 'smallTools', 'glassware'], ['heating', 'measuring', 'dishes']], doors: ['indicators', 'acids'] },
  'chem-hood-base': { stacks: [], doors: ['special', 'acids', 'bases'] },
};

/** Category of drawer `level` (0 = top) in the bench's `stack`-th drawer stack, and of its `door`-th cabinet. */
export function benchPlan(benchId: string): { drawer: (stack: number, level: number) => StorageCategory; door: (index: number) => StorageCategory } {
  const plan = PLANS[benchId];
  if (plan) {
    return {
      drawer: (stack, level) => plan.stacks[stack % Math.max(1, plan.stacks.length)]?.[level % 3] ?? 'glassware',
      door: (index) => plan.doors[index % Math.max(1, plan.doors.length)] ?? 'waterDyes',
    };
  }
  return {
    drawer: (stack, level) => ISLAND_STACKS[stack % ISLAND_STACKS.length][level % 3],
    door: (index) => ISLAND_DOORS[index % ISLAND_DOORS.length],
  };
}
