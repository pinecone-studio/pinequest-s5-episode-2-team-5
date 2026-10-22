/**
 * Chemical and physical state that is not part of an item's identity: what every vessel
 * holds (keyed by item id, created lazily from the item's seed), instrument readings,
 * spilled puddles, glass-shard bursts, flame-test colors and the safety gear worn.
 */
import { create } from 'zustand';
import type { Cation } from '../chemistry/species';
import { emptyMixture, merge, reagentMixture, type Mixture } from '../chemistry/mixture';
import { REAGENTS } from '../chemistry/reagents';
import type { ItemVariant } from '../world/itemsLayout';

export interface ToolState {
  /** Thermometer: last reading, °C. */
  reading?: number;
  /** Nichrome loop: cations picked up by dipping it into a solution. */
  sample?: Partial<Record<Cation, number>>;
  /** pH paper: color of the last strip. */
  strip?: string;
  /** Funnel: color of the residue on the filter paper. */
  residue?: string;
  /** Burette stopcock: 0 closed … 3 fully open. */
  flow?: number;
  /** Burette: mL delivered since it was last filled. */
  delivered?: number;
}

export interface Puddle {
  /** Vessel identities contributing to this spill, for scoped attempt cleanup. */
  sourceIds?: string[];
  id: string;
  x: number;
  y: number;
  z: number;
  /** Spilled volume, mL (sets the radius). */
  ml: number;
  color: string;
  hazardous: boolean;
  t0: number;
}

export interface Burst {
  sourceId?: string;
  id: string;
  x: number;
  y: number;
  z: number;
  t0: number;
}

const seedCache = new WeakMap<ItemVariant, Mixture>();
const EMPTY = emptyMixture();

/** What an item holds before anyone touched it: its reagent stock or its seed fill. */
export function seedMixture(variant: ItemVariant | undefined): Mixture {
  if (!variant) return EMPTY;
  let m = seedCache.get(variant);
  if (!m) {
    if (variant.reagent) {
      m = reagentMixture(variant.reagent, variant.amount ?? REAGENTS[variant.reagent].stock);
    } else if (variant.fill && variant.fill.length > 0) {
      m = variant.fill.reduce((acc, f) => merge(acc, reagentMixture(f.reagent, f.amount)), emptyMixture());
    } else {
      m = EMPTY;
    }
    seedCache.set(variant, m);
  }
  return m;
}

let puddleCounter = 1;
let burstCounter = 1;
const MAX_PUDDLES = 40;

interface ChemState {
  mixtures: Record<string, Mixture>;
  tools: Record<string, ToolState>;
  puddles: Puddle[];
  bursts: Burst[];
  /** Flame-test color per burner id. */
  flames: Record<string, { color: string; until: number }>;
  worn: { goggles: boolean; gloves: boolean };
  setMixtures: (patch: Record<string, Mixture>) => void;
  removeMixture: (id: string) => void;
  setTool: (id: string, patch: Partial<ToolState>) => void;
  addPuddle: (p: Omit<Puddle, 'id' | 't0'>) => void;
  removePuddle: (id: string) => void;
  addBurst: (x: number, y: number, z: number, sourceId?: string) => void;
  setFlame: (burnerId: string, color: string, seconds: number) => void;
  setWorn: (what: 'goggles' | 'gloves', on: boolean) => void;
  reset: () => void;
}

export const useChemStore = create<ChemState>()((set, get) => ({
  mixtures: {},
  tools: {},
  puddles: [],
  bursts: [],
  flames: {},
  worn: { goggles: false, gloves: false },
  setMixtures: (patch) => set((s) => ({ mixtures: { ...s.mixtures, ...patch } })),
  removeMixture: (id) =>
    set((s) => {
      if (!(id in s.mixtures)) return s;
      const next = { ...s.mixtures };
      delete next[id];
      return { mixtures: next };
    }),
  setTool: (id, patch) => set((s) => ({ tools: { ...s.tools, [id]: { ...s.tools[id], ...patch } } })),
  addPuddle: (p) => {
    const now = performance.now();
    const puddles = get().puddles;
    // Merge into a nearby puddle on the same surface.
    const near = puddles.find((q) => Math.abs(q.y - p.y) < 0.05 && Math.hypot(q.x - p.x, q.z - p.z) < 0.12);
    if (near) {
      set({ puddles: puddles.map((q) => (q === near ? { ...q, sourceIds: [...new Set([...(q.sourceIds ?? []), ...(p.sourceIds ?? [])])], ml: q.ml + p.ml, color: p.ml > q.ml ? p.color : q.color, hazardous: q.hazardous || p.hazardous, t0: now } : q)) });
      return;
    }
    set({ puddles: [...puddles.slice(-(MAX_PUDDLES - 1)), { ...p, id: `puddle-${puddleCounter++}`, t0: now }] });
  },
  removePuddle: (id) => set((s) => ({ puddles: s.puddles.filter((p) => p.id !== id) })),
  addBurst: (x, y, z, sourceId) => set((s) => ({ bursts: [...s.bursts.filter((b) => performance.now() - b.t0 < 3000), { id: `burst-${burstCounter++}`, x, y, z, sourceId, t0: performance.now() }] })),
  setFlame: (burnerId, color, seconds) => set((s) => ({ flames: { ...s.flames, [burnerId]: { color, until: performance.now() + seconds * 1000 } } })),
  setWorn: (what, on) => set((s) => ({ worn: { ...s.worn, [what]: on } })),
  reset: () => set({ mixtures: {}, tools: {}, puddles: [], bursts: [], flames: {}, worn: { goggles: false, gloves: false } }),
}));

/** Current contents of an item (live state, else its seed). */
export function mixtureOf(id: string, variant?: ItemVariant): Mixture {
  return useChemStore.getState().mixtures[id] ?? seedMixture(variant);
}

/** React hook form of mixtureOf. */
export function useMixture(id: string | undefined, variant?: ItemVariant): Mixture {
  const live = useChemStore((s) => (id ? s.mixtures[id] : undefined));
  return live ?? seedMixture(variant);
}
