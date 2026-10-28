/**
 * What the 7–10-р ангийн сурах бичиг lists for each experiment, as workbench supplies. Every
 * equipment and substance name in src/data/textbook-experiments maps to lab equipment kinds and
 * stocked reagents, so the bench holds what the book shows (tests/book-supplies.test.mjs checks
 * that no name is left out). A name that is not a thing on the table ("—") maps to nothing.
 * PROCEDURE_TOOLS adds the few tools a procedure needs that its list forgets.
 */
import { CATALOG, type EquipmentKind } from '../../equipment/equipmentCatalog';
import { REAGENTS, type ReagentId } from '../../chemistry/reagents';

export type SupplyRef = EquipmentKind | `reagent:${ReagentId}`;

export const BOOK_EQUIPMENT: Record<string, SupplyRef[]> = {
  'u хэлбэрийн хоолой': ['uTube'], 'алх': ['hammer'], 'амны цаас': ['tissue'], 'аяга': ['beaker'], 'багс': ['brush'],
  'бал чулуун электрод': ['electrode', 'reagent:s_graphite'], 'балны таг': ['penCap'], 'баримлын шавар': ['modellingClay'], 'барометр': ['barometer'],
  'битүү шилэн сав': ['equilibriumCell'], 'бодисын халбага': ['spatula'], 'бэхлүүр': ['retortStand'], 'бюретка': ['burette'],
  'бөглөө': ['corkStopper'], 'бөглөөтэй хуруу шил': ['testTube', 'corkStopper'], 'бөмбөлөг': ['balloon'], 'ватум цаас': ['filterPaper'],
  'вольтметр': ['voltmeter'], 'галд тэсвэртэй хуруу шил': ['testTube'], 'гурван хөлт тавиур': ['tripod'], 'гэрлийн үүсгүүр': ['deskLamp'],
  'гэрлэн диод': ['led'], 'гялгар уут': ['plasticBag'], 'гялгар цаас': ['plasticBag'], 'гүйдэл үүсгэгч': ['powerSupply'],
  'дусаагуур': ['pipette'], 'дуслын системийн тохируулагч': ['dripAdjuster'], 'жин': ['scale'], 'зомгол': ['splint'], 'зүлгүүр': ['sandpaper'],
  'индикаторын цаас': ['phPaper'], 'колбо': ['erlenmeyer'], 'кофены шүүлтүүр': ['filterPaper'], 'мөс': ['reagent:s_ice'],
  'мөсөн банн': ['beaker', 'reagent:s_ice'], 'насос': ['handPump'], 'нихром утас': ['wireLoop'], 'нэг удаагийн таваг': ['disposableDish'],
  'пипетка': ['pipette'], 'резин': ['rubberBand'], 'резинэн бөглөө': ['corkStopper'], 'резинэн хоолой': ['gasDeliveryTube'], 'сав': ['beaker'],
  'салфетка': ['tissue'], 'секундомер': ['stopwatch'], 'сонины цаас': ['filterPaper'], 'соронз': ['magnet'], 'соруул': ['straw'],
  'спиртэн дэн': ['alcoholLamp'], 'тавиур': ['testTubeRack'], 'талстжуулагч': ['crystallizingDish'], 'тариур': ['syringe'],
  'термометр': ['thermometer'], 'техник жин': ['scale'], 'тигелийн хавчаар': ['tongs'], 'тигль': ['crucible'], 'том сав': ['trough'],
  'томруулагч шил': ['magnifyingGlass'], 'төмөр сав': ['aluminumCan'], 'ундааны сав': ['plasticBottle'], 'усан банн': ['beaker'], 'утас': ['wires'],
  'ууршуулагч аяга': ['evaporatingDish'], 'хавтгай сав': ['petriDish'], 'хавчаар': ['testTubeHolder'], 'халаагуур': ['bunsenBurner'],
  'халбага': ['spatula'], 'халуун ус': ['reagent:hot_water'], 'харандаа': ['pencil'], 'хий дамжуулах хоолой': ['gasDeliveryTube'],
  'хий хураах багаж': ['gasTrain'], 'хийн тариур': ['syringe'], 'холигч': ['glassRod'], 'хонхортой таваг': ['wellPlate'],
  'хонхорхойтой хавтан': ['wellPlate'], 'хроматографын цаас': ['reagent:s_paper'], 'хуванцар аяга': ['plasticCup'], 'хуванцар сав': ['plasticBottle'],
  'хугацаа хэмжигч': ['stopwatch'], 'хуруу шил': ['testTube'], 'хуруу шилний тавиур': ['testTubeRack'], 'хутга': ['knife'], 'хутгуур': ['glassRod'],
  'хэмжээст аяга': ['beaker'], 'хэмжээст цилиндр': ['graduatedCylinder'], 'хэсэгчилсэн нэрлэгийн багана': ['oilColumn'], 'хямсаа': ['tongs'],
  'хөвөн': ['cottonWool'], 'хөлдөөгч': ['phaseBath'], 'хөнгөнцагаан лааз': ['aluminumCan'], 'цаас': ['filterPaper'],
  'цаасан аяга': ['plasticCup'], 'цаг': ['stopwatch'], 'цагариг': ['retortStand'], 'цагийн шил': ['watchGlass'], 'цахилгаан хэлхээ': ['conductivityTester'],
  'цахилгаан үүсгүүр': ['powerSupply'], 'цилиндр': ['graduatedCylinder'], 'чанамлын шил': ['testTube'], 'чийдэн': ['conductivityTester'],
  'чүдэнз': ['matches'], 'шаазан аяга': ['evaporatingDish'], 'шаар': ['balloon'], 'шатаах халбага': ['spatula'], 'шахмал эмийн сав': ['plasticBottle'],
  'шилэн аяга': ['beaker'], 'шилэн савх': ['glassRod'], 'шилэн хавтан': ['watchGlass'], 'шилэн хоолой': ['glassTube'], 'штатив': ['retortStand'],
  'шувтан колбо': ['erlenmeyer'], 'шугам': ['ruler'], 'шүүлтүүр': ['waterFilter'], 'шүүлтүүрийн цаас': ['filterPaper'],
  'шөрмөсөн чулуун тор': ['wireGauze'], 'электрод': ['electrode', 'reagent:s_graphite'], 'юүлүүр': ['funnel'], 'үр суулгах сав': ['seedPot'], '—': [],
};

const r = (...ids: ReagentId[]): SupplyRef[] => ids.map((id) => `reagent:${id}` as SupplyRef);

export const BOOK_SUBSTANCES: Record<string, SupplyRef[]> = {
  'ус': r('water'), 'нэрмэл ус': r('water'), 'халуун ус': r('hot_water'), 'мөс': r('s_ice'), 'крантны ус': r('tap_water'), 'голын ус': r('river_water'),
  'бохирдсон ус': r('dirty_water'), 'агаар': r('gas_air'), 'устөрөгч': r('gas_h2'), 'нүүрсхүчлийн хий': r('gas_co2'), 'азотын диоксид': r('gas_no2'),
  'азотын тетроксид': r('gas_n2o4'), 'алкен': r('gas_ethene'), 'агааржуулагч': r('gas_tracer'),
  'давсны хүчил': r('hcl'), 'давсны хүчил (өтгөрүүлсэн)': r('hcl_conc'), 'хүчил': r('hcl'), 'хүхрийн хүчил': r('h2so4'),
  'хүхрийн хүчил (концентрацтай)': r('h2so4_conc'), 'азотын хүчил': r('hno3'), 'этаны хүчил': r('acetic'), 'цууны хүчил': r('acetic'), 'цуу': r('acetic'),
  'нимбэгний хүчил': r('s_citric'), 'бензойны хүчил': r('s_benzoic'),
  'натрийн гидроксид': r('naoh'), 'суурь': r('naoh'), 'калийн гидроксид': r('koh'), 'аммиакийн уусмал': r('nh3'), 'аммиакийн ус': r('nh3'),
  'аммиакийн уусмал (өтгөрүүлсэн)': r('nh3_conc'), 'шохойн ус': r('limewater'), 'магнийн гидроксид': r('s_mgoh2'),
  'универсал индикатор': r('ui'), 'фенолфталейн': r('phph'), 'метилоранж': r('mo'), 'лакмус': r('s_litmus_red', 's_litmus_blue'),
  'лакмусын цаас': r('s_litmus_red', 's_litmus_blue'), 'лакмусын цаас (улаан, хөх)': r('s_litmus_red', 's_litmus_blue'), 'индикаторын цаас': ['phPaper'],
  'кобальтын хлоридын цаас': r('s_cocl2anh'),
  'хоолны давс': r('s_nacl'), 'натрийн хлорид': r('nacl'), 'натрийн хлоридын уусмал': r('nacl'), 'зэврүүлэгч уусмал': r('nacl'), 'калийн хлорид': r('kcl'),
  'литийн хлорид': r('licl'), 'рубидийн хлорид': r('rbcl'), 'кальцийн хлорид': r('cacl2'), 'стронцийн хлорид': r('srcl2'), 'барийн хлорид': r('bacl2'),
  'зэсийн хлорид': r('cucl2'), 'хөнгөнцагааны хлорид': r('alcl3'), 'аммонийн хлорид': r('s_nh4cl'), 'кобальтын (ii) хлорид': r('cocl2'),
  'төмрийн (iii) хлорид': r('fecl3'), 'зэсийн (ii) сульфат': r('cuso4'), 'зэсийн сульфат': r('cuso4'), 'төмрийн (ii) сульфат': r('feso4'),
  'төмрийн сульфат': r('feso4'), 'хөнгөнцагааны сульфат': r('al2so4'), 'мөнгөний нитрат': r('agno3'), 'зэсийн нитрат': r('cuno3'),
  'магнийн нитрат': r('mgno3'), 'кальцийн нитрат': r('cano3'), 'цайрын нитрат': r('znno3'), 'хартугалганы нитрат': r('pbno3'), 'калийн нитрат': r('s_kno3'),
  'натрийн карбонат': r('na2co3'), 'кальцийн карбонат': r('s_caco3'), 'шохойн чулуу': r('s_caco3'), 'зэсийн карбонат': r('s_cuco3'),
  'зэсийн (ii) карбонат': r('s_cuco3'), 'хүнсний сод': r('s_nahco3'), 'натрийн гидрокарбонат': r('s_nahco3'), 'калийн иодид': r('ki'), 'калийн бромид': r('kbr'),
  'калийн перманганат': r('kmno4'), 'өнгөт талст бодис': r('s_kmno4'), 'калийн дихромат': r('dichromate'), 'натрийн хромат': r('na2cro4'),
  'зэсийн (ii) хромат': r('cu_chromate'), 'натрийн тиосульфат': r('thiosulfate'), 'үл мэдэгдэх давс': r('unknown_salt'),
  'зэсийн давс': r('cuso4'), 'кадмийн давс': r('cdso4'), 'хартугалганы давс': r('pbno3'), 'никелийн давс': r('niso4'), 'хартугалганы бромид': r('s_pbbr2'),
  'хлорын ус': r('chlorine'), 'бромын ус': r('bromine'), 'иодын ус': r('iodine'), 'иод': r('s_iodine'),
  'устөрөгчийн хэт исэл': r('h2o2'), 'устөрөгчийн пероксид': r('h2o2'), 'манганы диоксид': r('s_mno2'),
  'зэсийн оксид': r('s_cuo'), 'зэсийн (ii) оксид': r('s_cuo'), 'цайрын оксид': r('s_zno'), 'төмрийн (iii) оксид': r('s_fe2o3'),
  'хартугалганы диоксид': r('s_pbo2'), 'төмрийн (ii) сульфид': r('s_fes'),
  'магни': r('s_mg'), 'цайр': r('s_zn'), 'зэс': r('s_cu'), 'төмөр': r('s_fe'), 'төмрийн үртэс': r('s_fe'), 'хөнгөнцагаан': r('s_al'), 'кальци': r('s_ca'),
  'хартугалга': r('s_pb'), 'никель': r('s_nickel'), 'мөнгө': r('s_silver'), 'хүхэр': r('s_s'), 'фосфор': r('s_p'), 'нүүрстөрөгч': r('s_graphite'),
  'цахиур': r('s_si'), 'ялгаатай металл зоос': r('s_cu', 's_zn'),
  'төмөр хадаас': r('s_iron_nails'), 'ган хадаас': r('s_steel_nails'), 'цайраар бүрсэн хадаас': r('s_galvanized_nails'), 'төмөр эдлэл': r('s_iron_item'),
  'спирт': r('ethanol'), 'этанол': r('ethanol'), 'ацетон': r('acetone'), 'уусгагч': r('ethanol'), 'циклогексан': r('cyclohexane'),
  'гексаметилендиамин': r('diamine'), 'себакоилхлорид': r('sebacoyl'), 'газрын тос': r('crude_oil'), 'газрын тосны фракцууд': r('hexane', 'octane', 'decane'),
  'бензин': r('octane'), 'хөдөлгүүрийн тос': r('motor_oil'), 'тос': r('oil'), 'тосоол': r('oil'), 'ургамлын тос': r('veg_oil'), 'парафины тос': r('paraffin_oil'),
  'парафин': r('s_wax'), 'лаа': r('s_wax'), 'вазелин': r('s_vaseline'), 'будаг': r('paint'), 'хүнсний будаг': r('dyeRed'), 'будагч бодис': r('inkA', 'inkB'),
  'хар маркер': r('inkA'), 'сахар': r('s_sugar'), 'ёотон': r('s_sugar'), 'сахарын уусмал': r('sugar_solution'), 'эрдэнэ шишийн сироп': r('corn_syrup'),
  'цардуул': r('starch'), 'шүлс (амилаза)': r('amylase'), 'исгэгч': r('s_yeast'), 'желатин': r('s_gelatin'), 'аспирин упса': r('s_aspirin'),
  'савангийн уусмал': r('soap'), 'саван': r('soap'), 'угаагч шингэн': r('soap'), 'угаагч нунтаг': r('s_detergent'),
  'сүү': r('milk'), 'алимны шүүс': r('apple_juice'), 'жүржийн шүүс': r('orange_juice'), 'нимбэгний шүүс': r('lemon'), 'улаан лоолийн шүүс': r('tomato'),
  'вино': r('wine'), 'кола': r('cola'), 'алим': r('s_apple'), 'нимбэг': r('s_lemon'), 'жүрж': r('s_orange'), 'төмс': r('s_potato'), 'шинэхэн элэг': r('s_liver'),
  'ургамлын үр': r('s_seeds'), 'эрдэнэшишийн үр': r('s_corn_seeds'), 'арвайн үр': r('s_barley'), 'усны ургамал': r('s_pondweed'), 'тамхи': r('s_tobacco'),
  'элс': r('s_sand'), 'хайрга': r('s_gravel'), 'жижиг чулуу': r('s_pebbles'), 'ердийн хөрс': r('soil_loam'), 'шаварлаг хөрс': r('soil_clay'),
  'элсэрхэг хөрс': r('soil_sandy'), 'модны нүүрс': r('s_charcoal'), 'идэвхжүүлсэн нүүрс': r('s_activated_carbon'), 'шаазангийн хэлтэрхий': r('s_alumina'),
  'эрдэс хөвөн': r('s_mineral_wool'), 'эрдсийн хөвөн': r('s_mineral_wool'),
  // Objects the book lists among the substances.
  'цаас': r('s_paper'), 'мод': ['splint'], 'чүдэнз': ['matches'], 'баримлын шавар': ['modellingClay'], 'гал тогооны цаас': ['tissue'], 'амны цаас': ['tissue'],
};

/** One textbook word meaning different things in different experiments. */
const OVERRIDES: Record<string, Record<string, SupplyRef[]>> = {
  // «Тавиур» holds the beaker over the lamp here (a test-tube rack everywhere else).
  '9-23': { 'тавиур': ['tripod'] },
};

/** A lamp on a tripod and gauze: heats a beaker, dish or flask. */
const HEAT: SupplyRef[] = ['alcoholLamp', 'tripod', 'wireGauze'];

/**
 * Tools the procedure uses but the book's list leaves out, where the linked lab guide has no
 * rig that does it either (refluxBath, opticalBench and soilBench heat or filter themselves).
 * Experiments without a lab guide get the working rig for their process (electrolysis, a
 * thermostat bath, cracking, gas collection), so they can actually be carried out.
 */
export const PROCEDURE_TOOLS: Record<string, SupplyRef[]> = {
  '7-12': ['gasTrain'], // Хий үүсгэж, агаарыг шахан хураана
  '7-13': ['electrolysisCell'], // «Давсыг хайлуулж … цахилгаан гүйдэл»: the cell heats and electrolyses
  '7-14': ['electrolysisCell'], // Давсны уусмалын электролиз → хлор
  '7-18': [...HEAT, 'evaporatingDish'], // «Шүүгдсэн уусмалыг ууршуулж»
  '7-23': [...HEAT, 'evaporatingDish'], // «уусмалыг ууршуулж»
  '7-29': ['alcoholLamp', 'spatula'], // «төмрийн үртсийг шатааж үз»
  '7-30': ['exposureRack'], // давстай ус, хүчил, халуун усанд зэврэлтийг харьцуулна
  '8-14': ['scale'], // «2 г … жинлэж ав»
  '8-17': ['funnel', 'filterPaper'], // «Катализаторыг шүүж»
  '9-07': ['scale'], // «5 г жинлэж»
  '9-12': [...HEAT], // «шувтан колбонд хийж халаа»
  '10-20': ['electrolysisCell'], // Хайлмал PbBr₂ (373 °C) — the cell heats to 400 °C
  '10-21': ['electrolysisCell'], // 2HCl → H₂ + Cl₂
  '10-24': ['combustionFurnace'], // Халсан CuO дээгүүр H₂ нэвтрүүлнэ: the furnace holds the gas hot
  '10-35': ['crackingTube'], // Парафиныг катализатор дээр задлах
};

export interface BookSupply { key: string; name: string; use: string; kind?: EquipmentKind; reagent?: ReagentId }

export const normalizeName = (name: string): string => name.toLocaleLowerCase('mn').replace(/\s+/g, ' ').trim();

/** Same keys as the workbench recipes (session.ts), so the two lists merge without duplicates. */
export function supplyOf(ref: SupplyRef): BookSupply {
  if (ref.startsWith('reagent:')) {
    const id = ref.slice(8) as ReagentId;
    return { key: `reagent-${id}`, reagent: id, kind: REAGENTS[id].container, name: REAGENTS[id].name, use: REAGENTS[id].note };
  }
  const kind = ref as EquipmentKind;
  return { key: kind, kind, name: CATALOG[kind].name, use: CATALOG[kind].description };
}

/** Everything one textbook experiment needs on the bench, and any name that has no mapping. */
export function bookSupplies(experiment: { id: string; equipment: string[]; substances: string[] }): { supplies: BookSupply[]; unmatched: string[] } {
  const supplies = new Map<string, BookSupply>();
  const unmatched: string[] = [];
  const put = (refs: SupplyRef[]) => {
    for (const ref of refs) {
      const supply = supplyOf(ref);
      if (!supplies.has(supply.key)) supplies.set(supply.key, supply);
    }
  };
  const add = (names: string[], table: Record<string, SupplyRef[]>) => {
    for (const name of names) {
      const key = normalizeName(name);
      const refs = OVERRIDES[experiment.id]?.[key] ?? table[key];
      if (refs) put(refs);
      else unmatched.push(name);
    }
  };
  add(experiment.equipment, BOOK_EQUIPMENT);
  put(PROCEDURE_TOOLS[experiment.id] ?? []);
  add(experiment.substances, BOOK_SUBSTANCES);
  return { supplies: [...supplies.values()], unmatched };
}

/**
 * The textbook experiment started from the menu. Its supplies join the lab guide's own recipe
 * (suppliesFor in session.ts) while that guide is the active one.
 */
let launched: { labId: string | null; supplies: BookSupply[] } = { labId: null, supplies: [] };
export function setLaunchedBook(labId: string | null, supplies: BookSupply[]): void {
  launched = { labId, supplies };
}
export function launchedBookSupplies(labId: string | null): BookSupply[] {
  return labId && launched.labId === labId ? launched.supplies : [];
}
