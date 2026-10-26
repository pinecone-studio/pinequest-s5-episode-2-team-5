import {useShowcase} from '../experiments/workbench/guidance/showcase';
import {advanceChemistry} from '../chemistry/advance';
import {protocolSpeed} from '../experiments/workbench/guidance/clock';
import {isGrade9Rig} from '../experiments/grade9/kinds';
/**
 * The lab's simulation loop (inside the canvas):
 *  - every frame: continuous R actions (pouring, dripping, heating, spraying);
 *  - ten times a second: chemistry and heat for every vessel that has contents, heating
 *    from lit burners under tripods (found from live physics positions), knocked-over
 *    vessels spilling, the burette dripping into whatever stands under its tip, steam and
 *    bubble intensities for the models, and events for everything new.
 */
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { interactables } from '../interaction/registry';
import { CATALOG, isContainer, type EquipmentKind } from '../equipment/equipmentCatalog';
import { liquidMl, takeLiquid, type Mixture } from '../chemistry/mixture';
import { DEFAULT_ENV } from '../chemistry/kinetics';
import { mixtureOf, seedMixture, useChemStore } from '../store/useChemStore';
import { useExperimentStore } from '../store/useExperimentStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { co2Until, coverUntil, heldHeat, stirUntil, tickUse, transfer } from '../interaction/actions';
import { buretteTip, livePose, startSpeedRecorder } from '../interaction/bodies';
import { surfaceYAt } from '../interaction/surfaces';
import { note, observe, prime } from '../lab/observe';
import { spillMixture } from '../lab/spill';
import { vesselFx } from '../lab/vesselFx';
import { startAnnouncer } from '../lab/announcer';
import type { ItemVariant, WorldItem } from './itemsLayout';
import { stepObservations } from '../chemistry/reaction-view';
import { publishReaction } from '../lab/reaction-view';
import { isBenchPaused } from '../experiments/workbench/session';
import { useGameStore } from '../store/useGameStore';

const TICK = 0.1;
const BURETTE_RATE = [0, 0.25, 1, 3.5];

/** Vessels that have settled: same mixture object as last tick and nothing going on. */
const settled = new Map<string, { m: Mixture; ticks: number }>();
let tickCount = 0;

function isCalm(m: Mixture): boolean {
  return Math.abs(m.temp - 22) < 0.3 && m.cloud < 0.02 && m.foam < 1 && !m.burning;
}

function kindFromId(id: string): EquipmentKind | null {
  const k = id.slice(id.lastIndexOf('-') + 1) as EquipmentKind;
  return k in CATALOG ? k : null;
}

function lossFor(kind: EquipmentKind): number {
  const cap = CATALOG[kind].capacityMl ?? 50;
  return 1.2 + 5 * Math.pow(cap / 250, 2 / 3);
}

function simulate(dt: number): void {
  const inv = useInventoryStore.getState();
  const chem = useChemStore.getState();
  const toggles = useExperimentStore.getState().toggles;
  const now = performance.now();
  const world = new Map<string, WorldItem>(inv.worldItems.map((w) => [w.id, w]));
  const variants = new Map<string, ItemVariant | undefined>();
  for (const w of inv.worldItems) variants.set(w.id, w.variant);
  if (inv.held) variants.set(inv.held.id, inv.held.variant);
  for (const list of Object.values(inv.storage)) for (const it of list) variants.set(it.id, it.variant);

  // Which vessels sit over a lit burner (on a tripod)?
  const heat = new Map<string, number>();
  const burners = inv.worldItems.filter((w) => w.kind === 'bunsenBurner' && toggles[w.id] && !isBenchPaused(w.id)).map(livePose);
  if (burners.length > 0) {
    for (const w of inv.worldItems) {
      if (!isContainer(w.kind) || w.kind === 'burette') continue;
      const p = livePose(w);
      if (p.upY < 0.7) continue;
      for (const b of burners) {
        const dy = p.y - b.y;
        if (Math.hypot(p.x - b.x, p.z - b.z) < 0.065 && dy > 0.14 && dy < 0.34) heat.set(w.id, 1300);
      }
    }
  }
  if (heldHeat.id && heldHeat.until > now) heat.set(heldHeat.id, heldHeat.watts);

  const ids = new Set<string>([...Object.keys(chem.mixtures), ...heat.keys()]);
  const patch: Record<string, Mixture> = {};
  tickCount++;
  for (const id of ids) {
    if (isBenchPaused(id)) continue;
    if (id.startsWith('nacl-')) continue; // The textbook bench advances these shared mixtures at its accelerated rate.
    const sceneTarget = interactables.get(id)?.useTarget;
    const kind = (sceneTarget?.type === 'item' ? sceneTarget.kind : null) ?? world.get(id)?.kind ?? (inv.held?.id === id ? inv.held.kind : null) ?? kindFromId(id);
    if (!kind) continue;
    const before = chem.mixtures[id] ?? seedMixture(variants.get(id));
    const heatW = heat.get(id) ?? 0;
    // Skip settled vessels (re-checked every 2 s in case slow chemistry is still going on).
    const calm = settled.get(id);
    if (heatW === 0 && calm && calm.m === before && calm.ticks > 4 && tickCount % 20 !== 0 && (stirUntil.get(id) ?? 0) < now) {
      vesselFx.delete(id);
      continue;
    }
    const env = {
      ...DEFAULT_ENV,
      heatW,
      glassJK: CATALOG[kind].heatJK ?? 100,
      lossWK: lossFor(kind),
      stir: (stirUntil.get(id) ?? 0) > now ? 1 : 0,
      covered: (coverUntil.get(id) ?? 0) > now,
      co2: (co2Until.get(id) ?? 0) > now,
      flame: heatW > 0,
    };
    if (heatW > 0) note(id, 'heat:start', 20000);
    if(isGrade9Rig(kind))continue;
    const r = advanceChemistry(before, dt, env,protocolSpeed(id));
    for (const reaction of stepObservations(before, r, dt)) publishReaction(id, reaction);
    const m = r.m;
    const fizz = r.gas.CO2 + r.gas.H2 + r.gas.O2;
    const bubbles = Math.min(1, fizz * 900 + (r.boiling ? 0.95 : m.temp > 80 ? (m.temp - 80) / 25 : 0));
    const steam = r.gas.steam > 0 ? Math.min(1, 0.35 + r.gas.steam * 2) : m.temp > 65 && liquidMl(m) > 0.1 ? Math.min(0.6, (m.temp - 65) / 50) : 0;
    const smoke = Math.min(1, r.gas.smoke * 4 + (m.burning ? 0.3 : 0));
    if (bubbles > 0.01 || steam > 0.01 || smoke > 0.01) vesselFx.set(id, { bubbles, steam, smoke });
    else vesselFx.delete(id);
    for (const n of r.notes) note(id, n);
    if (r.gas.CO2 > 1.5e-5) note(id, 'gas:CO2');
    if (r.gas.H2 > 8e-6) note(id, 'gas:H2');
    if (r.gas.O2 > 1.5e-5) note(id, 'gas:O2');
    if (r.gas.NH3 > 3e-6) note(id, 'gas:NH3', 25000);
    const significant =
      r.changed || Math.abs(m.temp - before.temp) > 0.15 || Math.abs(m.cloud - before.cloud) > 0.03 || Math.abs(m.foam - before.foam) > 1e-4 || m.burning !== before.burning;
    if (significant) {
      prime(id, before);
      patch[id] = m;
      observe(id, m);
      settled.delete(id);
    } else if (heatW === 0 && isCalm(m) && fizz === 0) {
      const prev = settled.get(id);
      settled.set(id, { m: before, ticks: prev && prev.m === before ? prev.ticks + 1 : 1 });
    } else {
      settled.delete(id);
    }
  }
  if (Object.keys(patch).length > 0) chem.setMixtures(patch);

  // Knocked-over vessels spill.
  const spills: Record<string, Mixture> = {};
  for (const w of inv.worldItems) {
    if (isBenchPaused(w.id) || useShowcase.getState().source === w.id) continue;
    const def = CATALOG[w.kind];
    if(isGrade9Rig(w.kind))continue; // Sealed compartments are managed by the apparatus engine.
    if (!def.upright) continue;
    const m = useChemStore.getState().mixtures[w.id] ?? seedMixture(w.variant);
    if (liquidMl(m) < 0.3) continue;
    const p = livePose(w);
    if (p.upY > 0.35) continue;
    const out = Math.min(liquidMl(m), 45 * dt);
    const { taken, rest } = takeLiquid(m, out);
    spills[w.id] = rest;
    spillMixture(taken, p.x, surfaceYAt(p.x, p.z, p.y + 0.05), p.z, w.id);
    note(w.id, 'spill', 6000);
  }
  if (Object.keys(spills).length > 0) chem.setMixtures(spills);

  // Burette: drops fall into the vessel under the tip.
  for (const w of inv.worldItems) {
    if (isBenchPaused(w.id) || useShowcase.getState().source === w.id) continue;
    if (w.kind !== 'burette') continue;
    const tool = useChemStore.getState().tools[w.id];
    const flow = tool?.flow ?? 0;
    if (!flow) continue;
    const m = mixtureOf(w.id, w.variant);
    if (liquidMl(m) < 0.005) continue;
    const amount = BURETTE_RATE[flow] * dt;
    const tip = buretteTip(w);
    const receiver = inv.worldItems.find((v) => {
      if (v.id === w.id || !isContainer(v.kind)) return false;
      const p = livePose(v);
      return Math.hypot(p.x - tip.x, p.z - tip.z) < 0.05 && p.y < tip.y && p.y + CATALOG[v.kind].size[1] > tip.y - 0.12;
    });
    let moved = 0;
    if (receiver) {
      moved = transfer({ id: w.id, kind: w.kind, variant: w.variant }, { id: receiver.id, kind: receiver.kind, variant: receiver.variant }, amount).moved;
    } else {
      const { taken, rest } = takeLiquid(m, amount);
      moved = liquidMl(taken);
      useChemStore.getState().setMixtures({ [w.id]: rest });
      spillMixture(taken, tip.x, surfaceYAt(tip.x, tip.z, tip.y), tip.z, w.id);
    }
    useChemStore.getState().setTool(w.id, { delivered: (tool?.delivered ?? 0) + moved });
  }

  // Plain water puddles dry up after a while.
  const puddles = useChemStore.getState().puddles;
  const dried = puddles.filter((p) => !p.hazardous && now - p.t0 > 90000);
  dried.forEach((p) => useChemStore.getState().removePuddle(p.id));
}

export function ChemSim() {
  const acc = useRef(0);
  useEffect(() => startSpeedRecorder(), []);
  useEffect(() => startAnnouncer(), []);
  useEffect(() => {
    // The room canvas freezes during ordinary F-inspect; keep its live chemistry at 10 Hz.
    const timer = window.setInterval(() => { if (useGameStore.getState().mode === 'inspect') simulate(TICK); }, TICK * 1000);
    return () => window.clearInterval(timer);
  }, []);
  useFrame((_, dt) => {
    if (useGameStore.getState().mode === 'inspect') return;
    tickUse(Math.min(dt, 0.1));
    acc.current += dt;
    if (acc.current < TICK) return;
    const d = Math.min(0.25, acc.current);
    acc.current = 0;
    simulate(d);
  });
  return null;
}
