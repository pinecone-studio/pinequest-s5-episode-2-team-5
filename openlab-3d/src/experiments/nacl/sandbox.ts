import { create } from 'zustand';
import { useChemStore, mixtureOf } from '../../store/useChemStore';
import { readBenchMixture, seedBenchChemistry, updateBenchMixture } from './chemistry';
import { takeLiquid, takeSolid, merge as mergeMixtures } from '../../chemistry/mixture';
import { vesselFx } from '../../lab/vesselFx';
import { spillMixture } from '../../lab/spill';
import { livePose } from '../../interaction/bodies';
import { Vector3 } from 'three';
import { CATALOG } from '../../equipment/equipmentCatalog';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useGameStore } from '../../store/useGameStore';
import { usePortableStore } from '../../interaction/portable';
import { interactables } from '../../interaction/registry';
import { useExperimentStore } from '../../store/useExperimentStore';
import { heldApi } from '../../interaction/heldApi';
import { NAMES, CHEM, type PartKey } from './data';

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
  operating: boolean;
  scope: boolean;
  focus: number;
  spilled: number;
  puddles: { x: number; y: number; z: number; ml: number }[];
}
export const useSandbox = create<SandboxState>()(() => ({
  contents: seeds(), participants: [], guide: false, near: false, inspected: null, heldId: null, hovered: null,
  warning: 'Чөлөөтэй туршиж болно. Зааврыг дагаарай: буруу бодис, халуун сав, хэт дүүргэлтийг анхаар.',
  completed: [], lit: false, paperIn: false, receiver: null, co2: 0, added: 0, rx: null,
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

let action: { source: string | null; target: string | null; remaining?: number } | null = null;
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
    if (equipmentUse) { equipmentUse(); action = null; return; }
    const role = describe(source ?? target ?? '').role;
    if (role === 'lamp' || role === 'bunsenBurner') {
      useSandbox.setState((s) => ({ lit: !s.lit }));
      warn('Дөлийг сольлоо. Халуун савыг болгоомжтой барь; шингэнийг дуустал бүү халаа.');
      action = null;
    } else if (role === 'scope') {
      useSandbox.setState({ scope: true, inspected: partId('scope') });
      action = null;
    } else if (source && ['stack', 'paper'].includes(role) && target === partId('funnel')) {
      useSandbox.setState({ paperIn: true });
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
    spillMixture(portions.taken, at.x, at.y, at.z);
    spill(amount);
    if (amount > 0) warn('Сав руу чиглүүлээгүй тул шингэн асгарч байна. Зааврыг дагаарай.');
  }
  if (act?.source && act.target && act.source !== act.target) {
    const source = describe(act.source); const target = describe(act.target);
    const from = { ...mixture(act.source) }; const to = { ...mixture(act.target) };
    const nearby = distance(act.source, act.target) < 1.0;
    if (!nearby) {
      warn('Хүрэхгүй байна. Савандаа ойртож, чиглүүлээд дахин ашиглаарай.');
    } else if (['rod', 'glassRod'].includes(source.role) && target.capacity > 0) {
      warn('Хутгаж байна. Хий ялгарахаа болихыг ажиглаарай.');
      mark('stir');
    } else if (['spat', 'spatula'].includes(source.role) && ['jar', 'reagentJar'].includes(target.role) && from.carbonate < 0.5) {
      const dose = Math.min(0.5 - from.carbonate, to.carbonate);
      const portions = takeSolid(mixtureOf(act.target, itemVariant(act.target)), dose);
      useChemStore.getState().setMixtures({ [act.target]: portions.rest, [act.source]: mergeMixtures(mixtureOf(act.source, itemVariant(act.source)), portions.taken) });
    } else if (['jar', 'reagentJar', 'spat', 'spatula'].includes(source.role) && target.capacity > 0) {
      const dose = Math.min(from.carbonate, 0.3 * dt);
      if (to.ml <= 0) warn('Хуурай саванд нунтаг хийж байна. Заавар: эхлээд 50 см³ хүчил хэмжээрэй.');
      else if (to.acid <= 0.01) warn('Хүчил дууссан: илүүдэл карбонат бүтээгдэхүүнд хольц болно.');
      const portions = takeSolid(mixtureOf(act.source, itemVariant(act.source)), dose);
      useChemStore.getState().setMixtures({ [act.source]: portions.rest, [act.target]: mergeMixtures(mixtureOf(act.target, itemVariant(act.target)), portions.taken) });
      useSandbox.setState((s) => ({ added: s.added + dose }));
    } else if (target.role === 'slide' && crystalMass(from) > 0.001) {
      const dose = Math.min(0.02, crystalMass(from));
      from.salt -= dose; to.salt += dose;
      write(act.source, from); write(act.target, to); mark('slide'); labUse.end();
    } else if (source.capacity > 0 && target.capacity > 0 && from.ml > 0.001) {
      if (!useSandbox.getState().completed.includes('measure') && target.role !== 'cyl' && target.role !== 'graduatedCylinder' && from.acid > 0) warn('Дарааллын зөвлөгөө: эхлээд цилиндрт 50 см³ хүчил хэмжээрэй. Шууд цутгах боломжтой ч хэмжилт тодорхойгүй болно.');
      const room = Math.max(0, target.capacity - to.ml);
      const poured = Math.min(from.ml, 8 * dt, act.remaining ?? Infinity);
      const amount = Math.min(poured, room);
      const overflow = poured - amount;
      if (overflow > 0) { spill(overflow); warn('Сав хальж, шингэн асгарч байна. Та цутгасаар байна — R-ээ суллаад савандаа зай гаргаарай.'); }
      if (target.role === 'funnel' && !useSandbox.getState().paperIn) warn('Юүлүүрт цаас алга. Шүүлтгүйгээр бодисууд хамт дамжина.');
      if (to.other || from.other) warn('Жишиг/өөр бодистой хольж байна. Энэ хольцын урвалыг загварчилдаггүй; цэвэр NaCl гэж бүү үз.');
      const portions = takeLiquid(mixtureOf(act.source, itemVariant(act.source)), poured);
      const kept = takeLiquid(portions.taken, amount);
      useChemStore.getState().setMixtures({
        [act.source]: portions.rest,
        [act.target]: mergeMixtures(mixtureOf(act.target, itemVariant(act.target)), kept.taken),
      });
      if (overflow > 0) {
        const at = labSpace.position(act.target);
        spillMixture(kept.rest, at.x, at.y, at.z);
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
  for (const [id, original] of Object.entries(useSandbox.getState().contents)) {
    if (!partKey(id)) {
      // The general engine owns ordinary vessels; only observe its carbonate gas effect.
      const core = mixtureOf(id, itemVariant(id));
      if ((vesselFx.get(id)?.bubbles ?? 0) > .01 && core.temp < 60 && ((core.s.Na2CO3 ?? 0) > 1e-8 || (core.aq.CO3 ?? 0) > 1e-8)) { rx = 'acid'; mark('reaction'); }
      continue;
    }
    const m = mixture(id);
    if (!m.other && m.ml > 0 && m.acid > 0 && m.carbonate > 0) {
      const factor = act?.source === partId('rod') && act.target === id ? 2 : 1;
      const mmol = Math.min(m.acid / 2, m.carbonate * 1000 / CHEM.molarCarbonate, dt * factor * 1.8);
      m.acid = Math.max(0, m.acid - 2 * mmol);
      m.carbonate = Math.max(0, m.carbonate - mmol * CHEM.molarCarbonate / 1000);
      m.salt += mmol * 2 * CHEM.molarSalt / 1000;
      useSandbox.setState((s) => ({ co2: s.co2 + mmol * CHEM.molarVolume }));
      rx = 'acid'; mark('reaction');
    }
    const nearbyBurner = useInventoryStore.getState().worldItems.some((item) => item.kind === 'bunsenBurner' && useExperimentStore.getState().toggles[item.id] && Math.hypot(livePose(item).x - labSpace.position(id).x, livePose(item).z - labSpace.position(id).z) < 0.15 && Math.abs(livePose(item).y - labSpace.position(id).y) < 0.35);
    const onHeat = id === partId('dish') && ((useSandbox.getState().lit && distance(id, partId('lamp')) < 0.22) || nearbyBurner);
    if (onHeat && m.ml > 0) {
      m.temp = Math.min(100, m.temp + dt * 15);
      if (m.temp > 70) m.ml = Math.max(0, m.ml - dt * 0.65);
      rx ??= 'evap'; mark('heat');
      if (m.ml < 1) warn('Хэт хуурай болтол халааж байна — үсрэх эрсдэлтэй. Дэнгээ унтраа.');
    } else m.temp = Math.max(20, m.temp - dt * 1.5);
    if (crystalMass(m) > 0.01) mark('crystals');
    if (['paper', 'watch', 'crystals'].includes(describe(id).role) && m.salt > 0.001 && m.ml > 0) m.ml = Math.max(0, m.ml - dt * 0.25);
    if (m.temp !== original.temp || m.ml !== original.ml || m.acid !== original.acid || m.salt !== original.salt) write(id, m);
  }
  const state = useSandbox.getState();
  const funnel = { ...mixture(partId('funnel')) };
  if (state.receiver && funnel.ml > 0 && distance(state.receiver, partId('funnel')) < 0.22) {
    const receiving = { ...mixture(state.receiver) };
    const amount = Math.min(funnel.ml, 3 * dt, Math.max(0, describe(state.receiver).capacity - receiving.ml));
    const portions = takeLiquid(mixtureOf(partId('funnel')), amount);
    const retained = state.paperIn ? { ...portions.taken, s: {} } : portions.taken;
    const rest = state.paperIn ? { ...portions.rest, s: { ...mixtureOf(partId('funnel')).s } } : portions.rest;
    useChemStore.getState().setMixtures({ [partId('funnel')]: rest, [state.receiver]: mergeMixtures(mixtureOf(state.receiver, itemVariant(state.receiver)), retained) });
    if (amount > 0) mark('filter');
  }
  syncBenchContents();
  useSandbox.setState({ rx });
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
