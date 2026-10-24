import {useGrade9Apparatus} from '../grade9/store';
import { clearInquiry } from './inquiry-store';
import { INVESTIGATIONS } from '../../../../src/lib/textbook-investigations';
import { clearMeasurements } from '../../lab/measurements';
import { co2Until, coverUntil, stirUntil, heldHeat } from '../../interaction/actions';
import { clearExperimentFeedback } from '../../lab/announcer';
import { endHeldUse } from '../../interaction/useHeld';
import { forget } from '../../lab/observe';
import { vesselFx } from '../../lab/vesselFx';
import { useExperimentStore } from '../../store/useExperimentStore';
import { resetPresentation } from '../../lab/presentation';
/** Bench preparation and selection. Session objects remain in the shared room. */
import { create } from 'zustand';
import { Box3, Quaternion, Vector3 } from 'three';
import { CATALOG, SPAWNABLE_KINDS, type EquipmentKind } from '../../equipment/equipmentCatalog';
import { REAGENTS, REAGENT_LIST, type ReagentId } from '../../chemistry/reagents';
import { reagentColor } from '../../chemistry/real-color';
import { experimentDone, useLabStore } from '../../store/useLabStore';
import { storedIn, useInventoryStore } from '../../store/useInventoryStore';
import { useChemStore } from '../../store/useChemStore';
import { useGameStore } from '../../store/useGameStore';
import { solidMassG } from '../../chemistry/mixture';
import { bodies, livePose } from '../../interaction/bodies';
import { benchView, useBenchView } from '../nacl/view';
import { stock, type WorldItem } from '../../world/itemsLayout';
import { BENCH_HEIGHT } from '../../utils/constants';
import { bench } from '../nacl/bench';
import { LABEL_KEYS, NAMES, USES, SUBSTANCES, type PartKey } from '../nacl/data';
import { warn, heldObjectId, partKey, useSandbox, resetSandbox } from '../nacl/sandbox';
import { interactables, isVisibleInScene } from '../../interaction/registry';
import { restoreScenePortable, usePortableStore } from '../../interaction/portable';
import { clearReactionViews } from '../../lab/reaction-view';
import { sounds } from '../../utils/sounds';
import { isWorkbenchPosition,grade9SupplyPosition } from './placement';

export interface BenchSupply { key: string; name: string; use: string; kind?: EquipmentKind; reagent?: ReagentId; part?: PartKey }
const apparatus = (kind: EquipmentKind): BenchSupply => ({ key: kind, kind, name: CATALOG[kind].name, use: CATALOG[kind].description });
const reagent = (id: ReagentId): BenchSupply => ({ key: `reagent-${id}`, reagent: id, kind: REAGENTS[id].container, name: REAGENTS[id].name, use: REAGENTS[id].note });
const list = (kinds: EquipmentKind[], reagents: ReagentId[] = []) => [...kinds.map(apparatus), ...reagents.map(reagent)];
export const NACL_SUPPLIES = LABEL_KEYS.map((part): BenchSupply => ({ key: `nacl-${part}`, part, name: NAMES[part], use: USES[part] }));
/** Executable apparatus lists complement the existing human-readable JSON materials. */
const RECIPES: Record<string, BenchSupply[]> = {
  ...Object.fromEntries(INVESTIGATIONS.map((x) => [x.id, x.supplies.map((s) => s.startsWith('reagent:') ? reagent(s.slice(8) as ReagentId) : apparatus(s as EquipmentKind))])),
  nacl: NACL_SUPPLIES,
  safety: list(['goggles', 'gloves', 'fireExtinguisher']),
  boil: list(['beaker', 'bunsenBurner', 'tripod', 'thermometer'], ['water']),
  indicators: list(['beaker', 'phPaper'], ['hcl', 'naoh', 'acetic', 'mo', 'phph', 'ui']),
  titration: list(['burette', 'erlenmeyer'], ['hcl', 'naoh', 'phph']),
  precipitates: list(['beaker', 'funnel'], ['cuso4', 'fecl3', 'feso4', 'nacl', 'naoh', 'agno3', 'bacl2']),
  gases: list(['beaker', 'spatula'], ['s_nahco3', 's_caco3', 's_zn', 's_mg', 'acetic', 'hcl']),
  metals: list(['beaker', 'spatula'], ['s_fe', 's_cu', 'cuso4', 'agno3']),
  flame: list(['wireLoop', 'bunsenBurner', 'beaker'], ['nacl', 'kcl', 'licl', 'cacl2', 'cuso4', 'hcl']),
  crystals: list(['evaporatingDish', 'tripod', 'bunsenBurner'], ['nacl']),
  cuso4: list(['evaporatingDish', 'tripod', 'bunsenBurner'], ['s_cuso4', 'water']),
  elephant: list(['graduatedCylinder'], ['h2o2', 'soap', 'ki']),
  'color-tests': list(['beaker'], ['starch', 'iodine', 'fecl3', 'kscn', 'cuso4', 'nh3']),
  thermo: list(['beaker', 'thermometer', 'glassRod', 'spatula'], ['s_nh4no3', 's_naoh', 'water']),
  fire: list(['evaporatingDish', 'tripod', 'bunsenBurner', 'watchGlass', 'fireExtinguisher'], ['ethanol']),
};
export const suppliesFor = (id: string | null) => id ? RECIPES[id] ?? [] : [];
export const supplySubstance = (supply: BenchSupply) => supply.part === 'bottle' ? SUBSTANCES.hcl : supply.part === 'jar' ? SUBSTANCES.na2co3 : supply.part === 'lamp' ? SUBSTANCES.ethanol : null;
export interface BenchSession { found: string[]; placed: string[]; owned: string[]; teacher: boolean; objects: Record<string, string>; ready: boolean; previouslyComplete?: boolean; stepOverride: number | null }
export interface SupplyItem { id: string; kind?: EquipmentKind; reagent?: ReagentId; part?: PartKey }
export const PART_KINDS: Partial<Record<PartKey, EquipmentKind>> = { bottle: 'reagentBottle', cyl: 'graduatedCylinder', beaker: 'beaker', spat: 'spatula', rod: 'glassRod', funnel: 'funnel', flask: 'erlenmeyer', dish: 'evaporatingDish', tripod: 'tripod', waste: 'beaker', watch: 'watchGlass' };
export const ALL_SUPPLIES: BenchSupply[] = [
  ...NACL_SUPPLIES,
  ...SPAWNABLE_KINDS.filter((kind) => !['reagentBottle', 'dropperBottle', 'reagentJar'].includes(kind)).map(apparatus),
  ...REAGENT_LIST.map((r) => reagent(r.id)),
];
export const useWorkbench = create<{
  sessions: Record<string, BenchSession>; drawer: boolean;
  loose: Record<string, string>; availableParts: PartKey[];
}>()(() => ({ sessions: {}, drawer: false, loose: {}, availableParts: [] }));
// Capture inventory origins before pickup removes the world/holder entry. Scene-owned
// meshes use portable.ts's original transform; spawned stock has no room origin.
const origins = new Map<string, { world?: WorldItem; holder?: string; item?: { id: string; kind: EquipmentKind; variant?: WorldItem['variant'] } }>();
let cleaning = false;
const picked = new Map<string, SupplyItem>();
let focusTicket = 0;
export function currentSession() { const id = useLabStore.getState().active; return id ? useWorkbench.getState().sessions[id] : undefined; }
export function beginPreparation() {
  const id = useLabStore.getState().active;
  if (!id || useWorkbench.getState().sessions[id]) return;
  useWorkbench.setState((s) => ({ sessions: { ...s.sessions, [id]: { found: [], placed: [], owned: [], teacher: false, objects: {}, ready: suppliesFor(id).length === 0, previouslyComplete: experimentDone(useLabStore.getState().progress, id), stepOverride: null } } }));
}
export function matchesSupply(supply: BenchSupply, item: SupplyItem): boolean {
  if (supply.part) {
    if (supply.part === item.part) return true;
    if (supply.part === 'bottle') return item.reagent === 'hcl';
    // The station needs solid carbonate, not the room's 0.5 M carbonate solution.
    if (supply.part === 'jar') return false;
    return !!PART_KINDS[supply.part] && PART_KINDS[supply.part] === item.kind && !item.reagent;
  }
  return supply.reagent ? supply.reagent === item.reagent : supply.kind === item.kind;
}
export function itemDescription(id: string): SupplyItem {
  const inv = useInventoryStore.getState();
  const item = inv.held?.id === id ? inv.held : inv.worldItems.find((w) => w.id === id);
  const target = interactables.get(id)?.useTarget;
  const key = partKey(id);
  return { id, kind: item?.kind ?? (target?.type === 'item' ? target.kind : interactables.get(id)?.inspectKind), reagent: item?.variant?.reagent ?? (target?.type === 'item' ? target.variant?.reagent : undefined), part: key ?? undefined };
}
export function itemPosition(id: string): Vector3 {
  const key = partKey(id);
  if (key && bench.engine) return bench.engine.partPosition(key);
  const inv = useInventoryStore.getState();
  if (inv.held?.id === id) return benchView.heldObject()?.getWorldPosition(new Vector3()) ?? new Vector3(999, 999, 999);
  const w = inv.worldItems.find((w) => w.id === id);
  if (w) { const p = livePose(w); return new Vector3(p.x, p.y, p.z); }
  const object = interactables.get(id)?.object;
  if (!object) return new Vector3(999, 999, 999);
  // Shelf meshes carry their offset inside an unpositioned Interactable group.
  // Its origin is therefore not the glassware's actual bottom, even after carrying.
  const box = new Box3().setFromObject(object);
  return box.isEmpty() ? object.getWorldPosition(new Vector3()) : box.getCenter(new Vector3()).setY(box.min.y);
}
export function onWorkbench(at: { x: number; y: number; z: number }): boolean {
  return isWorkbenchPosition(at, BENCH_HEIGHT);
}
function exists(id: string): boolean {
  const inv=useInventoryStore.getState();
  if(id.startsWith('spawn-'))return inv.held?.id===id||inv.worldItems.some(w=>w.id===id)||Object.values(inv.storage).some(items=>items.some(item=>item.id===id));
  return !!partKey(id) || useInventoryStore.getState().held?.id === id || useInventoryStore.getState().worldItems.some((w) => w.id === id) || interactables.has(id);
}
export function supplyObject(supply: BenchSupply): string | null {
  const state = useWorkbench.getState();
  const known = currentSession()?.objects[supply.key] ?? state.loose[supply.key];
  if (known && exists(known)) return known;
  const world = useInventoryStore.getState().worldItems.find((w) => matchesSupply(supply, itemDescription(w.id)) && onWorkbench(itemPosition(w.id)));
  if (world) return world.id;
  for (const entry of interactables.values()) if (exists(entry.id) && entry.enabled && matchesSupply(supply, itemDescription(entry.id)) && onWorkbench(itemPosition(entry.id)) && isVisibleInScene(entry.object)) return entry.id;
  return null;
}
/** A card can always add stock. Merely spawning it does NOT complete preparation. */
export function collectSupply(supply: BenchSupply, pickup = false): boolean {
  beginPreparation();
  const required = suppliesFor(useLabStore.getState().active);
  const wrong = !!currentSession() && !currentSession()!.ready && !required.some((r) => r.key === supply.key || matchesSupply(r, { id: supply.key, kind: supply.kind, reagent: supply.reagent, part: supply.part }));
  let id = supplyObject(supply);
  if (!id) {
    if (supply.part) {
      id = `nacl-${supply.part}`;
      useWorkbench.setState((s) => ({ availableParts: [...new Set([...s.availableParts, supply.part!])] }));
      updateStationVisibility();
    } else if (supply.kind) {
      const occupied = [...new Set(Object.values(useWorkbench.getState().loose))].length;
      const grade9=INVESTIGATIONS.find(x=>x.id===useLabStore.getState().active)?.grade===9;
      const slot = grade9?Math.max(0,required.findIndex(s=>s.key===supply.key)):occupied % 24;
      id = useInventoryStore.getState().spawn(supply.kind, grade9?grade9SupplyPosition(slot):[7.56 + slot % 8 * .19, BENCH_HEIGHT + .015, -14.78 + Math.floor(slot / 8) * .22], 0, supply.reagent ? stock(supply.reagent) : undefined);
    }
    if (!id) { warn('Ширээнд зай хүрэхгүй байна. Нэг хэрэгслээ хураагаад дахин сонго.'); return false; }
    useWorkbench.setState((s) => ({ loose: { ...s.loose, [supply.key]: id! } }));
    warn(wrong ? 'Энэ туршилтад хэрэггүй. Чөлөөтэй ашиглаж болно.' : `${supply.name} гаргалаа. Авмагц ✓ олдлоо, тавихад ✓ ширээнд болно.`);
  } else warn(wrong ? 'Энэ туршилтад хэрэггүй. Чөлөөтэй ашиглаж болно.' : `${supply.name} энд байна. Авч, ширээнд тавиарай.`);
  const activeId = useLabStore.getState().active;
  if (activeId) useWorkbench.setState((s) => {const session=s.sessions[activeId];return session ? {sessions:{...s.sessions,[activeId]:{...session,owned:[...new Set([...(session.owned??[]),id!])]}}} : s;});
  // Inventory spawning commits before the R3F Interactable layout effect registers.
  // Keep selection visible without changing the student’s camera position.
  const selected = id, ticket = ++focusTicket, deadline = performance.now() + 3000;
  if (pickup && !heldObjectId() && useInventoryStore.getState().worldItems.some((w) => w.id === selected)) useInventoryStore.getState().pickUp(selected);
  const frame = () => {
    if (ticket !== focusTicket) return;
    if (pickup && !heldObjectId()) interactables.get(selected)?.onGrab?.();
    if (useGameStore.getState().mode !== 'bench' || heldObjectId() === selected) return;
    if (interactables.has(selected) || partKey(selected)) useBenchView.setState({ selected });
    else if (performance.now() < deadline) requestAnimationFrame(frame);
  };
  useSandbox.setState({ inspected: selected });
  useBenchView.setState({ selected });
  requestAnimationFrame(frame);
  return true;
}
export function recordBenchPlacement(item: SupplyItem, at: { x: number; y: number; z: number }, teacher = false): void {
  const active = useLabStore.getState().active;
  const session = currentSession();
  if (!active || !session || cleaning || !onWorkbench(at) || (!teacher && !picked.has(item.id))) return;
  const required = suppliesFor(active);
  const supply = required.find((s) => matchesSupply(s, item));
  if (!supply) { warn('Энэ туршилтад хэрэггүй. Тавихыг хориглоогүй.'); return; }
  const objects = { ...session.objects, [supply.key]: item.id };
  const found = [...new Set([...session.found, supply.key])];
  const placed = [...new Set([...session.placed, supply.key])];
  const ready = session.ready || required.every((r) => placed.includes(r.key) && onWorkbench(r.key === supply.key ? at : itemPosition(objects[r.key])) && heldObjectId() !== objects[r.key]);
  useWorkbench.setState((s) => ({ sessions: { ...s.sessions, [active]: { ...session, found, placed, objects, ready } } }));
  useSandbox.setState((s) => ({ participants: [...new Set([...s.participants, item.id])] }));
  warn(ready && !session.ready ? 'Бэлтгэл дууслаа. Эхний алхмаа эхлүүлээрэй.' : `${supply.name} · ✓ ширээнд`);
  if (ready && !session.ready) { sounds.play('success', .6); useGameStore.getState().say('Хэрэгтэй бүх зүйл ширээн дээр бэлэн боллоо. Эхний алхмаа эхлүүлээрэй.', 'happy'); }
}
function notePickup(item: SupplyItem) {
  if (cleaning) return;
  picked.set(item.id, item);
  beginPreparation();
  const active = useLabStore.getState().active, session = currentSession();
  if (!active || !session) return;
  const required = suppliesFor(active), supply = required.find((r) => matchesSupply(r, item));
  if (!supply) { useWorkbench.setState((s)=>({sessions:{...s.sessions,[active]:{...session,owned:[...new Set([...(session.owned??[]),item.id])]}}})); warn('Энэ туршилтад хэрэггүй. Чөлөөтэй ашиглаж болно.'); return; }
  const fresh = !session.found.includes(supply.key);
  const found = fresh ? [...session.found, supply.key] : session.found;
  const placed = session.placed.filter((key) => key !== supply.key && session.objects[key] !== item.id);
  useWorkbench.setState((s) => ({ sessions: { ...s.sessions, [active]: { ...session, found, placed, owned: [...new Set([...(session.owned??[]),item.id])], objects: { ...session.objects, [supply.key]: item.id } } } }));
  if (fresh) {
    sounds.play('tick', .8);
    useGameStore.getState().showToast(`✓ ${supply.name} олдлоо (${found.length}/${required.length})`, 'Ажлын ширээнд тавихад ✓ ширээнд болно.');
  }
}
export function startWorkbenchTracking(): () => void {
  beginPreparation();
  const a = useInventoryStore.subscribe((s, previous) => {
    if (s.held && s.held.id !== previous.held?.id && !cleaning) {
      const id = s.held.id;
      if (!origins.has(id) && !id.startsWith('spawn-')) {
        const world = previous.worldItems.find((w) => w.id === id);
        if (world) origins.set(id, { world });
        else {
          const holder = Object.keys(s.storage).find((h) => storedIn(previous.storage,h).some((it)=>it.id===id));
          if (holder) origins.set(id, { holder, item: { id, kind: s.held.kind, variant: s.held.variant } });
        }
      }
      notePickup(itemDescription(id));
    }
    if (previous.held && previous.held.id !== s.held?.id && s.placedCount > previous.placedCount) {
      const w = s.worldItems.find((w) => w.id === previous.held!.id);
      if (w) recordBenchPlacement(picked.get(w.id) ?? itemDescription(w.id), new Vector3(...w.position));
    }
  });
  const b = usePortableStore.subscribe((s, previous) => {
    if (s.held && s.held.id !== previous.held?.id) notePickup(itemDescription(s.held.id));
    if (!s.held && previous.held) recordBenchPlacement(picked.get(previous.held.id) ?? itemDescription(previous.held.id), itemPosition(previous.held.id));
  });
  return () => { a(); b(); };
}
/** Explicit teacher bypass; the ordinary path requires an actual pickup and placement. */
export function demonstratePreparation() { prepareSupplies(true); }
function prepareSupplies(teacher: boolean) {
  beginPreparation();
  const active = useLabStore.getState().active, session = currentSession();
  if (active && session) useWorkbench.setState((s) => ({ sessions: { ...s.sessions, [active]: { ...session, teacher } } }));
  const held=heldObjectId();
  if(held) {
    const slot=Math.max(0,suppliesFor(active).findIndex((s)=>matchesSupply(s,itemDescription(held))));
    const at=INVESTIGATIONS.find(x=>x.id===active)?.grade===9?new Vector3(...grade9SupplyPosition(slot)):new Vector3(7.55+slot%8*.2,BENCH_HEIGHT+.015,-14.78+Math.floor(slot/8)*.22);
    if(useInventoryStore.getState().held)useInventoryStore.getState().place([at.x,at.y,at.z],0);
    else {usePortableStore.getState().held?.move(at,0,0);usePortableStore.setState({held:null});useSandbox.setState({heldId:null});}
  }
  for (const supply of suppliesFor(useLabStore.getState().active)) {
    if (currentSession()?.placed.includes(supply.key)) continue;
    if (!collectSupply(supply)) break;
    const id = supplyObject(supply);
    if (id) recordBenchPlacement(itemDescription(id), itemPosition(id), true);
  }
  if(INVESTIGATIONS.find(x=>x.id===active)?.grade===9&&currentSession()?.ready){
    const primary=currentSession()?.objects[suppliesFor(active)[0]?.key];
    const ticket=++focusTicket; // Pending stock-focus callbacks must not replace the primary instrument.
    if(primary)requestAnimationFrame(()=>{if(ticket===focusTicket){useSandbox.setState({inspected:primary});useBenchView.setState({selected:primary});}});
  }
}
export function jumpToStep(index: number) {
  const id = useLabStore.getState().active, session = currentSession();
  if (id && session?.ready) useWorkbench.setState((s) => ({ sessions: { ...s.sessions, [id]: { ...session, stepOverride: index } } }));
  else warn('Эхлээд хэрэгтэй зүйлсээ авчирч ширээнд тавиарай.');
}
/** Fresh attempt: owned stock disappears; room apparatus goes back to its origin.
 * Cleanup is scoped to this experiment, including its held/off-bench objects on restart. */
export function clearExperimentSession(id: string, worktopOnly = false) {
  const session = useWorkbench.getState().sessions[id];
  if (!session) return;
  const ids = new Set([...(session.owned??[]), ...Object.values(session.objects)]);
  for (const [key, object] of Object.entries(useWorkbench.getState().loose)) if (suppliesFor(id).some((s) => s.key === key)) ids.add(object);
  endHeldUse();
  cleaning = true;
  try {
    for (const object of ids) {
      if (worktopOnly && !onWorkbench(itemPosition(object))) continue;
      const origin = origins.get(object);
      if (usePortableStore.getState().held?.id === object && partKey(object)) { usePortableStore.setState({held:null}); useSandbox.setState({heldId:null}); }
      if (!partKey(object) && !restoreScenePortable(object)) {
        useInventoryStore.getState().consume(object);
        if (origin?.world) useInventoryStore.setState((s) => ({ worldItems: [...s.worldItems.filter((w) => w.id !== object), origin.world!] }));
        if (origin?.holder && origin.item) useInventoryStore.setState((s) => ({ storage: { ...s.storage, [origin.holder!]: [...(s.storage[origin.holder!] ?? []).filter((it) => it.id !== object), origin.item!].sort((a,b)=>{const order=storedIn({},origin.holder!);const rank=(id:string)=>{const index=order.findIndex((it)=>it.id===id);return index<0?Number.MAX_SAFE_INTEGER:index;};return rank(a.id)-rank(b.id);}) } }));
        const body = bodies.get(object);
        if (body && origin?.world) { const p = origin.world.position; body.setTranslation({ x:p[0], y:p[1], z:p[2] }, true); const rotation=origin.world.quaternion; body.setRotation(rotation?{x:rotation[0],y:rotation[1],z:rotation[2],w:rotation[3]}:new Quaternion().setFromAxisAngle(new Vector3(0,1,0),origin.world.rotY),true); body.setLinvel({ x:0,y:0,z:0 }, true); body.setAngvel({ x:0,y:0,z:0 }, true); }
      }
      useGrade9Apparatus.getState().clear(object); useChemStore.getState().removeMixture(object); co2Until.delete(object); coverUntil.delete(object); stirUntil.delete(object); if(heldHeat.id===object)heldHeat.id=null; forget(object); vesselFx.delete(object); picked.delete(object); origins.delete(object);
    }
    if (id === 'nacl' || [...ids].some((object)=>!!partKey(object))) { const near=useSandbox.getState().near; bench.engine?.prepareFreePlay(); resetSandbox(); useSandbox.setState({near}); }
    useChemStore.setState((s) => ({
      tools: Object.fromEntries(Object.entries(s.tools).filter(([key]) => !ids.has(key))),
      puddles: s.puddles.filter((p) => !onWorkbench(p) && !p.sourceIds?.some((source)=>ids.has(source))),
      bursts: s.bursts.filter((p) => !onWorkbench(p) && (!p.sourceId || !ids.has(p.sourceId))),
    }));
    useExperimentStore.setState((s)=>({toggles:Object.fromEntries(Object.entries(s.toggles).filter(([key])=>!ids.has(key))),values:Object.fromEntries(Object.entries(s.values).filter(([key])=>!ids.has(key)))}));
    clearReactionViews([...ids]);
    clearMeasurements([...ids]);
    useWorkbench.setState((s) => ({
      sessions: Object.fromEntries(Object.entries(s.sessions).filter(([key]) => key !== id)),
      loose: Object.fromEntries(Object.entries(s.loose).filter(([, object]) => !ids.has(object))),
      availableParts: id === 'nacl' ? [] : s.availableParts.filter((key)=>!ids.has(`nacl-${key}`)),
    }));
  } finally { cleaning = false; }
}
export function resetWorkbench() { useGrade9Apparatus.getState().reset(); clearMeasurements(); resetPresentation(); focusTicket++; picked.clear(); origins.clear(); clearReactionViews(); useWorkbench.setState({ sessions: {}, drawer: false, loose: {}, availableParts: [] }); }
export function selectBenchExperiment(id: string, fresh = false) {
  focusTicket++;
  const previous = useLabStore.getState().active;
  if (previous && previous !== id) {
    clearExperimentSession(previous);
  }
  if (fresh) {
    clearInquiry(id);
    resetPresentation(id);
    clearExperimentSession(id);
    useLabStore.setState((s) => ({ progress: { ...s.progress, [id]: [] } }));
  }
  if (fresh || previous !== id) { clearExperimentFeedback(); warn('Бэлтгэл: хэрэгтэй багаж, бодисоо авч, ажлын ширээнд тавиарай. Зааврыг дагаарай.'); }
  if (previous && previous !== id) useGameStore.getState().showToast('Өмнөх туршилтын багажийг хураалаа.');
  useLabStore.getState().setActive(id);
  beginPreparation();
  useSandbox.setState({ inspected: null, hovered: null });
  useBenchView.setState({ selected: null, inspecting: false, level: 'table' });
  useWorkbench.setState({ drawer: false });
  updateStationVisibility();
  if (useGameStore.getState().mode === 'bench') benchView.table();
}
/** Repeat the practical with clean, replenished supplies already on the bench. */
export function repeatBenchExperiment(id: string) {
  selectBenchExperiment(id, true);
  prepareSupplies(false);
  useSandbox.setState({ inspected: null, hovered: null });
  useBenchView.setState({ selected: null });
  warn('Туршилтыг дахин эхлүүллээ. Багаж, бодис ширээн дээр бэлэн байна.');
}
export function isInactiveBenchObject(id: string): boolean {
  const key = partKey(id);
  return !!key && !useWorkbench.getState().availableParts.includes(key);
}
export function isWorkbenchObject(id: string): boolean { return onWorkbench(itemPosition(id)); }
export function isBenchPaused(id: string): boolean {
  const mode = useGameStore.getState().mode;
  return Object.values(useWorkbench.getState().sessions).some((s) => [...(s.owned??[]),...Object.values(s.objects)].includes(id)) && !['bench', 'inspect'].includes(mode) && !(mode === 'walk' && (useSandbox.getState().near || heldObjectId() === id));
}
export function updateStationVisibility() { bench.engine?.showParts(useWorkbench.getState().availableParts); }
export function supplyAmount(supply: BenchSupply): { current: string; used: string; color: string; formula: string; hazard: string } | null {
  const sub = supplySubstance(supply);
  if (sub) {
    if (supply.part === 'lamp') return { current: 'Хэмжээг загварчлаагүй', used: 'Хэмжээг загварчлаагүй', color: sub.color, formula: sub.formula, hazard: sub.hazard };
    const id = supplyObject(supply), m = id ? useChemStore.getState().mixtures[id] : undefined;
    const initial = supply.part === 'jar' ? 20 : 100;
    const amount = supply.part === 'jar' ? (m?.s.Na2CO3 ?? 20 / 105.99) * 105.99 : m?.water ?? 100;
    const unit = supply.part === 'jar' ? 'г' : 'см³';
    return { current: `${amount.toFixed(1)} ${unit}`, used: `${Math.max(0, initial - amount).toFixed(1)} ${unit}`, color: sub.color, formula: sub.formula, hazard: sub.hazard };
  }
  if (!supply.reagent) return null;
  const r = REAGENTS[supply.reagent], id = supplyObject(supply), m = id ? useChemStore.getState().mixtures[id] : undefined;
  const amount = r.solid ? m ? solidMassG(m) : r.stock : m ? m.water + m.ethanol : r.stock;
  const unit = r.solid ? 'г' : 'см³';
  return { current: `${amount.toFixed(1)} ${unit}`, used: `${Math.max(0, r.stock - amount).toFixed(1)} ${unit}`, color: reagentColor(r.id), formula: r.label, hazard: r.note };
}
export const focusSupply = supplyObject;
export const benchOrigin = () => new Vector3(8.254, BENCH_HEIGHT, -14.585);
