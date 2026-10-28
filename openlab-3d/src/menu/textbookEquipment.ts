import { CATALOG, type EquipmentKind } from '../equipment/equipmentCatalog';
import { collectSupply } from '../experiments/workbench/session';

type EquipmentKinds = EquipmentKind | EquipmentKind[];

const EQUIPMENT_KIND: Record<string, EquipmentKinds> = {
  'шилэн аяга': 'beaker',
  'хуванцар аяга': 'plasticCup',
  'ууршуулагч аяга': 'evaporatingDish',
  'талстжуулагч': 'crystallizingDish',
  'хуруу шил': 'testTube',
  'бөглөөтэй хуруу шил': ['testTube', 'corkStopper'],
  'чанамлын шил': 'testTube',
  'хий дамжуулах хоолой': 'gasDeliveryTube',
  'штатив': 'retortStand',
  'зомгол': 'splint',
  'хуруу шилний тавиур': 'testTubeRack',
  'хэмжээст цилиндр': 'graduatedCylinder',
  'шувтан колбо': 'erlenmeyer',
  'хугацаа хэмжигч': 'stopwatch',
  'техник жин': 'scale',
  'жин': 'scale',
  'термометр': 'thermometer',
  'тигелийн хавчаар': 'tongs',
  'хавчаар': 'testTubeHolder',
  'шилэн савх': 'glassRod',
  'хутгуур': 'glassRod',
  'дусаагуур': 'pipette',
  'тариур': 'syringe',
  'дуслын системийн тохируулагч': 'dripAdjuster',
  'шүүлтүүрийн цаас': 'filterPaper',
  'салфетка': 'tissue',
  'шүүлтүүр': 'waterFilter',
  'юүлүүр': 'funnel',
  'халаагуур': 'bunsenBurner',
  'шөрмөсөн чулуун тор': 'wireGauze',
  'гурван хөлт тавиур': 'tripod',
  'зүлгүүр': 'sandpaper',
  'хөвөн': 'cottonWool',
  'чүдэнз': 'matches',
  'насос': 'handPump',
  'u хэлбэрийн хоолой': 'uTube',
  'хөнгөнцагаан лааз': 'aluminumCan',
  'хутга': 'knife',
  'томруулагч шил': 'magnifyingGlass',
  'цагийн шил': 'watchGlass',
  'хонхортой таваг': 'wellPlate',
  'нэг удаагийн таваг': 'disposableDish',
  'үр суулгах сав': 'seedPot',
  'ундааны сав': 'plasticBottle',
  'хуванцар сав': 'plasticBottle',
  'бөглөө': 'corkStopper',
  'балны таг': 'penCap',
  'баримлын шавар': 'modellingClay',
};

let skipSequence = 0;

/** Put the textbook equipment that has a lab model directly on the shared workbench. */
export function spawnTextbookEquipment(equipment: string[]): string[] {
  const run = ++skipSequence;
  const spawned = new Set<EquipmentKind>();
  const unsupported: string[] = [];

  for (const label of equipment) {
    const key = label.toLocaleLowerCase('mn').replace(/\s+/g, ' ').trim();
    const mapped = EQUIPMENT_KIND[key];
    if (!mapped) {
      unsupported.push(label);
      continue;
    }
    const kinds = Array.isArray(mapped) ? mapped : [mapped];
    for (const kind of kinds) {
      if (spawned.has(kind)) continue;
      spawned.add(kind);
      const item = CATALOG[kind];
      collectSupply({ key: `textbook-skip-${run}-${kind}`, kind, name: item.name, use: item.description });
    }
  }

  return unsupported;
}
