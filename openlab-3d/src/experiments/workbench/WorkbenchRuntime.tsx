import { CATALOG } from '../../equipment/equipmentCatalog';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Box3, Box3Helper, Vector3 } from 'three';
import { useGameStore, playerState } from '../../store/useGameStore';
import { useLabStore } from '../../store/useLabStore';
import { registeredHolders, STORAGE_INFO } from '../../interaction/holders';
import { storedIn, useInventoryStore } from '../../store/useInventoryStore';
import { interactables, isVisibleInScene } from '../../interaction/registry';
import { currentSession, itemDescription, itemPosition, matchesSupply, suppliesFor } from './session';
import { preparationSpots } from './PreparationHints';

type Projected = { x: number; y: number; visible: boolean } | null;
export const reactionProjection: { project: (id: string) => Projected; inspect: () => Projected } = { project: () => null, inspect: () => null };
export function WorkbenchRuntime() {
  const camera = useThree((s) => s.camera);
  const clock = useRef(0);
  const helpers = useMemo(() => [0, 1, 2].map(() => { const h = new Box3Helper(new Box3(), '#ffffff'); h.visible = false; h.raycast = () => undefined; return h; }), []);
  useEffect(() => {
    reactionProjection.project = (id) => {
      const p = itemPosition(id); p.y += .07; p.project(camera);
      return { x: (p.x + 1) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2, visible: p.z > -1 && p.z < 1 };
    };
    return () => { reactionProjection.project = () => null; helpers.forEach((h) => h.dispose()); };
  }, [camera, helpers]);
  useFrame((_, dt) => {
    clock.current += dt;
    if (clock.current < .25) return;
    clock.current = 0;
    helpers.forEach((h) => { h.visible = false; }); preparationSpots.length = 0;
    const session = currentSession();
    if (!session || session.ready || !['walk', 'bench'].includes(useGameStore.getState().mode)) return;
    const inventory = useInventoryStore.getState();
    for (const supply of suppliesFor(useLabStore.getState().active).filter((r) => !session.found.includes(r.key))) {
      if (preparationSpots.length === 3) break;
      const entries = [...interactables.values()].filter((e) => e.enabled && isVisibleInScene(e.object) && matchesSupply(supply, itemDescription(e.id)));
      entries.sort((a, b) => itemPosition(a.id).distanceTo(playerState.position) - itemPosition(b.id).distanceTo(playerState.position));
      let entry = entries[0];
      let text = supply.name;
      if (!entry) {
        const holder = registeredHolders().find((h) => interactables.has(h.id) && storedIn(inventory.storage, h.id).some((it) => matchesSupply(supply, { id: it.id, kind: it.kind, reagent: it.variant?.reagent })));
        if (holder) { entry = interactables.get(holder.id)!; text = `${supply.name} · ${STORAGE_INFO[holder.category].label}`; }
      }
      if (!entry) continue;
      const kind = itemDescription(entry.id).kind;
      const box = kind ? new Box3().setFromCenterAndSize(itemPosition(entry.id).add(new Vector3(0, CATALOG[kind].size[1] / 2, 0)), new Vector3(...CATALOG[kind].size)) : new Box3().setFromObject(entry.object);
      const at = box.getCenter(new Vector3()); at.y = box.max.y + .03;
      at.project(camera);
      if (at.z < -1 || at.z > 1 || Math.abs(at.x) > 1.1 || Math.abs(at.y) > 1.1) continue;
      const helper = helpers[preparationSpots.length]; helper.box.copy(box); helper.visible = true;
      preparationSpots.push({ x: (at.x + 1) * innerWidth / 2, y: (1 - at.y) * innerHeight / 2, text, visible: true });
    }
  });
  return <group>{helpers.map((h, i) => <primitive key={i} object={h} />)}</group>;
}
