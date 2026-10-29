import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SPAWN } from '../world/layout';
import type { EquipmentKind } from '../equipment/equipmentCatalog';
import { emitLab } from '../lab/events';
import type { StarMood } from '../lab/starLines';

/**
 * walk        – free first-person movement
 * paused      – Esc pause menu
 * ui          – a HUD panel (menu, notes, tools, help) has the cursor
 * inspect     – an object floats in front of the camera (F)
 * bench       – seated at an experiment bench: free mouse, orbit/zoom camera (NaCl station)
 */
export type Mode = 'loading' | 'start' | 'walk' | 'paused' | 'ui' | 'inspect' | 'bench' | 'ended';
export type Panel = 'none' | 'menu' | 'notes' | 'tools' | 'help' | 'endConfirm';
export type RobotMood = StarMood;

export interface FocusInfo {
  id: string;
  label: string;
  verb: string;
  canUse: boolean;
  canInspect: boolean;
  /** G picks it up although E does something else. */
  canGrab: boolean;
  /** Q puts the held item in here (open drawer, cabinet, rack). */
  canStore: boolean;
  storeVerb?: string;
  canDrag: boolean;
  canScroll: boolean;
}

export interface LogEntry {
  t: number;
  text: string;
}

/** Non-reactive per-frame player data (read in render loops, never subscribed to). */
export const playerState = {
  position: { x: SPAWN.x, y: 0, z: SPAWN.z },
  yaw: SPAWN.yaw,
  pitch: 0,
  speed: 0,
  grounded: true,
};

/** Imperative hooks the Player registers so UI code can move the camera/body. */
export const playerApi: {
  teleport: (x: number, z: number, yaw: number) => void;
} = {
  teleport: () => undefined,
};

interface GameState {
  mode: Mode;
  panel: Panel;
  pointerLocked: boolean;
  /** The mouse was freed with the cursor key so HUD buttons can be clicked while walking. */
  cursorFree: boolean;
  focus: FocusInfo | null;
  dragging: string | null;
  inspectTarget: { kind: EquipmentKind; sourceId: string } | null;
  inspectedKinds: EquipmentKind[];
  robot: { text: string; id: number; mood: RobotMood; open: boolean };
  toast: { title: string; subtitle?: string; id: number } | null;
  log: LogEntry[];
  notes: string;
  sessionStart: number;
  endedAt: number | null;
  setMode: (mode: Mode) => void;
  openPanel: (panel: Panel) => void;
  closePanel: () => void;
  setPointerLocked: (locked: boolean) => void;
  setCursorFree: (free: boolean) => void;
  setFocus: (focus: FocusInfo | null) => void;
  setDragging: (id: string | null) => void;
  startInspect: (kind: EquipmentKind, sourceId: string) => void;
  say: (text: string, mood?: RobotMood) => void;
  setRobotOpen: (open: boolean) => void;
  showToast: (title: string, subtitle?: string) => void;
  logEvent: (text: string) => void;
  setNotes: (notes: string) => void;
  endSession: () => void;
  restart: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      mode: 'loading',
      panel: 'none',
      pointerLocked: false,
      cursorFree: false,
      focus: null,
      dragging: null,
      inspectTarget: null,
      inspectedKinds: [],
      robot: { text: '', id: 0, mood: 'idle', open: false },
      toast: null,
      log: [],
      notes: '',
      sessionStart: Date.now(),
      endedAt: null,
      setMode: (mode) => set({ mode, focus: mode === 'walk' ? get().focus : null, cursorFree: mode === 'walk' ? get().cursorFree : false }),
      openPanel: (panel) => set({ panel, mode: panel === 'none' ? 'walk' : 'ui', focus: null }),
      closePanel: () => set({ panel: 'none', mode: 'walk' }),
      setPointerLocked: (pointerLocked) => set({ pointerLocked }),
      setCursorFree: (cursorFree) => set({ cursorFree }),
      setFocus: (focus) => {
        const prev = get().focus;
        if (prev?.id === focus?.id && prev?.label === focus?.label && prev?.verb === focus?.verb && prev?.canStore === focus?.canStore && prev?.canScroll === focus?.canScroll) return;
        set({ focus });
      },
      setDragging: (dragging) => set({ dragging }),
      startInspect: (kind, sourceId) => {
        emitLab({ key: `inspect:${kind}`, quiet: true, itemId: sourceId });
        const inspected = get().inspectedKinds;
        set({
          mode: 'inspect',
          inspectTarget: { kind, sourceId },
          focus: null,
          inspectedKinds: inspected.includes(kind) ? inspected : [...inspected, kind],
        });
      },
      say: (text, mood = 'wave') => set((s) => ({ robot: { text, id: s.robot.id + 1, mood, open: true } })),
      setRobotOpen: (open) => set((s) => ({ robot: { ...s.robot, open } })),
      showToast: (title, subtitle) => set({ toast: { title, subtitle, id: Date.now() } }),
      logEvent: (text) => set((s) => ({ log: [...s.log.slice(-199), { t: Date.now(), text }] })),
      setNotes: (notes) => set({ notes }),
      endSession: () => set({ mode: 'ended', panel: 'none', endedAt: Date.now(), focus: null }),
      restart: () =>
        set({
          mode: 'start',
          panel: 'none',
          focus: null,
          dragging: null,
          inspectTarget: null,
          inspectedKinds: [],
          log: [],
          sessionStart: Date.now(),
          endedAt: null,
        }),
    }),
    {
      name: 'openlab3d-notebook',
      version: 1,
      // Only the lab notebook text survives reloads.
      partialize: (s) => ({ notes: s.notes }),
    },
  ),
);
