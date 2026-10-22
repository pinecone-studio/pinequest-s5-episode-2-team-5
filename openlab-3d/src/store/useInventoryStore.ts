import { create } from 'zustand';
import type { EquipmentKind } from '../equipment/equipmentCatalog';
import { createInitialItems, type ItemVariant, type WorldItem } from '../world/itemsLayout';
import { roomAt } from '../world/layout';

export interface HeldItem {
  id: string;
  kind: EquipmentKind;
  variant?: ItemVariant;
}

const MAX_WORLD_ITEMS = 90;
let spawnCounter = 1;

interface InventoryState {
  worldItems: WorldItem[];
  held: HeldItem | null;
  placedCount: number;
  spawnedCount: number;
  /** Bumped on reset so every physics body is recreated at its seed position. */
  generation: number;
  pickUp: (id: string) => boolean;
  place: (position: [number, number, number], rotY: number) => boolean;
  spawn: (kind: EquipmentKind, position: [number, number, number], rotY?: number) => string | null;
  stowHeld: () => void;
  reset: () => void;
}

export const useInventoryStore = create<InventoryState>()((set, get) => ({
  worldItems: createInitialItems(),
  held: null,
  placedCount: 0,
  spawnedCount: 0,
  generation: 0,
  pickUp: (id) => {
    if (get().held) return false;
    const item = get().worldItems.find((w) => w.id === id);
    if (!item) return false;
    set((s) => ({
      worldItems: s.worldItems.filter((w) => w.id !== id),
      held: { id: item.id, kind: item.kind, variant: item.variant },
    }));
    return true;
  },
  place: (position, rotY) => {
    const held = get().held;
    if (!held) return false;
    const item: WorldItem = {
      id: held.id,
      kind: held.kind,
      variant: held.variant,
      position,
      rotY,
      room: roomAt(position[0], position[2]) ?? 'mainHall',
    };
    set((s) => ({ worldItems: [...s.worldItems, item], held: null, placedCount: s.placedCount + 1 }));
    return true;
  },
  spawn: (kind, position, rotY = 0) => {
    if (get().worldItems.length >= MAX_WORLD_ITEMS) return null;
    const id = `spawn-${spawnCounter++}-${kind}`;
    const item: WorldItem = { id, kind, position, rotY, room: roomAt(position[0], position[2]) ?? 'mainHall' };
    set((s) => ({ worldItems: [...s.worldItems, item], spawnedCount: s.spawnedCount + 1 }));
    return id;
  },
  stowHeld: () => set({ held: null }),
  reset: () => set((s) => ({ worldItems: createInitialItems(), held: null, placedCount: 0, spawnedCount: 0, generation: s.generation + 1 })),
}));
