/**
 * A loose item in the world: a dynamic rapier body (CCD on, so it cannot tunnel through
 * a bench) wrapped in an Interactable. E picks it up, F inspects it. Items only render
 * while their room is near the player.
 */
import { memo, useRef } from 'react';
import { CuboidCollider, CylinderCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { CATALOG } from '../equipment/equipmentCatalog';
import { EquipmentModel } from '../equipment/registry';
import { useGameStore } from '../store/useGameStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { PICKABLE_COLLISION } from '../utils/constants';
import { sounds } from '../utils/sounds';
import type { WorldItem } from '../world/itemsLayout';
import { Interactable } from './Interactable';

export const Pickable = memo(function Pickable({ item }: { item: WorldItem }) {
  const def = CATALOG[item.kind];
  const visible = useGameStore((s) => s.activeRooms.includes(item.room));
  const body = useRef<RapierRigidBody>(null);
  const c = def.collider;
  return (
    <RigidBody
      ref={body}
      type="dynamic"
      colliders={false}
      position={item.position}
      rotation={[0, item.rotY, 0]}
      ccd
      canSleep
      linearDamping={0.6}
      angularDamping={1.5}
      collisionGroups={PICKABLE_COLLISION}
    >
      {c.shape === 'cuboid' ? (
        <CuboidCollider args={[c.size[0] / 2, c.size[1] / 2, c.size[2] / 2]} position={[0, c.size[1] / 2, 0]} mass={def.massKg} friction={0.9} restitution={0.05} collisionGroups={PICKABLE_COLLISION} />
      ) : (
        <CylinderCollider args={[c.height / 2, c.radius]} position={[0, c.height / 2, 0]} mass={def.massKg} friction={0.9} restitution={0.05} collisionGroups={PICKABLE_COLLISION} />
      )}
      <Interactable
        id={item.id}
        label={def.name}
        verb="Pick up"
        inspectKind={item.kind}
        enabled={visible}
        onInteract={() => {
          if (useInventoryStore.getState().held) {
            useGameStore.getState().showToast('Hands full', 'Press Q to place what you are holding first');
            return;
          }
          if (useInventoryStore.getState().pickUp(item.id)) sounds.play('pickup');
        }}
      >
        <group visible={visible}>
          <EquipmentModel kind={item.kind} variant={item.variant} />
        </group>
      </Interactable>
    </RigidBody>
  );
});

export function WorldItems() {
  const items = useInventoryStore((s) => s.worldItems);
  const generation = useInventoryStore((s) => s.generation);
  return (
    <group>
      {items.map((item) => (
        <Pickable key={`${generation}-${item.id}`} item={item} />
      ))}
    </group>
  );
}
