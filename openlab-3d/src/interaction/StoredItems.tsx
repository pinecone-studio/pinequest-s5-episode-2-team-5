/**
 * Items kept in a holder (bench drawer, cabinet shelf, test-tube rack), laid out in its
 * slots. Each one can be taken (E), inspected (F), poured into / used with R, and Q
 * puts the held item back into the same holder.
 */
import { memo, useMemo } from 'react';
import { CATALOG, type EquipmentKind } from '../equipment/equipmentCatalog';
import { EquipmentModel } from '../equipment/registry';
import { RACK_SLOTS } from '../equipment/TestTubeRack';
import { REAGENTS } from '../chemistry/reagents';
import { summarize } from '../chemistry/describe';
import { useChemStore, seedMixture } from '../store/useChemStore';
import { useGameStore } from '../store/useGameStore';
import { storedIn, useInventoryStore } from '../store/useInventoryStore';
import { HOLDER_CAPACITY, STORAGE_INFO, holderCategory, holderType, type StoredItem } from './holders';
import { Interactable } from './Interactable';
import { NameTag } from './NameTag';
import { storeInto, takeFrom } from './storage';

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

function layoutPoses(items: StoredItem[], layout: HolderLayout): Pose[] {
  if (layout.type === 'rack') return items.map((_, i) => ({ position: RACK_SLOTS[Math.min(i, RACK_SLOTS.length - 1)], rotation: [0, 0, 0] }));
  const width = layout.width - 0.05;
  const rows: { y: number; z: number }[] =
    layout.type === 'drawer'
      ? [
          { y: 0, z: -0.075 },
          { y: 0, z: -0.2 },
          { y: 0, z: -0.3 },
        ]
      : [
          { y: 0, z: -0.09 },
          { y: layout.shelfY, z: -0.09 },
          { y: 0, z: -0.24 },
          { y: layout.shelfY, z: -0.24 },
        ];
  const poses: Pose[] = [];
  let row = 0;
  let cursor = -width / 2;
  for (const it of items) {
    const w = footX(it.kind) + 0.012;
    if (cursor + w > width / 2 && cursor > -width / 2) {
      row = Math.min(rows.length - 1, row + 1);
      cursor = -width / 2;
    }
    const r = rows[row];
    const x = LYING.includes(it.kind) || it.kind === 'graduatedCylinder' ? cursor + w / 2 - (it.kind === 'graduatedCylinder' ? 0.125 : 0) : cursor + w / 2;
    poses.push(storedPose(it.kind, x, r.y, r.z));
    cursor += w;
  }
  return poses;
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

export function HolderContents({ holderId, layout, interactive = true }: { holderId: string; layout: HolderLayout; interactive?: boolean }) {
  const stored = useInventoryStore((s) => s.storage[holderId]);
  const items = stored ?? storedIn({}, holderId);
  const poses = useMemo(() => layoutPoses(items, layout), [items, layout]);
  return (
    <group>
      {items.map((item, i) => (
        <StoredItemView key={item.id} item={item} holderId={holderId} pose={poses[i]} interactive={interactive} />
      ))}
    </group>
  );
}

/** "Шургуулга · Шилэн сав (5/8)". */
export function holderLabel(holderId: string, base: string): string {
  const category = holderCategory(holderId);
  const n = storedIn(useInventoryStore.getState().storage, holderId).length;
  return `${base} · ${STORAGE_INFO[category].label} (${n}/${HOLDER_CAPACITY[STORAGE_INFO[category].type]})`;
}
