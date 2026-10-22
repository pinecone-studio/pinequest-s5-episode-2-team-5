/** Bench preparation and selection. Session objects remain in the shared room. */
import { create } from 'zustand';
import { Box3, Vector3 } from 'three';
import { CATALOG, SPAWNABLE_KINDS, type EquipmentKind } from '../../equipment/equipmentCatalog';
import { REAGENTS, REAGENT_LIST, type ReagentId } from '../../chemistry/reagents';
import { useLabStore } from '../../store/useLabStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useChemStore } from '../../store/useChemStore';
import { useGameStore } from '../../store/useGameStore';
import { solidMassG } from '../../chemistry/mixture';
import { livePose } from '../../interaction/bodies';
import { benchView, useBenchView } from '../nacl/view';
import { stock } from '../../world/itemsLayout';
import { BENCH_HEIGHT } from '../../utils/constants';
import { bench } from '../nacl/bench';
import { LABEL_KEYS, NAMES, USES, SUBSTANCES, type PartKey } from '../nacl/data';
import { warn, heldObjectId, partKey, useSandbox } from '../nacl/sandbox';
import { interactables, isVisibleInScene } from '../../interaction/registry';
import { usePortableStore } from '../../interaction/portable';
import { clearReactionViews } from '../../lab/reaction-view';
import { sounds } from '../../utils/sounds';
import { isWorkbenchPosition } from './placement';

export interface BenchSupply { key: string; name: string; use: string; kind?: EquipmentKind; reagent?: ReagentId; part?: PartKey }
const apparatus = (kind: EquipmentKind): BenchSupply => ({ key: kind, kind, name: CATALOG[kind].name, use: CATALOG[kind].description });
const reagent = (id: ReagentId): BenchSupply => ({ key: `reagent-${id}`, reagent: id, kind: REAGENTS[id].container, name: REAGENTS[id].name, use: REAGENTS[id].note });
const list = (kinds: EquipmentKind[], reagents: ReagentId[] = []) => [...kinds.map(apparatus), ...reagents.map(reagent)];
export const NACL_SUPPLIES = LABEL_KEYS.map((part): BenchSupply => ({ key: `nacl-${part}`, part, name: NAMES[part], use: USES[part] }));
/** Executable apparatus lists complement the existing human-readable JSON materials. */
const RECIPES: Record<string, BenchSupply[]> = {
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
export interface BenchSession { found: string[]; objects: Record<string, string>; ready: boolean; stepOverride: number | null }
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
const picked = new Map<string, SupplyItem>();
let focusTicket = 0;
export function currentSession() { const id = useLabStore.getState().active; return id ? useWorkbench.getState().sessions[id] : undefined; }
export function beginPreparation() {
  const id = useLabStore.getState().active;
  if (!id || useWorkbench.getState().sessions[id]) return;
  useWorkbench.setState((s) => ({ sessions: { ...s.sessions, [id]: { found: [], objects: {}, ready: suppliesFor(id).length === 0, stepOverride: null } } }));
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
  return !!partKey(id) || useInventoryStore.getState().held?.id === id || useInventoryStore.getState().worldItems.some((w) => w.id === id) || interactables.has(id);
}
export function supplyObject(supply: BenchSupply): string | null {
  const state = useWorkbench.getState();
  const known = currentSession()?.objects[supply.key] ?? state.loose[supply.key];
  if (known && exists(known)) return known;
  const world = useInventoryStore.getState().worldItems.find((w) => matchesSupply(supply, itemDescription(w.id)) && onWorkbench(itemPosition(w.id)));
  if (world) return world.id;
  for (const entry of interactables.values()) if (entry.enabled && matchesSupply(supply, itemDescription(entry.id)) && onWorkbench(itemPosition(entry.id)) && isVisibleInScene(entry.object)) return entry.id;
  return null;
}
/** A card can always add stock. Merely spawning it does NOT complete preparation. */
export function collectSupply(supply: BenchSupply): boolean {
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
      const slot = occupied % 24;
      id = useInventoryStore.getState().spawn(supply.kind, [7.56 + slot % 8 * .19, BENCH_HEIGHT + .015, -14.78 + Math.floor(slot / 8) * .22], 0, supply.reagent ? stock(supply.reagent) : undefined);
    }
    if (!id) { warn('Ширээнд зай хүрэхгүй байна. Нэг хэрэгслээ хураагаад дахин сонго.'); return false; }
    useWorkbench.setState((s) => ({ loose: { ...s.loose, [supply.key]: id! } }));
    warn(wrong ? 'Энэ туршилтад хэрэггүй. Чөлөөтэй ашиглаж болно.' : `${supply.name} гаргалаа. Авч, ширээнд буцааж тавихад ✓ болно.`);
  } else warn(wrong ? 'Энэ туршилтад хэрэггүй. Чөлөөтэй ашиглаж болно.' : `${supply.name} энд байна. Авч, ширээнд тавиарай.`);
  // Inventory spawning commits before the R3F Interactable layout effect registers.
  // Keep the selected identity visible and frame only once its actual mesh exists.
  const selected = id, ticket = ++focusTicket, deadline = performance.now() + 3000;
  const frame = () => {
    if (ticket !== focusTicket) return;
    if (interactables.has(selected) || partKey(selected)) benchView.focus(selected);
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
  if (!active || !session || session.ready || !onWorkbench(at) || (!teacher && !picked.has(item.id))) return;
  const required = suppliesFor(active);
  const supply = required.find((s) => matchesSupply(s, item));
  if (!supply) { warn('Энэ туршилтад хэрэггүй. Тавихыг хориглоогүй.'); return; }
  const objects = { ...session.objects, [supply.key]: item.id };
  const found = [...new Set([...session.found, supply.key])];
  const ready = required.every((r) => found.includes(r.key) && onWorkbench(r.key === supply.key ? at : itemPosition(objects[r.key])) && heldObjectId() !== objects[r.key]);
  useWorkbench.setState((s) => ({ sessions: { ...s.sessions, [active]: { ...session, found, objects, ready } } }));
  useSandbox.setState((s) => ({ participants: [...new Set([...s.participants, item.id])] }));
  warn(ready ? 'Бэлтгэл дууслаа. Эхний алхмаа эхлүүлээрэй.' : `${supply.name} ✓`);
  if (ready) { sounds.play('success', .6); useGameStore.getState().say('Хэрэгтэй бүх зүйл ширээн дээр бэлэн боллоо. Эхний алхмаа эхлүүлээрэй.', 'happy'); }
}
function notePickup(item: SupplyItem) {
  picked.set(item.id, item);
  const active = useLabStore.getState().active, session = currentSession();
  if (active && session && !session.ready) {
    const found = session.found.filter((key) => session.objects[key] !== item.id);
    if (found.length !== session.found.length) useWorkbench.setState((s) => ({ sessions: { ...s.sessions, [active]: { ...session, found } } }));
  }
}
export function startWorkbenchTracking(): () => void {
  beginPreparation();
  const a = useInventoryStore.subscribe((s, previous) => {
    if (s.held && s.held.id !== previous.held?.id) notePickup(itemDescription(s.held.id));
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
export function demonstratePreparation() {
  for (const supply of suppliesFor(useLabStore.getState().active)) {
    if (currentSession()?.found.includes(supply.key)) continue;
    if (!collectSupply(supply)) break;
    const id = supplyObject(supply);
    if (id) recordBenchPlacement(itemDescription(id), itemPosition(id), true);
  }
}
export function jumpToStep(index: number) {
  const id = useLabStore.getState().active, session = currentSession();
  if (id && session?.ready) useWorkbench.setState((s) => ({ sessions: { ...s.sessions, [id]: { ...session, stepOverride: index } } }));
  else warn('Эхлээд хэрэгтэй зүйлсээ авчирч ширээнд тавиарай.');
}
export function resetWorkbench() { focusTicket++; picked.clear(); clearReactionViews(); useWorkbench.setState({ sessions: {}, drawer: false, loose: {}, availableParts: [] }); }
export function selectBenchExperiment(id: string) {
  const inventory = useInventoryStore.getState();
  const owned = new Set(Object.values(useWorkbench.getState().sessions).flatMap((s) => Object.values(s.objects)));
  useInventoryStore.setState({ worldItems: inventory.worldItems.map((w) => {
    if (!owned.has(w.id)) return w;
    const p = livePose(w); return { ...w, position: [p.x, p.y, p.z] };
  }) });
  useLabStore.getState().setActive(id);
  beginPreparation();
  useBenchView.setState({ selected: null, inspecting: false, level: 'table' });
  useWorkbench.setState({ drawer: false });
}
// Apparatus stays in the free laboratory when another guide is chosen.
export function isInactiveBenchObject(_id: string): boolean { return false; }
export function isWorkbenchObject(id: string): boolean { return onWorkbench(itemPosition(id)); }
export function isBenchPaused(id: string): boolean {
  const mode = useGameStore.getState().mode;
  return Object.values(useWorkbench.getState().sessions).some((s) => Object.values(s.objects).includes(id)) && !['bench', 'inspect'].includes(mode) && !(mode === 'walk' && (useSandbox.getState().near || heldObjectId() === id));
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
  return { current: `${amount.toFixed(1)} ${unit}`, used: `${Math.max(0, r.stock - amount).toFixed(1)} ${unit}`, color: r.stripe, formula: r.label, hazard: r.note };
}
export const focusSupply = supplyObject;
export const benchOrigin = () => new Vector3(8.254, BENCH_HEIGHT, -14.585);
