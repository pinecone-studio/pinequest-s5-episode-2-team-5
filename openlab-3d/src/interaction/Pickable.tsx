/**
 * A loose item in the world: a dynamic rapier body (CCD on, so it cannot tunnel through
 * a bench) wrapped in an Interactable. E picks it up, F inspects it.
 */
import { memo, useRef } from 'react';
import { CuboidCollider, CylinderCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { CATALOG, isContainer } from '../equipment/equipmentCatalog';
import { EquipmentModel } from '../equipment/registry';
import { SUBSTANCES, summarizeContents, totalMl } from '../chemistry/substances';
import { useExperimentStore } from '../store/useExperimentStore';
import { useGameStore } from '../store/useGameStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { PICKABLE_COLLISION } from '../utils/constants';
import { sounds } from '../utils/sounds';
import type { WorldItem } from '../world/itemsLayout';
import { gramsOnPan } from './balance';
import { Interactable } from './Interactable';
import { NameTag } from './NameTag';
import { pourWith } from './pour';

/** Name shown in the prompt and on the floating tag: "Урвалжийн лонх · HCl" / "Химийн аяга", plus contents. */
function itemTitle(item: WorldItem): { name: string; detail?: string } {
  const def = CATALOG[item.kind];
  const contents = item.variant?.contents;
  if (item.kind === 'reagentBottle' && contents?.[0]) return { name: SUBSTANCES[contents[0].id].name, detail: `${def.name} · ${Math.round(totalMl(contents))} мл` };
  const summary = summarizeContents(contents);
  return { name: def.name, detail: summary || undefined };
}

export const Pickable = memo(function Pickable({ item }: { item: WorldItem }) {
  const def = CATALOG[item.kind];
  const body = useRef<RapierRigidBody>(null);
  const c = def.collider;
  const focused = useGameStore((s) => s.focus?.id === item.id);
  const lit = useExperimentStore((s) => item.kind === 'bunsenBurner' && !!s.toggles[item.id]);
  const tare = useExperimentStore((s) => s.values[`tare-${item.id}`] ?? 0);
  const grams = useInventoryStore((s) => (item.kind === 'scale' ? gramsOnPan(item, s.worldItems) : 0));
  const pourVerb = useInventoryStore((s) => {
    const h = s.held;
    if (!isContainer(item.kind) || !h || !isContainer(h.kind)) return undefined;
    return totalMl(h.variant?.contents) > 0.01 ? 'энэ сав руу асгах' : 'эндээс бодис авах';
  });
  const reading = Math.max(-999, grams - tare).toFixed(3);
  const { name, detail } = itemTitle(item);

  const grab = () => {
    if (useInventoryStore.getState().held) {
      useGameStore.getState().showToast('Гар завгүй байна', 'Эхлээд барьж буй зүйлээ Q дарж тавь');
      return;
    }
    const exp = useExperimentStore.getState();
    if (item.kind === 'bunsenBurner' && exp.toggles[item.id]) exp.toggle(item.id);
    if (useInventoryStore.getState().pickUp(item.id)) sounds.play('pickup');
  };

  let onInteract = grab;
  let verb = 'авах';
  let label = name;
  if (item.kind === 'bunsenBurner') {
    verb = lit ? 'унтраах' : 'асаах';
    onInteract = () => {
      const exp = useExperimentStore.getState();
      const on = exp.toggle(item.id);
      if (on) exp.markSkill('burner');
      useGameStore.getState().logEvent(on ? 'Бунзены горелк асаалаа.' : 'Бунзены горелк унтраалаа.');
      sounds.play('puff', 0.7);
    };
  } else if (item.kind === 'scale') {
    verb = 'тэглэх';
    label = `${name} (${reading} г)`;
    onInteract = () => {
      const exp = useExperimentStore.getState();
      exp.setValue(`tare-${item.id}`, grams);
      exp.markSkill('tare');
      useGameStore.getState().logEvent(grams > 0 ? `Тавган дээр ${grams.toFixed(3)} г ачаатай жинг тэглэлээ.` : 'Хоосон жинг тэглэлээ.');
      sounds.play('beep');
    };
  } else if (detail) {
    label = `${name} · ${detail}`;
  }

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
        label={label}
        verb={verb}
        inspectKind={item.kind}
        onInteract={onInteract}
        onGrab={grab}
        onPour={pourVerb ? () => pourWith(item.id) : undefined}
        pourVerb={pourVerb}
      >
        <EquipmentModel kind={item.kind} variant={item.variant} lit={lit} reading={reading} />
      </Interactable>
      {focused && <NameTag title={name} subtitle={detail} height={def.size[1]} />}
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
