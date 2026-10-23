import { recordTransfer } from '../../lab/measurements';
import { create } from 'zustand';
import { useChemStore, mixtureOf } from '../../store/useChemStore';
import { readBenchMixture, seedBenchChemistry, updateBenchMixture } from './chemistry';
import { takeLiquid, takeSolid, solidMassG, isEmptyMixture, reagentMixture, merge as mergeMixtures } from '../../chemistry/mixture';
import { vesselFx } from '../../lab/vesselFx';
import { spillMixture } from '../../lab/spill';
import { livePose } from '../../interaction/bodies';
import { Vector3 } from 'three';
import { CATALOG, STOCK_KINDS } from '../../equipment/equipmentCatalog';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useGameStore } from '../../store/useGameStore';
import { usePortableStore } from '../../interaction/portable';
import { interactables } from '../../interaction/registry';
import { useExperimentStore } from '../../store/useExperimentStore';
import { heldApi } from '../../interaction/heldApi';
import { NAMES, CHEM, type PartKey } from './data';
import { emptyVessel, transfer } from '../../interaction/actions';
import { carbonateReaction, evaporationReaction, mixObservations, physicalMixing } from '../../chemistry/reaction-view';
import { publishReaction } from '../../lab/reaction-view';
import { equilibrateHeat } from '../../chemistry/mix';
import { DEFAULT_ENV, step as chemistryStep } from '../../chemistry/kinetics';
import { note, observe, prime } from '../../lab/observe';
import { useLabStore } from '../../store/useLabStore';
import type { EquipmentKind } from '../../equipment/equipmentCatalog';

export interface Mixture {
  ml: number;
  acid: number; // mmol HCl
  carbonate: number; // g unreacted Na2CO3
  salt: number; // g NaCl, dissolved + crystals
  temp: number;
  other: string;
}
export interface LabObject { id: string; label: string; capacity: number; role: string }
const empty = (): Mixture => ({ ml: 0, acid: 0, carbonate: 0, salt: 0, temp: 20, other: '' });
export const partId = (key: PartKey) => `nacl-${key}`;
/** Live spatial queries supplied by the room, not a separate experiment scene. */
export const labSpace = { distance: (_a: string, _b: string) => Number.POSITIVE_INFINITY, position: (_id: string) => new Vector3() };
export function partKey(id: string): PartKey | null {
  const key = id.slice(5) as PartKey;
  return id.startsWith('nacl-') && key in NAMES ? key : null;
}
const CAPACITY: Partial<Record<PartKey, number>> = { bottle: 100, cyl: 100, beaker: 150, flask: 250, dish: 90, funnel: 15, waste: 300, watch: 8, paper: 8, slide: 1, crystals: 8 };
function seeds() {
  const contents: Record<string, Mixture> = {};
  for (const key of Object.keys(NAMES) as PartKey[]) contents[partId(key)] = empty();
  contents[partId('bottle')] = { ...empty(), ml: 100, acid: 100 };
  contents[partId('jar')] = { ...empty(), carbonate: 20 };
  return contents;
}
interface SandboxState {
  contents: Record<string, Mixture>;
  participants: string[];
  guide: boolean;
  near: boolean;
  inspected: string | null;
  heldId: string | null;
  hovered: string | null;
  warning: string;
  completed: string[];
  lit: boolean;
  paperIn: boolean;
  receiver: string | null;
  co2: number;
  added: number;
  rx: 'acid' | 'evap' | null;
  reaction: { id: string; kind: 'acid' | 'evap'; rate: number; temp: number } | null;
  operating: boolean;
  scope: boolean;
  focus: number;
  spilled: number;
  puddles: { x: number; y: number; z: number; ml: number }[];
}
export const useSandbox = create<SandboxState>()(() => ({
  contents: seeds(), participants: [], guide: false, near: false, inspected: null, heldId: null, hovered: null,
  warning: 'Чөлөөтэй туршиж болно. Зааврыг дагаарай: буруу бодис, халуун сав, хэт дүүргэлтийг анхаар.',
  completed: [], lit: false, paperIn: false, receiver: null, co2: 0, added: 0, rx: null, reaction: null,
  operating: false, scope: false, focus: 10,
  spilled: 0, puddles: [],
}));

export function describe(id: string): LabObject {
  const key = partKey(id);
  if (key) return { id, label: NAMES[key], capacity: CAPACITY[key] ?? 0, role: key };
  const inv = useInventoryStore.getState();
  const item = inv.worldItems.find((x) => x.id === id) ?? (inv.held?.id === id ? inv.held : null);
  if (!item) {
    const entry = interactables.get(id);
    const role = entry?.inspectKind ?? 'unknown';
    const capacity = entry?.inspectKind ? CATALOG[entry.inspectKind].capacityMl ?? 0 : 0;
    return { id, label: entry?.label ?? id, capacity, role };
  }
  const role = item.kind;
  return { id, label: CATALOG[item.kind].name, capacity: CATALOG[role].capacityMl ?? 0, role };
}
function itemVariant(id: string) {
  const inv = useInventoryStore.getState();
  return inv.worldItems.find((x) => x.id === id)?.variant ?? (inv.held?.id === id ? inv.held.variant : undefined)
    ?? Object.values(inv.storage).flat().find((x) => x.id === id)?.variant;
}
export function mixture(id: string): Mixture {
  return readBenchMixture(id, itemVariant(id));
}
/** Mirror only the UI projection. All vessel contents are owned by useChemStore. */
export function syncBenchContents() {
  const state = useSandbox.getState();
  const ids = new Set([...Object.keys(NAMES).map((key) => partId(key as PartKey)), ...state.participants, ...(state.inspected ? [state.inspected] : [])]);
  const contents: Record<string, Mixture> = {};
  for (const id of ids) contents[id] = mixture(id);
  useSandbox.setState({ contents });
  if (useLabStore.getState().active === 'nacl' && Object.entries(contents).some(([id, m]) => ['cyl', 'graduatedCylinder'].includes(describe(id).role) && m.ml >= 49 && m.ml <= 51 && m.acid > .01)) mark('measure');
}
export const crystalMass = (m: Mixture) => Math.max(0, m.salt - m.ml * (m.temp > 60 ? 0.39 : 0.36));
export function contentsLabel(m: Mixture) {
  const labels = [];
  if (m.acid > 0.01) labels.push('HCl');
  if (m.carbonate > 0.001) labels.push('Na₂CO₃');
  if (m.salt > 0.001) labels.push(crystalMass(m) > 0.001 ? 'NaCl талст + уусмал' : 'NaCl уусмал');
  if (m.other) labels.push(m.other);
  return labels.join(' + ') || (m.ml > 0.01 ? 'Ус / уусмал' : 'Хоосон');
}
function write(id: string, m: Mixture) {
  updateBenchMixture(id, m);
  useSandbox.setState((s) => ({ contents: { ...s.contents, [id]: m } }));
}
export function warn(text: string) { useSandbox.setState({ warning: text }); }
function mark(id: string) {
  if (!useSandbox.getState().completed.includes(id)) {
    useSandbox.setState((s) => ({ completed: [...s.completed, id] }));
    useGameStore.getState().logEvent(`NaCl: ${id}`);
  }
}
function spill(ml: number) {
  if (ml > 0) useSandbox.setState((s) => ({ spilled: s.spilled + ml }));
}
export function heldObjectId() { return usePortableStore.getState().held?.id ?? useInventoryStore.getState().held?.id ?? null; }

/** The running R action; `draw` once it turned out to take liquid into the held vessel. */
let action: { source: string | null; target: string | null; remaining?: number; draw?: boolean } | null = null;
let actionClock = 0;
export const labUse = {
  start(target: string | null) {
    const source = heldObjectId();
    useSandbox.setState((s) => ({ participants: [...new Set([...s.participants, ...[source, target].filter((id): id is string => !!id)])] }));
    if (useSandbox.getState().scope) return;
    if (target) mixture(target);
    action = { source, target };
    actionClock = 0;
    useSandbox.setState({ operating: true });
    const equipmentUse = interactables.get(source ?? target ?? '')?.onUse;
    if (equipmentUse) { equipmentUse(); action = null; useSandbox.setState({ operating: false }); return; }
    const role = describe(source ?? target ?? '').role;
    // A carried vessel aimed at the sink or the waste bin is emptied there (an empty one fills at the tap).
    const drain = target ? interactables.get(target)?.useTarget?.type : undefined;
    const vessel = source && describe(source).capacity > 0 ? source : null;
    if (vessel && (drain === 'sink' || drain === 'waste') && !isEmptyMixture(mixtureOf(vessel, itemVariant(vessel)))) {
      emptyVessel(vessel, itemVariant(vessel), describe(vessel).label, drain);
      action = null;
    } else if (vessel && drain === 'waste') {
      warn('Сав хоосон байна.');
      action = null;
    } else if (role === 'lamp' || role === 'bunsenBurner') {
      useSandbox.setState((s) => ({ lit: !s.lit }));
      warn('Дөлийг сольлоо. Халуун савыг болгоомжтой барь; шингэнийг дуустал бүү халаа.');
      action = null;
    } else if (role === 'scope') {
      useSandbox.setState({ scope: true, inspected: partId('scope') });
      action = null;
    } else if (source && ['stack', 'paper'].includes(role) && target === partId('funnel')) {
      usePortableStore.setState({ held: null });
      useSandbox.setState({ paperIn: true, heldId: null, inspected: partId('funnel'), hovered: partId('funnel') });
      warn('Шүүлтүүрийн цаас юүлүүрт орлоо. Шингэнийг ирмэгээс доош байлга.');
      mark('filter-paper');
      action = null;
    } else if (source === partId('funnel') && target && describe(target).capacity > 0) {
      useSandbox.setState({ receiver: target });
      warn('Юүлүүрийн доор шүүгдэс цуглуулах сав сонголоо. Юүлүүрийг тэр савны дээр Q дарж тавиарай.');
      action = null;
    } else if (!source && target) {
      useSandbox.setState({ inspected: target });
      warn('Багажийг E дарж ав. Барьж буй зүйлээ өөр сав руу чиглүүлээд R дарж ашигла.');
      action = null;
    }
    if (!action) useSandbox.setState({ operating: false });
  },
  end() { action = null; useSandbox.setState({ operating: false }); },
  dose(target: string, amount: number) {
    const source = heldObjectId();
    if (!source || mixture(source).ml <= 0) { warn('Цутгах шингэнтэй савыг эхлээд ав.'); return; }
    if (action?.source === source && action.target === target && action.remaining !== undefined) { action.remaining += amount; return; }
    labUse.start(target);
    if (action) action.remaining = amount;
  },
  get source() { return action?.source ?? null; },
  get target() { return action?.target ?? null; },
};

let simulationClock = 0;
export function simulateLab(rawDt: number, distance: (a: string, b: string) => number) {
  simulationClock += Math.min(rawDt, 0.05);
  if (simulationClock < 0.1) return;
  const dt = simulationClock; simulationClock = 0;
  const act = action;
  if (act?.source && !act.target && describe(act.source).capacity > 0) {
    const from = { ...mixture(act.source) };
    const amount = Math.min(from.ml, 8 * dt);
    const portions = takeLiquid(mixtureOf(act.source, itemVariant(act.source)), amount);
    useChemStore.getState().setMixtures({ [act.source]: portions.rest });
    const at = heldApi.target?.point ?? labSpace.position(act.source);
    spillMixture(portions.taken, at.x, at.y, at.z, act.source);
    spill(amount);
    if (amount > 0) warn('Сав руу чиглүүлээгүй тул шингэн асгарч байна. Зааврыг дагаарай.');
  }
  if (act?.source && act.target && act.source !== act.target) {
    const source = describe(act.source); const target = describe(act.target);
    const from = { ...mixture(act.source) }; const to = { ...mixture(act.target) };
    const nearby = distance(act.source, act.target) < 1.0;
    if (!nearby) {
      warn('Хүрэхгүй байна. Савандаа ойртож, чиглүүлээд дахин ашиглаарай.');
    } else if (interactables.get(act.target)?.useTarget?.type === 'sink' && source.capacity > 0) {
      // Held under the tap: an empty vessel fills with water.
      const add = Math.min(Math.max(0, source.capacity - from.ml), 25 * dt);
      if (add > 0.001) useChemStore.getState().setMixtures({ [act.source]: mergeMixtures(mixtureOf(act.source, itemVariant(act.source)), reagentMixture('water', add)) });
      else { warn('Сав дүүрлээ.'); labUse.end(); }
    } else if (!partKey(act.source) && !partKey(act.target) && ['reagentJar', 'spatula'].includes(source.role) && target.capacity > 0 && solidMassG(mixtureOf(act.source, itemVariant(act.source))) > 0) {
      transfer({ id: act.source, kind: source.role as EquipmentKind, variant: itemVariant(act.source) }, { id: act.target, kind: target.role as EquipmentKind, variant: itemVariant(act.target) }, .3 * dt);
    } else if (['rod', 'glassRod'].includes(source.role) && target.capacity > 0) {
      warn('Хутгаж байна. Хий ялгарахаа болихыг ажиглаарай.');
      mark('stir');
    } else if (['spat', 'spatula'].includes(source.role) && ['jar', 'reagentJar'].includes(target.role) && solidMassG(mixtureOf(act.source, itemVariant(act.source))) < 0.5) {
      // A spatula scoops whatever solid the jar holds (up to one 0.5 g scoop).
      const jar = mixtureOf(act.target, itemVariant(act.target));
      const dose = Math.min(0.5 - solidMassG(mixtureOf(act.source, itemVariant(act.source))), solidMassG(jar));
      if (dose <= 0.0005) warn('Саванд хатуу бодис алга.');
      const portions = takeSolid(jar, dose);
      useChemStore.getState().setMixtures({ [act.target]: portions.rest, [act.source]: mergeMixtures(mixtureOf(act.source, itemVariant(act.source)), portions.taken) });
    } else if (['jar', 'reagentJar', 'spat', 'spatula'].includes(source.role) && target.capacity > 0) {
      const solids = mixtureOf(act.source, itemVariant(act.source));
      const grams = solidMassG(solids);
      const dose = Math.min(grams, 0.3 * dt);
      const carbonateShare = grams > 0 ? from.carbonate / grams : 0;
      if (carbonateShare > 0.5 && useLabStore.getState().active === 'nacl') {
        if (to.ml <= 0) warn('Хуурай саванд нунтаг хийж байна. Заавар: эхлээд 50 см³ хүчил хэмжээрэй.');
        else if (to.acid <= 0.01) warn('Хүчил дууссан: илүүдэл карбонат бүтээгдэхүүнд хольц болно.');
      }
      if (grams <= 0.0005) warn('Халбага / саванд хатуу бодис алга.');
      const portions = takeSolid(solids, dose);
      const before = mixtureOf(act.target, itemVariant(act.target));
      prime(act.target, before);
      const after = mergeMixtures(before, portions.taken);
      useChemStore.getState().setMixtures({ [act.source]: portions.rest, [act.target]: after });
      observe(act.target, after);
      useSandbox.setState((s) => ({ added: s.added + dose * carbonateShare }));
    } else if (target.role === 'slide' && crystalMass(from) > 0.001) {
      const dose = Math.min(0.02, crystalMass(from));
      from.salt -= dose; to.salt += dose;
      write(act.source, from); write(act.target, to); mark('slide'); labUse.end();
    } else if (act.draw || (source.capacity > 0 && target.capacity > 0 && to.ml > 0.001 && !STOCK_KINDS.includes(source.role as EquipmentKind) && isEmptyMixture(mixtureOf(act.source, itemVariant(act.source))))) {
      // An empty pipette or vessel aimed at a filled one draws from it for as long as R is held.
      act.draw = true;
      const drops = source.role in CATALOG && !!CATALOG[source.role as EquipmentKind].drops;
      const room = Math.max(0, source.capacity - from.ml);
      const amount = Math.min(to.ml, room, (drops ? 1 : 8) * dt);
      if (amount > 0.001) {
        const portions = takeLiquid(mixtureOf(act.target, itemVariant(act.target)), amount);
        useChemStore.getState().setMixtures({ [act.target]: portions.rest, [act.source]: mergeMixtures(mixtureOf(act.source, itemVariant(act.source)), portions.taken) });
      }
      if (room - amount < 0.01) { warn(`${source.label} дүүрлээ.`); labUse.end(); }
      else if (to.ml - amount < 0.001) { warn(`${target.label}-д шингэн үлдсэнгүй.`); labUse.end(); }
    } else if (source.capacity > 0 && target.capacity > 0 && from.ml > 0.001) {
      if (useLabStore.getState().active === 'nacl' && !useSandbox.getState().completed.includes('measure') && target.role !== 'cyl' && target.role !== 'graduatedCylinder' && from.acid > 0) warn('Дарааллын зөвлөгөө: эхлээд цилиндрт 50 см³ хүчил хэмжээрэй. Шууд цутгах боломжтой ч хэмжилт тодорхойгүй болно.');
      const room = Math.max(0, target.capacity - to.ml);
      const drops = source.role in CATALOG && !!CATALOG[source.role as EquipmentKind].drops;
      const poured = Math.min(from.ml, (drops ? 0.15 : 8) * dt, act.remaining ?? Infinity);
      const amount = Math.min(poured, room);
      const overflow = poured - amount;
      if (overflow > 0) { spill(overflow); warn('Сав хальж, шингэн асгарч байна. Та цутгасаар байна — R-ээ суллаад савандаа зай гаргаарай.'); }
      if (target.role === 'funnel' && !useSandbox.getState().paperIn) warn('Юүлүүрт цаас алга. Шүүлтгүйгээр бодисууд хамт дамжина.');
      if (!partKey(act.source) && !partKey(act.target)) {
        transfer({ id: act.source, kind: source.role as EquipmentKind, variant: itemVariant(act.source) }, { id: act.target, kind: target.role as EquipmentKind, variant: itemVariant(act.target) }, poured);
      } else {
        const portions = takeLiquid(mixtureOf(act.source, itemVariant(act.source)), poured);
        const kept = takeLiquid(portions.taken, amount);
        const before = mixtureOf(act.target, itemVariant(act.target));
        // Preserve the accelerated textbook carbonate reaction; ordinary chemistry
        // (neutralisation/precipitation) still uses the canonical equilibrium solver.
        const textbook = !!(before.s.Na2CO3 || kept.taken.s.Na2CO3);
        const mixed = textbook ? { m: mergeMixtures(before, kept.taken), neutralized: 0, formed: [] } : equilibrateHeat(before, kept.taken, 100);
        useChemStore.getState().setMixtures({ [act.source]: portions.rest, [act.target]: mixed.m });
        recordTransfer(act.source, act.target, source.label, amount);
        const observations = mixObservations(before, kept.taken, mixed.m, mixed.neutralized, mixed.formed);
        for (const r of observations) publishReaction(act.target, r, 5000);
        if (amount > 0 && !observations.some((r) => !r.info)) publishReaction(act.target, physicalMixing(mixed.m), 5000);
        if (overflow > 0) {
          const at = labSpace.position(act.target); spillMixture(kept.rest, at.x, at.y, at.z, act.target);
        }
      }
      to.ml += amount; from.ml -= poured;
      if (act.remaining !== undefined) { act.remaining -= poured; if (act.remaining < 0.001 || from.ml < 0.001) labUse.end(); }
      if (to.ml >= 49 && to.ml <= 51 && ['cyl', 'graduatedCylinder'].includes(target.role)) mark('measure');
      if (to.temp > 50) warn('Халуун уусмал! Түлэгдэх аюултай.');
      mark('transfer');
    } else {
      actionClock += dt;
      if (actionClock > 0.5) { warn('Эдгээр багажийг ингэж ашиглах урвал байхгүй. Чөлөөтэй зөөж болно; бодис ба зориулалтыг шалгаарай.'); labUse.end(); }
    }
  }
  let rx: 'acid' | 'evap' | null = null;
  let reaction: SandboxState['reaction'] = null;
  for (const [id, original] of Object.entries(useSandbox.getState().contents)) {
    if (!partKey(id)) {
      // The general engine owns ordinary vessels; only observe its carbonate gas effect.
      const core = mixtureOf(id, itemVariant(id));
      if ((vesselFx.get(id)?.bubbles ?? 0) > .01 && core.temp < 60 && ((core.s.Na2CO3 ?? 0) > 1e-8 || (core.aq.CO3 ?? 0) > 1e-8)) { rx = 'acid'; mark('reaction'); }
      continue;
    }
    const m = mixture(id);
    if (m.other) {
      const core = mixtureOf(id);
      const at = labSpace.position(id);
      const overBurner = useInventoryStore.getState().worldItems.some((item) => {
        if (item.kind !== 'bunsenBurner' || !useExperimentStore.getState().toggles[item.id]) return false;
        const b = livePose(item);
        return Math.hypot(b.x - at.x, b.z - at.z) < 0.15 && at.y - b.y > 0 && at.y - b.y < 0.35;
      });
      const heated = (id === partId('dish') && useSandbox.getState().lit && distance(id, partId('lamp')) < 0.22) || overBurner;
      const r = chemistryStep(core, dt, { ...DEFAULT_ENV, heatW: heated ? 900 : 0, glassJK: 100, lossWK: 4, flame: heated });
      for (const n of r.notes) note(id, n);
      if (r.gas.CO2 > 1.5e-5) note(id, 'gas:CO2');
      if (r.gas.H2 > 8e-6) note(id, 'gas:H2');
      if (r.gas.O2 > 1.5e-5) note(id, 'gas:O2');
      const fizz = r.gas.CO2 + r.gas.H2 + r.gas.O2;
      const bubbles = Math.min(1, fizz * 900 + (r.boiling ? 0.95 : 0));
      const steam = r.gas.steam > 0 ? Math.min(1, 0.35 + r.gas.steam * 2) : 0;
      if (bubbles > 0.01 || steam > 0.01) vesselFx.set(id, { bubbles, steam, smoke: Math.min(1, r.gas.smoke * 4) });
      else vesselFx.delete(id);
      if (r.changed || Math.abs(r.m.temp - core.temp) > 0.15 || Math.abs(r.m.cloud - core.cloud) > 0.03 || Math.abs(r.m.foam - core.foam) > 1) {
        prime(id, core);
        useChemStore.getState().setMixtures({ [id]: r.m });
        observe(id, r.m);
      }
      continue;
    }
    if (m.ml > 0 && m.acid > 0 && m.carbonate > 0) {
      const factor = act?.source === partId('rod') && act.target === id ? 2 : 1;
      const mmol = Math.min(m.acid / 2, m.carbonate * 1000 / CHEM.molarCarbonate, dt * factor * 1.8);
      m.acid = Math.max(0, m.acid - 2 * mmol);
      m.carbonate = Math.max(0, m.carbonate - mmol * CHEM.molarCarbonate / 1000);
      m.salt += mmol * 2 * CHEM.molarSalt / 1000;
      useSandbox.setState((s) => ({ co2: s.co2 + mmol * CHEM.molarVolume }));
      rx = 'acid'; reaction = { id, kind: 'acid', rate: mmol / dt, temp: m.temp }; mark('reaction');
      publishReaction(id, carbonateReaction(mmol / dt / 1000, m.temp, false, true));
    }
    const nearbyBurner = useInventoryStore.getState().worldItems.some((item) => item.kind === 'bunsenBurner' && useExperimentStore.getState().toggles[item.id] && Math.hypot(livePose(item).x - labSpace.position(id).x, livePose(item).z - labSpace.position(id).z) < 0.15 && Math.abs(livePose(item).y - labSpace.position(id).y) < 0.35);
    const onHeat = id === partId('dish') && ((useSandbox.getState().lit && distance(id, partId('lamp')) < 0.22) || nearbyBurner);
    if (onHeat && m.ml > 0) {
      m.temp = Math.min(100, m.temp + dt * 15);
      if (m.temp > 70) m.ml = Math.max(0, m.ml - dt * 0.65);
      rx ??= 'evap';
      if (m.temp > 70) {
        if (!reaction) reaction = { id, kind: 'evap', rate: .65, temp: m.temp };
        publishReaction(id, evaporationReaction(.65, m.temp, crystalMass(m) > crystalMass(original) ? 'NaCl' : undefined));
      }
      mark('heat');
      if (m.ml < 1) warn('Хэт хуурай болтол халааж байна — үсрэх эрсдэлтэй. Дэнгээ унтраа.');
    } else m.temp = Math.max(20, m.temp - dt * 1.5);
    if (crystalMass(m) > 0.01) mark('crystals');
    if (['paper', 'watch', 'crystals'].includes(describe(id).role) && m.salt > 0.001 && m.ml > 0) m.ml = Math.max(0, m.ml - dt * 0.25);
    if (m.temp !== original.temp || m.ml !== original.ml || m.acid !== original.acid || m.salt !== original.salt) write(id, m);
  }
  const state = useSandbox.getState();
  const funnelId = partId('funnel');
  const funnelPosition = labSpace.position(funnelId);
  const canReceive = (id: string) => {
    if (id === heldObjectId() || !interactables.get(id)?.enabled) return false;
    if (!['flask', 'erlenmeyer', 'beaker', 'cyl', 'graduatedCylinder', 'volumetricFlask'].includes(describe(id).role)) return false;
    const at = labSpace.position(id);
    return at.y < funnelPosition.y - .02 && Math.hypot(at.x - funnelPosition.x, at.z - funnelPosition.z) < .065 && distance(id, funnelId) < .22;
  };
  const candidates = [...new Set([...Object.keys(state.contents), ...useInventoryStore.getState().worldItems.map((item) => item.id)])];
  const receiver = state.receiver && canReceive(state.receiver) ? state.receiver : candidates.filter(canReceive).sort((a, b) => distance(a, funnelId) - distance(b, funnelId))[0] ?? null;
  if (receiver !== state.receiver) useSandbox.setState({ receiver });
  const funnel = { ...mixture(funnelId) };
  if (receiver && funnel.ml > 0) {
    const receiving = { ...mixture(receiver) };
    const amount = Math.min(funnel.ml, 3 * dt, Math.max(0, describe(receiver).capacity - receiving.ml));
    const portions = takeLiquid(mixtureOf(partId('funnel')), amount);
    const retained = state.paperIn ? { ...portions.taken, s: {} } : portions.taken;
    const rest = state.paperIn ? { ...portions.rest, s: { ...mixtureOf(partId('funnel')).s } } : portions.rest;
    useChemStore.getState().setMixtures({ [partId('funnel')]: rest, [receiver]: mergeMixtures(mixtureOf(receiver, itemVariant(receiver)), retained) });
    if (amount > 0) mark('filter');
  }
  syncBenchContents();
  useSandbox.setState({ rx, reaction });
}

export function guideHint() {
  const s = useSandbox.getState();
  if (!s.completed.includes('measure')) return 'Заавар: цилиндрт 50 см³ HCl хэмж. Лаб дахь ямар ч сав, багажийг чөлөөтэй авч болно.';
  if (!s.completed.includes('reaction')) return 'Заавар: хүчлээ аяганд хийж, Na₂CO₃ бага багаар нэм. Хий ялгаралтыг ажигла.';
  if (!s.completed.includes('filter')) return 'Заавар: цаасыг юүлүүрт хийж, юүлүүрийг колбоны дээр байрлуулан уусмалаа шүү.';
  if (!s.completed.includes('crystals')) return 'Заавар: шүүгдсээ ууршуулагч аяганд хий. Дэнг R дарж асаагаад аягыг ойр байрлуул. Талст гармагц унтраа.';
  return 'Талст үүслээ. Хөргөж, шилэн хавтас дээр дээж тавиад микроскопоор ажигла. Та үргэлжлүүлэн чөлөөтэй ажиллаж болно.';
}

export function resetSandbox() {
  labUse.end();
  actionClock = 0; simulationClock = 0;
  const contents = seeds();
  seedBenchChemistry(contents);
  useSandbox.setState({ ...useSandbox.getInitialState(), contents });
}
