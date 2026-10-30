/**
 * Items kept in a holder (bench drawer, cabinet shelf, test-tube rack), laid out in its
 * slots. Each one can be taken (E), inspected (F), poured into / used with R, and Q
 * puts the held item back into the same holder.
 */
import { memo, useContext, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Frustum, Matrix4, Sphere, Vector3, type Group, type Object3D } from 'three';
import { CATALOG, type EquipmentKind } from '../equipment/equipmentCatalog';
import { EquipmentModel } from '../equipment/registry';
import { RACK_SLOTS } from '../equipment/TestTubeRack';
import { REAGENTS } from '../chemistry/reagents';
import { summarize } from '../chemistry/describe';
import { useChemStore, seedMixture } from '../store/useChemStore';
import { useGameStore } from '../store/useGameStore';
import { storedIn, useInventoryStore } from '../store/useInventoryStore';
import { HOLDER_CAPACITY, STORAGE_INFO, holderCategory, holderType, seedHolder, type StoredItem } from './holders';
import { Interactable } from './Interactable';
import { NameTag } from './NameTag';
import { storeInto, takeFrom } from './storage';
import { StillContext, useWakeHolder, type StillHolder } from './still';
import { mergeStill, unmerge, type StillBatch } from './stillBatch';
import { useSettingsStore } from '../store/useSettingsStore';

export type HolderLayout =
  | { type: 'drawer'; width: number }
  | { type: 'cabinet'; width: number; depth: number; shelfY: number }
  | { type: 'rack' };

const RACK_LAYOUT: HolderLayout = { type: 'rack' };

const LYING: EquipmentKind[] = ['testTube', 'pipette', 'thermometer', 'glassRod', 'spatula', 'tongs', 'testTubeHolder', 'wireLoop'];

interface Pose {
  position: [number, number, number];
  rotation: [number, number, number];
}

/** Footprint along x of an item in its stored pose. */
function footX(kind: EquipmentKind): number {
  const s = CATALOG[kind].size;
  if (LYING.includes(kind)) return s[2];
  if (kind === 'graduatedCylinder') return s[1];
  return s[0];
}

function storedPose(kind: EquipmentKind, x: number, y: number, z: number): Pose {
  if (LYING.includes(kind)) return { position: [x, y, z], rotation: [0, Math.PI / 2, 0] };
  if (kind === 'graduatedCylinder') return { position: [x + 0.125, y + 0.03, z], rotation: [0, 0, Math.PI / 2] };
  if (kind === 'tripod') return { position: [x, y + 0.085, z - 0.1], rotation: [Math.PI / 2, 0, 0] };
  return { position: [x, y, z], rotation: [0, 0, 0] };
}

/** A place in a holder: a seeded item's original spot (kept free while it is out), or an added one. */
interface Slot {
  kind: EquipmentKind;
  item?: StoredItem;
}

/** Seed index k of an item that started in this holder (id `<holder>#<k>-<kind>`), else -1. */
function seedIndex(holderId: string, itemId: string): number {
  if (!itemId.startsWith(`${holderId}#`)) return -1;
  const m = /^(\d+)-[A-Za-z]+$/.exec(itemId.slice(holderId.length + 1));
  return m ? Number(m[1]) : -1;
}

/**
 * Stable slots: seeded items keep their original place, so taking one leaves a gap
 * instead of shuffling its neighbours, and putting it back returns it to that gap.
 * Other items fill a free gap of the same kind (or a wide enough one), else go at the end.
 */
function holderSlots(holderId: string, items: StoredItem[]): Slot[] {
  const slots: Slot[] = seedHolder(holderId).map((s) => ({ kind: s.kind }));
  const extra: StoredItem[] = [];
  for (const it of items) {
    const k = seedIndex(holderId, it.id);
    if (k >= 0 && k < slots.length && !slots[k].item && slots[k].kind === it.kind) slots[k].item = it;
    else extra.push(it);
  }
  for (const it of extra) {
    const free = slots.find((s) => !s.item && s.kind === it.kind) ?? slots.find((s) => !s.item && footX(s.kind) >= footX(it.kind) - 0.005);
    if (free) free.item = it;
    else slots.push({ kind: it.kind, item: it });
  }
  return slots;
}

/** Fill rows left to right; a slot that does not fit moves on to the next row. */
function fillRows(slots: Slot[], rows: { y: number; z: number }[], width: number, out: Map<string, Pose>): void {
  let row = 0;
  let cursor = -width / 2;
  for (const slot of slots) {
    const w = footX(slot.kind) + 0.012;
    if (cursor + w > width / 2 && cursor > -width / 2) {
      row = Math.min(rows.length - 1, row + 1);
      cursor = -width / 2;
    }
    const r = rows[row];
    if (slot.item) out.set(slot.item.id, storedPose(slot.item.kind, cursor + w / 2 - (slot.item.kind === 'graduatedCylinder' ? 0.125 : 0), r.y, r.z));
    cursor += w;
  }
}

function layoutPoses(holderId: string, items: StoredItem[], layout: HolderLayout): Pose[] {
  const slots = holderSlots(holderId, items);
  const out = new Map<string, Pose>();
  if (layout.type === 'rack') {
    slots.forEach((s, i) => s.item && out.set(s.item.id, { position: RACK_SLOTS[Math.min(i, RACK_SLOTS.length - 1)], rotation: [0, 0, 0] }));
  } else if (layout.type === 'drawer') {
    fillRows(slots, [{ y: 0, z: -0.075 }, { y: 0, z: -0.2 }, { y: 0, z: -0.3 }], layout.width - 0.05, out);
  } else {
    // Cabinet: the first half of the slots stands on the shelf, the rest on the floor below.
    const seeded = seedHolder(holderId).length;
    const upper = Math.ceil(seeded / 2);
    const onShelf = (i: number) => (i < seeded ? i < upper : (i - seeded) % 2 === 1);
    const width = layout.width - 0.05;
    fillRows(slots.filter((_, i) => onShelf(i)), [{ y: layout.shelfY, z: -0.09 }, { y: layout.shelfY, z: -0.24 }], width, out);
    fillRows(slots.filter((_, i) => !onShelf(i)), [{ y: 0, z: -0.09 }, { y: 0, z: -0.24 }], width, out);
  }
  return items.map((it) => out.get(it.id) ?? { position: [0, 0, -0.2], rotation: [0, 0, 0] });
}

function titleOf(item: StoredItem): { name: string; detail?: string } {
  const reagent = item.variant?.reagent ? REAGENTS[item.variant.reagent] : undefined;
  if (reagent) return { name: reagent.name, detail: CATALOG[item.kind].name };
  const m = useChemStore.getState().mixtures[item.id] ?? seedMixture(item.variant);
  const summary = summarize(m);
  return { name: CATALOG[item.kind].name, detail: summary || undefined };
}

const StoredItemView = memo(function StoredItemView({ item, holderId, pose, interactive }: { item: StoredItem; holderId: string; pose: Pose; interactive: boolean }) {
  const mixture = useChemStore((s) => s.mixtures[item.id]);
  const tool = useChemStore((s) => s.tools[item.id]);
  const focused = useGameStore((s) => s.focus?.id === item.id);
  useWakeHolder();
  const model = (
    <>
      <EquipmentModel kind={item.kind} variant={item.variant} mixture={mixture} itemId={item.id} tool={tool} upright={item.kind === 'testTube' && holderType(holderId) === 'rack'} />
      {item.kind === 'testTubeRack' && <HolderContents holderId={item.id} layout={RACK_LAYOUT} interactive={false} />}
    </>
  );
  if (!interactive) return <group position={pose.position} rotation={pose.rotation}>{model}</group>;
  const { name, detail } = titleOf(item);
  const take = () => takeFrom(holderId, item.id);
  return (
    <group position={pose.position} rotation={pose.rotation}>
      <Interactable
        id={item.id}
        label={detail ? `${name} · ${detail}` : name}
        verb="авах"
        inspectKind={item.kind}
        onInteract={take}
        useTarget={{ type: 'item', id: item.id, kind: item.kind, variant: item.variant, holderId }}
        onStore={() => storeInto(holderId)}
        storeVerb="энд хийх"
      >
        {model}
      </Interactable>
      {focused && <NameTag title={name} subtitle={detail} height={item.kind === 'testTube' && holderType(holderId) === 'rack' ? 0.15 : CATALOG[item.kind].size[1]} />}
    </group>
  );
});

/** Contents farther than this are not drawn (with a margin before they show again), m. */
const SHOW_WITHIN = 5;
const HIDE_BEYOND = 5.5;
/** Covers a drawer tray or cabinet compartment around the contents' origin, m. */
const CONTENTS_RADIUS = 0.7;
/** Frames a change keeps the matrices updating (children may settle in their own effects). */
const WAKE_FRAMES = 4;
/** Safety net for changes nothing reported: full refresh this often, frames. */
const REFRESH_FRAMES = 30;

const frustum = new Frustum();
const viewProjection = new Matrix4();
const centre = new Vector3();
const bounds = new Sphere();

/**
 * Drawer or cabinet contents. three.js recomputes every object's world matrix every frame
 * and draws every part separately; a few hundred stored items at ~10 objects each cost more
 * than the rest of the room. Here the subtree's matrices are only recomputed when the holder
 * moves (drawer sliding), something inside re-renders, or every REFRESH_FRAMES; once nothing
 * has changed for WAKE_FRAMES the contents are drawn merged by material (stillBatch.ts).
 * Contents far away or off screen are not drawn at all.
 */
function StillGroup({ version, children }: { version: unknown; children: ReactNode }) {
  const ref = useRef<Group>(null);
  const batch = useRef<StillBatch>({ merged: [], originals: [] });
  // `batch.current` is one object for the group's lifetime; merges refill it.
  // A random phase keeps the holders' safety refreshes on different frames.
  const state = useMemo(() => ({ awake: WAKE_FRAMES, frame: Math.floor(Math.random() * REFRESH_FRAMES), last: new Matrix4(), dirty: true }), []);
  const still = useMemo<StillHolder>(() => ({
    wake: () => {
      state.awake = WAKE_FRAMES;
    },
    changed: () => {
      state.awake = WAKE_FRAMES;
      state.dirty = true;
      if (ref.current) unmerge(ref.current, batch.current);
    },
  }), [state]);
  // Models swap glass and liquid materials with the quality tier; the merged copy must follow.
  const quality = useSettingsStore((s) => s.quality);
  useLayoutEffect(() => still.changed(), [still, version, quality]);
  useLayoutEffect(() => {
    const group = ref.current;
    if (!group) return;
    group.updateMatrixWorld = function (this: Object3D, force?: boolean) {
      if (this.matrixAutoUpdate) this.updateMatrix();
      if (this.matrixWorldNeedsUpdate || force) {
        if (this.parent) this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
        else this.matrixWorld.copy(this.matrix);
        this.matrixWorldNeedsUpdate = false;
      }
      if (!this.visible) return;
      if (state.awake === 0 && state.frame % REFRESH_FRAMES !== 0 && state.last.equals(this.matrixWorld)) return;
      state.last.copy(this.matrixWorld);
      for (const child of this.children) child.updateMatrixWorld(true);
    };
    const merged = batch.current;
    return () => {
      Reflect.deleteProperty(group, 'updateMatrixWorld');
      unmerge(group, merged);
    };
  }, [state]);
  useFrame(({ camera }) => {
    const group = ref.current;
    if (!group) return;
    state.frame++;
    if (state.awake > 0) state.awake--;
    if (state.dirty && state.awake === 0 && group.visible) {
      mergeStill(group, batch.current);
      state.dirty = false;
    }
    centre.setFromMatrixPosition(group.matrixWorld);
    viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(viewProjection);
    const near = centre.distanceTo(camera.position) < (group.visible ? HIDE_BEYOND : SHOW_WITHIN);
    const show = near && frustum.intersectsSphere(bounds.set(centre, CONTENTS_RADIUS));
    if (show === group.visible) return;
    group.visible = show;
    if (show) state.awake = WAKE_FRAMES;
  });
  return (
    <StillContext.Provider value={still}>
      <group ref={ref}>{children}</group>
    </StillContext.Provider>
  );
}

export function HolderContents({ holderId, layout, interactive = true }: { holderId: string; layout: HolderLayout; interactive?: boolean }) {
  const stored = useInventoryStore((s) => s.storage[holderId]);
  const items = stored ?? storedIn({}, holderId);
  const poses = useMemo(() => layoutPoses(holderId, items, layout), [holderId, items, layout]);
  // Racks on a bench are a workspace (reactions run in their tubes), so only drawers and
  // cabinets, and racks stored inside them, hold still contents.
  const inStorage = useContext(StillContext) !== null;
  const contents = items.map((item, i) => (
    <StoredItemView key={item.id} item={item} holderId={holderId} pose={poses[i]} interactive={interactive} />
  ));
  if (layout.type === 'rack' || inStorage) return <group>{contents}</group>;
  return <StillGroup version={poses}>{contents}</StillGroup>;
}

/** "Шургуулга · Шилэн сав (5/8)". */
export function holderLabel(holderId: string, base: string): string {
  const category = holderCategory(holderId);
  const n = storedIn(useInventoryStore.getState().storage, holderId).length;
  return `${base} · ${STORAGE_INFO[category].label} (${n}/${HOLDER_CAPACITY[STORAGE_INFO[category].type]})`;
}
