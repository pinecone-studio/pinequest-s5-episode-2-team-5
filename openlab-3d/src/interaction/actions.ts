/**
 * R: use the held item on whatever is in focus. The held item and the target decide the
 * action — pour (hold R; the stream speeds up after a moment so small amounts are easy),
 * draw from a bottle, drip with a pipette or dropper, scoop with a spatula, stir, measure
 * temperature or pH, filter, dip a nichrome loop and hold it in a flame, heat a gripped
 * vessel over a burner, smother or extinguish a fire, fill/empty at the sink, dispose of
 * waste, wipe up a spill. Continuous actions run while R is held.
 */
import { create } from 'zustand';
import { useSandbox } from '../experiments/nacl/sandbox';
import { useBenchView } from '../experiments/nacl/view';
import { CATALOG, STOCK_KINDS, isContainer, type EquipmentKind } from '../equipment/equipmentCatalog';
import { CATIONS, FLAME_COLORS, SOLIDS, type Cation } from '../chemistry/species';
import { REAGENTS } from '../chemistry/reagents';
import { emptyMixture, heatCapacity, isEmptyMixture, liquidMl, merge, reagentMixture, solidMassG, solidVolumeMl, takeLiquid, takeSolid, type Mixture } from '../chemistry/mixture';
import { mixObservations } from '../chemistry/reaction-view';
import { publishReaction } from '../lab/reaction-view';
import { equilibrateHeat } from '../chemistry/mix';
import { phOf } from '../chemistry/equilibrium';
import { mixtureLook, universalColor } from '../chemistry/color';
import { PH_WORDS, fmtG, fmtMl, phBand } from '../chemistry/describe';
import { mixtureOf, useChemStore } from '../store/useChemStore';
import { useExperimentStore } from '../store/useExperimentStore';
import { playerState, useGameStore } from '../store/useGameStore';
import { useInventoryStore, type HeldItem } from '../store/useInventoryStore';
import { emitLab } from '../lab/events';
import { note, observe, prime } from '../lab/observe';
import { isHazardous, spillMixture } from '../lab/spill';
import { sounds } from '../utils/sounds';
import type { ItemVariant } from '../world/itemsLayout';
import { interactables, type UseTarget } from './registry';
import { livePose } from './bodies';

export type UseKind =
  | 'pour'
  | 'draw'
  | 'drip'
  | 'suck'
  | 'scoop'
  | 'unscoop'
  | 'stir'
  | 'measureT'
  | 'measurePh'
  | 'filter'
  | 'dip'
  | 'flame'
  | 'heat'
  | 'cover'
  | 'extinguish'
  | 'sinkFill'
  | 'sinkEmpty'
  | 'waste'
  | 'wipe';

export interface UseInfo {
  kind: UseKind;
  verb: string;
  continuous: boolean;
}

interface Vessel {
  id: string;
  kind: EquipmentKind;
  variant?: ItemVariant;
}

const CONTINUOUS: UseKind[] = ['pour', 'draw', 'drip', 'suck', 'heat', 'extinguish', 'sinkFill'];

function info(kind: UseKind, verb: string): UseInfo {
  return { kind, verb, continuous: CONTINUOUS.includes(kind) };
}

export function isLit(id: string): boolean {
  return !!useExperimentStore.getState().toggles[id];
}

function fullness(m: Mixture): number {
  return liquidMl(m) + solidVolumeMl(m);
}

function capacityOf(kind: EquipmentKind): number {
  return CATALOG[kind].capacityMl ?? 0;
}

/** Which action R would perform; null when nothing sensible applies. */
export function describeUse(held: HeldItem | null, target: UseTarget | null): UseInfo | null {
  if (target?.type === 'puddle') return info('wipe', 'арчиж цэвэрлэх');
  if (held?.kind === 'fireExtinguisher') return info('extinguish', 'CO₂ цацах');
  if (!held) return null;
  const hk = held.kind;
  const hm = mixtureOf(held.id, held.variant);
  const hHas = !isEmptyMixture(hm);
  if (!target) return null;
  if (target.type === 'sink') {
    if (!isContainer(hk) || STOCK_KINDS.includes(hk)) return null;
    return hHas ? info('sinkEmpty', 'угаалтуурт асгаж хоослох') : info('sinkFill', 'усаар дүүргэх');
  }
  if (target.type === 'waste') {
    if (!isContainer(hk) || !hHas) return null;
    return info('waste', 'хаягдлын саванд асгах');
  }
  const tk = target.kind;
  const tm = mixtureOf(target.id, target.variant);
  const tHas = !isEmptyMixture(tm);
  if (tk === 'bunsenBurner') {
    if (!isLit(target.id)) return null;
    if (hk === 'wireLoop') return info('flame', 'дөлөнд барих');
    if (isContainer(hk) && !STOCK_KINDS.includes(hk) && hk !== 'pipette') return info('heat', 'дөлөн дээр халаах');
    return null;
  }
  if (!isContainer(tk)) return null;
  if (tm.burning && (hk === 'watchGlass' || hk === 'petriDish')) return info('cover', 'таглаж галыг унтраах');
  switch (hk) {
    case 'spatula':
      if (hHas) return STOCK_KINDS.includes(tk) ? null : info('unscoop', 'халбагатай бодисыг хийх');
      return solidMassG(tm) > 0.01 ? info('scoop', 'халбагаар 0.5 г авах') : null;
    case 'glassRod':
      return tHas ? info('stir', 'хутгах') : null;
    case 'thermometer':
      return info('measureT', 'температур хэмжих');
    case 'phPaper':
      return liquidMl(tm) > 0.05 ? info('measurePh', 'pH хэмжих') : null;
    case 'funnel':
      return solidMassG(tm) > 0.002 && liquidMl(tm) > 0.1 ? info('filter', 'шүүлтүүрээр шүүх') : null;
    case 'wireLoop':
      return liquidMl(tm) > 0.05 ? info('dip', 'уусмалд дүрэх') : null;
    default:
      break;
  }
  if (!isContainer(hk)) return null;
  if (CATALOG[hk].drops) {
    if (hHas) return STOCK_KINDS.includes(tk) ? null : info('drip', 'дусаах');
    return hk === 'pipette' && liquidMl(tm) > 0.05 ? info('suck', 'соруулж авах') : null;
  }
  if (STOCK_KINDS.includes(tk)) return hHas || STOCK_KINDS.includes(hk) ? null : info('draw', 'эндээс авах');
  if (hHas) return info('pour', tk === 'burette' ? 'бюреткэнд хийх' : 'энэ сав руу асгах');
  if (tHas && tk !== 'burette') return info('draw', 'эндээс авах');
  return null;
}

/** Why R does nothing, for the toast. */
function explain(held: HeldItem | null, target: UseTarget | null): [string, string?] {
  if (!held) return ['Гартаа юу ч алга', 'Эхлээд сав эсвэл багаж аваад (E) зүйл рүү хараад R дар'];
  if (!target) return ['Юу ч онилоогүй байна', 'Сав, горелк эсвэл угаалтуур руу хараад R дар'];
  if (target.type === 'item') {
    if (target.kind === 'bunsenBurner' && !isLit(target.id)) return ['Горелк асаагүй байна', 'Эхлээд горелк дээр E дарж асаа'];
    if (STOCK_KINDS.includes(target.kind) && isContainer(held.kind)) return ['Урвалжийн лонх руу бүү асга', 'Урвалж бохирдоно. Хоосон саваар лонхноос авна'];
    if (held.kind === 'spatula') return ['Халбагаар хатуу бодис авна', 'Хатуу бодисын сав руу хараад R дар'];
  }
  return ['Энэ үйлдэл боломжгүй', `${CATALOG[held.kind].name}-ийг үүнд хэрэглэх боломжгүй`];
}

/* ---------- Transfers ---------- */

const lastUse = new Map<string, number>();
function useEvents(src: Vessel): void {
  const reagent = src.variant?.reagent;
  if (!reagent || !STOCK_KINDS.includes(src.kind)) return;
  const now = performance.now();
  if (now - (lastUse.get(reagent) ?? -1e9) < 1500) return;
  lastUse.set(reagent, now);
  emitLab({ key: `use:${reagent}`, quiet: true });
  const r = REAGENTS[reagent];
  const worn = useChemStore.getState().worn;
  if ((r.hazards.includes('corrosive') || r.hazards.includes('toxic')) && !worn.goggles) emitLab({ key: 'safety:goggles', quiet: true });
  if ((r.hazards.includes('toxic') || reagent === 'agno3') && !worn.gloves) emitLab({ key: 'safety:gloves', quiet: true });
}

function placeOf(v: Vessel): [number, number, number] {
  const w = useInventoryStore.getState().worldItems.find((it) => it.id === v.id);
  if (w) {
    const p = livePose(w);
    return [p.x, p.y, p.z];
  }
  const entry = interactables.get(v.id);
  if (entry) {
    entry.object.updateWorldMatrix(true, false);
    const e = entry.object.matrixWorld.elements;
    return [e[12], Math.max(0, e[13] - 0.01), e[14]];
  }
  return [0, 0, 0];
}

/**
 * Moves `amount` (mL of liquid, or g of solid from a dry source) from `src` to `dst`,
 * mixing, reacting and announcing. Returns the amount moved and whether it overflowed.
 */
export function transfer(src: Vessel, dst: Vessel, amount: number): { moved: number; overflow: boolean } {
  const chem = useChemStore.getState();
  const sm = mixtureOf(src.id, src.variant);
  const dm = mixtureOf(dst.id, dst.variant);
  const liquid = liquidMl(sm) > 0.005;
  const available = liquid ? liquidMl(sm) : solidMassG(sm);
  let take = Math.min(amount, available);
  if (take <= 1e-6) return { moved: 0, overflow: false };
  const room = capacityOf(dst.kind) - fullness(dm);
  let overflow = false;
  const { taken, rest } = liquid ? takeLiquid(sm, take) : takeSolid(sm, take);
  let into = taken;
  if (liquid && take > room) {
    // The vessel brims over: what does not fit runs down the outside.
    overflow = true;
    const keep = Math.max(0, room);
    const parts = takeLiquid(taken, keep);
    into = parts.taken;
    const [x, y, z] = placeOf(dst);
    spillMixture(parts.rest, x + 0.05, y, z, dst.id);
    take = keep;
  }
  prime(dst.id, dm);
  const mixed = equilibrateHeat(dm, into, CATALOG[dst.kind].heatJK ?? 100);
  chem.setMixtures({ [src.id]: rest, [dst.id]: mixed.m });
  for (const reaction of mixObservations(dm, into, mixed.m, mixed.neutralized, mixed.formed)) publishReaction(dst.id, reaction, 1800);
  if (mixed.neutralized > 2e-5) note(dst.id, 'neutralization', 5000);
  observe(dst.id, mixed.m);
  useEvents(src);
  return { moved: take, overflow };
}

/* ---------- One-shot actions ---------- */

function runOnce(kind: UseKind, held: HeldItem, target: UseTarget): void {
  const chem = useChemStore.getState();
  const game = useGameStore.getState();
  const heldVessel: Vessel = { id: held.id, kind: held.kind, variant: held.variant };
  const tv: Vessel | null = target.type === 'item' ? { id: target.id, kind: target.kind, variant: target.variant } : null;
  switch (kind) {
    case 'wipe': {
      if (target.type !== 'puddle') return;
      chem.removePuddle(target.id);
      sounds.play('whoosh', 0.6);
      emitLab({ key: 'wipe', title: 'Асгарсныг арчлаа', detail: 'Цэвэрхэн ширээ бол аюулгүй ширээ.' });
      return;
    }
    case 'scoop': {
      if (!tv) return;
      const tm = mixtureOf(tv.id, tv.variant);
      const { taken, rest } = takeSolid(tm, 0.5);
      chem.setMixtures({ [tv.id]: rest, [held.id]: taken });
      sounds.play('tick', 1.2);
      game.showToast(`${fmtG(solidMassG(taken))} авлаа`, 'Одоо сав руу хараад R дарж хий');
      useEvents(tv);
      return;
    }
    case 'unscoop': {
      if (!tv) return;
      const { moved } = transfer(heldVessel, tv, 10);
      sounds.play('tick', 1);
      game.showToast(`${fmtG(moved)} хийлээ`, CATALOG[tv.kind].name);
      return;
    }
    case 'stir': {
      if (!tv) return;
      stirUntil.set(tv.id, performance.now() + 4000);
      const m = mixtureOf(tv.id, tv.variant);
      chem.setMixtures({ [tv.id]: { ...m, cloud: Math.max(m.cloud, solidMassG(m) > 0.002 ? 1 : 0) } });
      sounds.play('clink', 0.5);
      emitLab({ key: 'stir', quiet: true, itemId: tv.id });
      game.showToast('Хутгаж байна', 'Хатуу бодис хурдан уусч, уусмал жигд холилдоно');
      return;
    }
    case 'measureT': {
      if (!tv) return;
      const m = mixtureOf(tv.id, tv.variant);
      const t = isEmptyMixture(m) ? 22 : m.temp;
      chem.setTool(held.id, { reading: t });
      sounds.play('beep', 0.6);
      const text = `${t.toFixed(1)} °C`;
      game.showToast(`🌡 Температур: ${text}`, CATALOG[tv.kind].name);
      game.logEvent(`Температур хэмжлээ: ${text} (${CATALOG[tv.kind].name}).`);
      emitLab({ key: 'measure:temp', value: t, quiet: true, itemId: tv.id });
      return;
    }
    case 'measurePh': {
      if (!tv) return;
      const ph = phOf(mixtureOf(tv.id, tv.variant)) ?? 7;
      const shown = Math.round(ph);
      chem.setTool(held.id, { strip: universalColor(ph) });
      sounds.play('tick', 0.8);
      game.showToast(`pH ≈ ${shown} — ${PH_WORDS[phBand(ph)]}`, 'pH цаасны өнгийг хайрцган дээрх хүснэгттэй харьцууллаа');
      game.logEvent(`pH цаасаар хэмжлээ: pH ≈ ${shown} (${PH_WORDS[phBand(ph)]}).`);
      emitLab({ key: 'measure:ph', value: ph, quiet: true, itemId: tv.id });
      return;
    }
    case 'filter': {
      if (!tv) return;
      const m = mixtureOf(tv.id, tv.variant);
      const residue: Mixture = { ...emptyMixture(m.temp), s: { ...m.s } };
      const clear: Mixture = { ...m, s: {}, cloud: 0 };
      const color = Object.keys(m.s).length > 0 ? SOLIDS[Object.keys(m.s)[0] as keyof typeof SOLIDS].color : '#ffffff';
      chem.setMixtures({ [tv.id]: clear });
      chem.setTool(held.id, { residue: color });
      sounds.play('pour', 0.5);
      emitLab({ key: 'filter', title: 'Шүүлээ', detail: `Тунадас (${fmtG(solidMassG(residue))}) шүүлтүүрийн цаасан дээр үлдэж, тунгалаг уусмал (шүүгдэс) үлдлээ.` });
      return;
    }
    case 'dip': {
      if (!tv) return;
      const m = mixtureOf(tv.id, tv.variant);
      const cations = CATIONS.filter((c) => (m.aq[c] ?? 0) > 1e-7);
      const tool = chem.tools[held.id];
      if (cations.length === 0 && (m.aq.Cl ?? 0) > 1e-4) {
        chem.setTool(held.id, { sample: {} });
        sounds.play('fizz', 0.4);
        emitLab({ key: 'loop:clean', title: 'Утсыг цэвэрлэлээ', detail: 'Давсны хүчилд дүрж өмнөх дээжийн үлдэгдлийг арилгав.' });
        return;
      }
      const sample: Partial<Record<Cation, number>> = { ...(tool?.sample ?? {}) };
      for (const c of cations) sample[c] = (sample[c] ?? 0) + (m.aq[c] ?? 0) / Math.max(1e-6, liquidMl(m) / 1000);
      chem.setTool(held.id, { sample });
      sounds.play('tick', 0.8);
      game.showToast('Утсыг уусмалд дүрлээ', 'Одоо асаалттай горелкийн дөлөнд барь (R)');
      return;
    }
    case 'flame': {
      if (target.type !== 'item') return;
      const sample = chem.tools[held.id]?.sample ?? {};
      let best: Cation | null = null;
      let bestW = 0;
      for (const [c, conc] of Object.entries(sample) as [Cation, number][]) {
        if (!FLAME_COLORS[c]) continue;
        // Sodium is so bright that a trace of it masks other colors.
        const w = conc * (c === 'Na' ? 6 : 1);
        if (w > bestW) {
          bestW = w;
          best = c;
        }
      }
      if (!best) {
        game.showToast('Дөл өнгөө өөрчлөөгүй', 'Утас цэвэр байна — эхлээд давсны уусмалд дүр');
        return;
      }
      const flame = FLAME_COLORS[best];
      if (!flame) return;
      chem.setFlame(target.id, flame.color, 3.5);
      // The sample burns off; a sodium trace stays until the loop is cleaned in HCl.
      chem.setTool(held.id, { sample: sample.Na ? { Na: sample.Na * 0.15 } : {} });
      sounds.play('puff', 0.9);
      emitLab({ key: `flame:${best}`, title: `Дөл ${flame.name} өнгөтэй боллоо`, detail: `Энэ нь ${best === 'Cu' ? 'зэс' : best === 'Na' ? 'натри' : best === 'K' ? 'кали' : best === 'Li' ? 'лити' : best === 'Ca' ? 'кальци' : 'бари'}-ийн ионы шинж. Дараагийн сорилын өмнө утсаа HCl-д дүрж цэвэрлэ.` });
      return;
    }
    case 'cover': {
      if (!tv) return;
      // The lid stays on for a while: no oxygen, no flame (turn the burner off too).
      coverUntil.set(tv.id, performance.now() + 15000);
      sounds.play('clink', 0.8);
      return;
    }
    case 'sinkEmpty': {
      const m = mixtureOf(held.id, held.variant);
      const hazardous = isHazardous(m);
      chem.setMixtures({ [held.id]: emptyMixture() });
      sounds.play('pour');
      if (hazardous) {
        emitLab({ key: 'waste:sink', title: 'Хортой хаягдлыг угаалтуурт асгалаа!', detail: 'Хүнд металл, хүчтэй хүчил/шүлттэй хаягдлыг улаан хаягдлын саванд хийх ёстой.' });
      } else {
        game.showToast('Сав хоосорлоо', 'Угаалтуурт асгалаа');
      }
      game.logEvent(`${CATALOG[held.kind].name}-ийг угаалтуурт хоосоллоо.`);
      return;
    }
    case 'waste': {
      chem.setMixtures({ [held.id]: emptyMixture() });
      sounds.play('pour');
      emitLab({ key: 'waste:proper', title: 'Хаягдлыг зөв устгалаа', detail: 'Химийн хаягдлыг тусгай саванд цуглуулж, дараа нь мэргэжлийн байгууллага устгана.' });
      return;
    }
    default:
      break;
  }
}

/* ---------- Continuous sessions ---------- */

/** Non-reactive state read by the 3D view (tilt, stream, spray) and the simulation. */
export const actionVisual = {
  kind: null as UseKind | null,
  /** Interactable id of the target (stream end point). */
  targetId: null as string | null,
  color: '#cfe6f5',
  /** 0..1 current pour strength. */
  strength: 0,
};

/** Simulation inputs set by actions. */
export const stirUntil = new Map<string, number>();
export const coverUntil = new Map<string, number>();
export const co2Until = new Map<string, number>();
export const heldHeat = { id: null as string | null, watts: 0, until: 0 };

interface Session {
  kind: UseKind;
  held: HeldItem;
  target: UseTarget;
  key: string;
  elapsed: number;
  moved: number;
  pending: number;
  sinceCommit: number;
  dropTimer: number;
}

let session: Session | null = null;

export const useActionHud = create<{ label: string; detail: string; visible: boolean }>()(() => ({ label: '', detail: '', visible: false }));

function targetKey(t: UseTarget | null): string {
  if (!t) return 'none';
  if (t.type === 'item') return `item:${t.id}`;
  if (t.type === 'puddle') return `puddle:${t.id}`;
  return t.type;
}

function currentTarget(): UseTarget | null {
  const game = useGameStore.getState();
  const id = game.mode === 'bench' ? useSandbox.getState().hovered ?? useBenchView.getState().selected : game.focus?.id;
  const entry = id ? interactables.get(id) : undefined;
  return entry?.useTarget ?? null;
}

function hud(label: string, detail: string): void {
  useActionHud.setState({ label, detail, visible: true });
}

export function isUsing(): boolean {
  return session !== null;
}

/** R pressed. */
export function beginUse(): void {
  const held = useInventoryStore.getState().held;
  const target = currentTarget();
  const use = describeUse(held, target);
  if (!use || !held) {
    if (held?.kind === 'fireExtinguisher' && use) {
      // Spraying at nothing in particular is still allowed.
    } else {
      const [title, subtitle] = explain(held, target);
      useGameStore.getState().showToast(title, subtitle);
      return;
    }
  }
  if (!held || !use) return;
  if (use.kind === 'heat') {
    const glass = CATALOG[held.kind].glass;
    if (glass && !held.grip) {
      useGameStore.getState().showToast('Халуун шилийг гараар бүү барь!', 'Хуруу шил барих хавчаар эсвэл тигель хавчаараар хавчиж байж халаа');
      emitLab({ key: 'safety:grip', quiet: true });
      return;
    }
  }
  if (!use.continuous) {
    if (target) runOnce(use.kind, held, target);
    return;
  }
  session = { kind: use.kind, held, target: target ?? { type: 'waste' }, key: targetKey(target), elapsed: 0, moved: 0, pending: 0, sinceCommit: 0, dropTimer: 0 };
  actionVisual.kind = use.kind;
  actionVisual.targetId = target?.type === 'item' ? target.id : null;
  actionVisual.strength = 0;
}

/** R released (or the target/held item changed). */
export function endUse(): void {
  const s = session;
  if (!s) return;
  // Clear first: an overflow during the final flush ends the session again.
  session = null;
  flush(s);
  actionVisual.kind = null;
  actionVisual.targetId = null;
  actionVisual.strength = 0;
  heldHeat.id = null;
  useActionHud.setState({ visible: false });
  if ((s.kind === 'pour' || s.kind === 'draw' || s.kind === 'sinkFill') && s.moved > 0.05) {
    const target = s.target.type === 'item' ? CATALOG[s.target.kind].name : s.target.type === 'sink' ? 'Угаалтуур' : '';
    useGameStore.getState().logEvent(`${s.kind === 'draw' ? 'Авлаа' : 'Асгалаа'}: ${fmtMl(s.moved)}${target ? ` (${target})` : ''}.`);
  }
}

function endpoints(s: Session): { src: Vessel; dst: Vessel } | null {
  if (s.target.type !== 'item') return null;
  const held: Vessel = { id: s.held.id, kind: s.held.kind, variant: s.held.variant };
  const target: Vessel = { id: s.target.id, kind: s.target.kind, variant: s.target.variant };
  return s.kind === 'draw' || s.kind === 'suck' ? { src: target, dst: held } : { src: held, dst: target };
}

function flush(s: Session): void {
  if (s.pending <= 0) return;
  const ends = endpoints(s);
  if (!ends) return;
  const { moved, overflow } = transfer(ends.src, ends.dst, s.pending);
  s.moved += moved;
  s.pending = 0;
  s.sinceCommit = 0;
  if (overflow) {
    useGameStore.getState().showToast('Сав дүүрч хальлаа!', 'Асгарсныг арчиж цэвэрлээрэй (E)');
    emitLab({ key: 'spill', quiet: true });
    endUse();
  }
}

/** Per-frame update of a continuous action (called from the render loop). */
export function tickUse(dt: number): void {
  const s = session;
  if (!s) return;
  const inv = useInventoryStore.getState();
  if (!inv.held || inv.held.id !== s.held.id || targetKey(currentTarget()) !== s.key || !['walk', 'bench'].includes(useGameStore.getState().mode)) {
    if (!(s.kind === 'extinguish' && inv.held?.id === s.held.id)) {
      endUse();
      return;
    }
  }
  s.held = inv.held ?? s.held;
  s.elapsed += dt;
  s.sinceCommit += dt;
  const ramp = Math.min(1, 0.22 + s.elapsed * 1.3);
  actionVisual.strength = ramp;
  const ends = endpoints(s);
  switch (s.kind) {
    case 'pour':
    case 'draw': {
      if (!ends) return;
      // Drop-dispensing sources (dropper bottles) still deliver a few drops a second.
      const rate = CATALOG[ends.src.kind].drops ? 0.15 : CATALOG[ends.src.kind].pourRate ?? 10;
      s.pending += rate * ramp * dt;
      actionVisual.color = liquidColorOf(ends.src);
      if (s.sinceCommit > 0.08) flush(s);
      if (!session) return;
      const sm = mixtureOf(ends.src.id, ends.src.variant);
      const dm = mixtureOf(ends.dst.id, ends.dst.variant);
      const unitG = liquidMl(sm) < 0.005 && solidMassG(sm) > 0;
      hud(`${s.kind === 'draw' ? 'Авч байна' : 'Асгаж байна'} · ${unitG ? fmtG(s.moved) : fmtMl(s.moved)}`, `${CATALOG[ends.dst.kind].name}: ${fmtMl(fullness(dm))} / ${capacityOf(ends.dst.kind)} мл`);
      if (isEmptyMixture(sm)) {
        useGameStore.getState().showToast('Сав хоосорлоо');
        endUse();
      } else if (fullness(dm) >= capacityOf(ends.dst.kind) - 0.05 && s.kind === 'draw') {
        endUse();
      }
      return;
    }
    case 'drip':
    case 'suck': {
      if (!ends) return;
      s.dropTimer -= dt;
      if (s.dropTimer <= 0) {
        s.dropTimer = s.kind === 'drip' ? 0.33 : 0.1;
        const amount = s.kind === 'drip' ? 0.05 : 0.15;
        const { moved } = transfer(ends.src, ends.dst, amount);
        s.moved += moved;
        if (s.kind === 'drip' && moved > 0) sounds.play('tick', 0.5);
        actionVisual.color = liquidColorOf(ends.src);
        const drops = Math.round(s.moved / 0.05);
        hud(s.kind === 'drip' ? `Дусааж байна · ${drops} дусал` : `Соруулж байна · ${fmtMl(s.moved)}`, `${CATALOG[ends.dst.kind].name}: ${fmtMl(fullness(mixtureOf(ends.dst.id, ends.dst.variant)))}`);
        if (moved <= 0 || (s.kind === 'suck' && fullness(mixtureOf(ends.dst.id, ends.dst.variant)) >= capacityOf(ends.dst.kind) - 0.01)) endUse();
      }
      return;
    }
    case 'sinkFill': {
      const m = mixtureOf(s.held.id, s.held.variant);
      const room = capacityOf(s.held.kind) - fullness(m);
      const add = Math.min(room, 25 * ramp * dt);
      if (add > 0) useChemStore.getState().setMixtures({ [s.held.id]: merge(m, reagentMixture('water', add)) });
      s.moved += add;
      actionVisual.color = '#d4ecfb';
      hud(`Ус авч байна · ${fmtMl(s.moved)}`, `${CATALOG[s.held.kind].name}: ${fmtMl(fullness(m) + add)} / ${capacityOf(s.held.kind)} мл`);
      if (room <= 0.05) endUse();
      return;
    }
    case 'heat': {
      if (s.target.type !== 'item' || !isLit(s.target.id)) {
        endUse();
        return;
      }
      heldHeat.id = s.held.id;
      heldHeat.watts = s.held.kind === 'testTube' ? 420 : 800;
      heldHeat.until = performance.now() + 250;
      const m = mixtureOf(s.held.id, s.held.variant);
      hud(`Халааж байна · ${m.temp.toFixed(0)} °C`, CATALOG[s.held.kind].name);
      return;
    }
    case 'extinguish': {
      // CO₂ reaches burning vessels inside a cone in front of the player.
      const now = performance.now();
      const fx = -Math.sin(playerState.yaw);
      const fz = -Math.cos(playerState.yaw);
      for (const w of inv.worldItems) {
        const m = useChemStore.getState().mixtures[w.id];
        if (!m?.burning) continue;
        const p = livePose(w);
        const dx = p.x - playerState.position.x;
        const dz = p.z - playerState.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 3.5 && (dx * fx + dz * fz) / Math.max(d, 1e-3) > 0.8) co2Until.set(w.id, now + 400);
      }
      if (s.elapsed % 0.45 < dt) sounds.play('whoosh', 0.9);
      hud('CO₂ цацаж байна', 'Галын ёроол руу чиглүүл');
      return;
    }
    default:
      return;
  }
}

function liquidColorOf(v: Vessel): string {
  const look = mixtureLook(mixtureOf(v.id, v.variant));
  return look.liquid ?? look.solidColor ?? '#cfe6f5';
}

/** Mixture heat capacity including the empty vessel, J/K. */
export function vesselHeatCapacity(kind: EquipmentKind, m: Mixture): number {
  return heatCapacity(m) + (CATALOG[kind].heatJK ?? 100);
}
