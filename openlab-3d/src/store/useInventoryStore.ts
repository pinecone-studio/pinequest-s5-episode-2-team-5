import { create } from 'zustand';
import { usePortableStore } from '../interaction/portable';
import { CATALOG, type EquipmentKind } from '../equipment/equipmentCatalog';
import { createInitialItems, type ItemVariant, type WorldItem } from '../world/itemsLayout';
import { HOLDER_CAPACITY, holderType, seedHolder, type StoredItem } from '../interaction/holders';

export interface HeldItem {
  id: string;
  kind: EquipmentKind;
  variant?: ItemVariant;
  /** Tongs or a test-tube holder gripping this item; it stays in the hand when the item is set down. */
  grip?: { id: string; kind: EquipmentKind; variant?: ItemVariant };
}

const MAX_WORLD_ITEMS = 140;
let spawnCounter = 1;

interface InventoryState {
  worldItems: WorldItem[];
  held: HeldItem | null;
  /** Contents of every holder that has been changed (drawers, cabinets, racks). */
  storage: Record<string, StoredItem[]>;
  placedCount: number;
  spawnedCount: number;
  brokenCount: number;
  /** Bumped on reset so every physics body is recreated at its seed position. */
  generation: number;
  /** Takes a loose item into the hand; while holding tongs / a holder it is gripped instead. */
  pickUp: (id: string) => boolean;
  place: (position: [number, number, number], rotY: number) => boolean;
  throwHeld: (position: [number, number, number], quaternion: [number, number, number, number], velocity: [number, number, number], spin: [number, number, number]) => boolean;
  spawn: (kind: EquipmentKind, position: [number, number, number], rotY?: number, variant?: ItemVariant) => string | null;
  /** A loose item is destroyed (broken glass). */
  removeWorld: (id: string) => void;
  /** Removes an item wherever it is (world, hand, storage). */
  consume: (id: string) => void;
  takeStored: (holderId: string, itemId: string) => boolean;
  storeHeld: (holderId: string) => 'ok' | 'full' | 'empty' | 'wrong';
  setVariant: (id: string, variant: ItemVariant) => void;
  stowHeld: () => void;
  reset: () => void;
}

export function storedIn(storage: Record<string, StoredItem[]>, holderId: string): StoredItem[] {
  return storage[holderId] ?? seedHolder(holderId);
}

/** Can this kind go into that holder? Racks take only test tubes; big items fit nowhere. */
export function fitsHolder(kind: EquipmentKind, holderId: string): boolean {
  const type = holderType(holderId);
  if (type === 'rack') return kind === 'testTube';
  if (kind === 'fireExtinguisher' || kind === 'scale' || kind === 'burette') return false;
  if (type === 'drawer') return CATALOG[kind].size[1] < 0.22 || kind === 'graduatedCylinder';
  return true;
}

export const useInventoryStore = create<InventoryState>()((set, get) => ({
  worldItems: createInitialItems(),
  held: null,
  storage: {},
  placedCount: 0,
  spawnedCount: 0,
  brokenCount: 0,
  generation: 0,
  pickUp: (id) => {
    if (usePortableStore.getState().held) return false;
    const held = get().held;
    const item = get().worldItems.find((w) => w.id === id);
    if (!item) return false;
    if (held) {
      // A free gripping tool takes hold of the item.
      if (!CATALOG[held.kind].grip || held.grip) return false;
      set((s) => ({
        worldItems: s.worldItems.filter((w) => w.id !== id),
        held: { id: item.id, kind: item.kind, variant: item.variant, grip: { id: held.id, kind: held.kind, variant: held.variant } },
      }));
      return true;
    }
    set((s) => ({
      worldItems: s.worldItems.filter((w) => w.id !== id),
      held: { id: item.id, kind: item.kind, variant: item.variant },
    }));
    return true;
  },
  place: (position, rotY) => {
    const held = get().held;
    if (!held) return false;
    const item: WorldItem = { id: held.id, kind: held.kind, variant: held.variant, position, rotY };
    set((s) => ({
      worldItems: [...s.worldItems, item],
      held: held.grip ? { ...held.grip } : null,
      placedCount: s.placedCount + 1,
    }));
    return true;
  },
  throwHeld: (position, quaternion, velocity, spin) => {
    const held = get().held;
    if (!held) return false;
    const item: WorldItem = { id: held.id, kind: held.kind, variant: held.variant, position, rotY: 0, quaternion, velocity, spin };
    set((s) => ({ worldItems: [...s.worldItems, item], held: held.grip ? { ...held.grip } : null }));
    return true;
  },
  spawn: (kind, position, rotY = 0, variant) => {
    if (get().worldItems.length >= MAX_WORLD_ITEMS) return null;
    const id = `spawn-${spawnCounter++}-${kind}`;
    const item: WorldItem = { id, kind, position, rotY, variant };
    set((s) => ({ worldItems: [...s.worldItems, item], spawnedCount: s.spawnedCount + 1 }));
    return id;
  },
  removeWorld: (id) => set((s) => ({ worldItems: s.worldItems.filter((w) => w.id !== id), brokenCount: s.brokenCount + 1 })),
  consume: (id) =>
    set((s) => {
      if (s.held?.id === id) return { held: s.held.grip ? { ...s.held.grip } : null };
      if (s.worldItems.some((w) => w.id === id)) return { worldItems: s.worldItems.filter((w) => w.id !== id) };
      for (const [holder, list] of Object.entries(s.storage)) {
        if (list.some((it) => it.id === id)) return { storage: { ...s.storage, [holder]: list.filter((it) => it.id !== id) } };
      }
      return s;
    }),
  takeStored: (holderId, itemId) => {
    if (usePortableStore.getState().held) return false;
    const s = get();
    const list = storedIn(s.storage, holderId);
    const item = list.find((it) => it.id === itemId);
    if (!item) return false;
    const rest = list.filter((it) => it.id !== itemId);
    if (s.held) {
      if (!CATALOG[s.held.kind].grip || s.held.grip) return false;
      const grip = { id: s.held.id, kind: s.held.kind, variant: s.held.variant };
      set({ storage: { ...s.storage, [holderId]: rest }, held: { ...item, grip } });
      return true;
    }
    set({ storage: { ...s.storage, [holderId]: rest }, held: { id: item.id, kind: item.kind, variant: item.variant } });
    return true;
  },
  storeHeld: (holderId) => {
    const s = get();
    const held = s.held;
    if (!held) return 'empty';
    if (!fitsHolder(held.kind, holderId)) return 'wrong';
    const list = storedIn(s.storage, holderId);
    if (list.length >= HOLDER_CAPACITY[holderType(holderId)]) return 'full';
    set({
      storage: { ...s.storage, [holderId]: [...list, { id: held.id, kind: held.kind, variant: held.variant }] },
      held: held.grip ? { ...held.grip } : null,
      placedCount: s.placedCount + 1,
    });
    return 'ok';
  },
  setVariant: (id, variant) =>
    set((s) =>
      s.held?.id === id
        ? { held: { ...s.held, variant } }
        : { worldItems: s.worldItems.map((w) => (w.id === id ? { ...w, variant } : w)) },
    ),
  stowHeld: () => set({ held: null }),
  reset: () => set((s) => ({ worldItems: createInitialItems(), held: null, storage: {}, placedCount: 0, spawnedCount: 0, brokenCount: 0, generation: s.generation + 1 })),
}));
