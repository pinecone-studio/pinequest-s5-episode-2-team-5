/**
 * A loose item in the world: a dynamic rapier body (CCD on, so it cannot tunnel through
 * a bench) wrapped in an Interactable. It clinks or knocks when it hits something, glass
 * shatters on hard impacts, and it shows its live contents. E picks it up (or does the
 * item's own action: light a burner, tare the balance, open the burette, wear goggles…),
 * G always picks it up, F inspects, R uses the held item on it, Q stores into a rack.
 */
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, CylinderCollider, RigidBody, type CollisionEnterPayload, type RapierRigidBody } from '@react-three/rapier';
import { CATALOG, isContainer, type ColliderShape } from '../equipment/equipmentCatalog';
import { EquipmentModel } from '../equipment/registry';
import { REAGENTS } from '../chemistry/reagents';
import { fmtMl, summarize } from '../chemistry/describe';
import { liquidMl, solidMassG } from '../chemistry/mixture';
import { useExperimentStore } from '../store/useExperimentStore';
import { useGameStore } from '../store/useGameStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { mixtureOf, seedMixture, useChemStore, type ToolState } from '../store/useChemStore';
import { emitLab } from '../lab/events';
import { PICKABLE_COLLISION } from '../utils/constants';
import { sounds } from '../utils/sounds';
import type { WorldItem } from '../world/itemsLayout';
import { breakItem, BREAK_SPEED, impactSound } from '../physics/breakage';
import { bodies, gramsOnPan, preSpeeds } from './bodies';
import { Interactable } from './Interactable';
import { NameTag } from './NameTag';
import { HolderContents } from './StoredItems';
import { storeInto, mayTake } from './storage';
import { isInactiveBenchObject, isWorkbenchObject, useWorkbench } from '../experiments/workbench/session';
import { useLabStore } from '../store/useLabStore';

const FLOW_WORDS = ['хаалттай', 'дуслаар', 'удаан урсгал', 'хурдан урсгал'];

/** Name shown in the prompt and on the floating tag. */
function itemTitle(item: WorldItem, tool?: ToolState): { name: string; detail?: string } {
  const def = CATALOG[item.kind];
  const m = useChemStore.getState().mixtures[item.id] ?? seedMixture(item.variant);
  const reagent = item.variant?.reagent ? REAGENTS[item.variant.reagent] : undefined;
  if (reagent) {
    const left = reagent.solid ? `${Math.round(solidMassG(m))} г` : fmtMl(liquidMl(m));
    return { name: reagent.name, detail: `${def.name} · ${left}` };
  }
  if (item.kind === 'burette') {
    return { name: def.name, detail: `${fmtMl(liquidMl(m))} · кран ${FLOW_WORDS[tool?.flow ?? 0]}${tool?.delivered ? ` · гарсан ${tool.delivered.toFixed(1)} мл` : ''}` };
  }
  if (item.kind === 'thermometer' && tool?.reading !== undefined) return { name: def.name, detail: `${tool.reading.toFixed(1)} °C` };
  if (!isContainer(item.kind)) return { name: def.name };
  const summary = summarize(m);
  const hot = m.temp > 35 ? ` · ${Math.round(m.temp)} °C` : m.temp < 15 ? ` · ${Math.round(m.temp)} °C` : '';
  return { name: def.name, detail: summary ? summary + hot : hot.replace(' · ', '') || undefined };
}

function ItemColliders({ shape, mass }: { shape: ColliderShape; mass: number }) {
  const common = { friction: 0.9, restitution: 0.08, collisionGroups: PICKABLE_COLLISION };
  if (shape.shape === 'cuboid') {
    return <CuboidCollider args={[shape.size[0] / 2, shape.size[1] / 2, shape.size[2] / 2]} position={[0, shape.size[1] / 2, 0]} mass={mass} {...common} />;
  }
  if (shape.shape === 'cylinder') {
    return <CylinderCollider args={[shape.height / 2, shape.radius]} position={[0, shape.height / 2, 0]} mass={mass} {...common} />;
  }
  return (
    <>
      {shape.parts.map((p, i) =>
        p.shape === 'cuboid' ? (
          <CuboidCollider key={i} args={[p.size[0] / 2, p.size[1] / 2, p.size[2] / 2]} position={p.offset} mass={p.mass} {...common} />
        ) : (
          <CylinderCollider key={i} args={[p.height / 2, p.radius]} position={p.offset} mass={p.mass} {...common} />
        ),
      )}
    </>
  );
}

/** Live balance reading (items can be pushed on and off the pan). */
function useBalanceGrams(item: WorldItem): number {
  const [grams, setGrams] = useState(0);
  const frame = useRef(0);
  useFrame(() => {
    if (item.kind !== 'scale') return;
    frame.current = (frame.current + 1) % 8;
    if (frame.current !== 0) return;
    const g = gramsOnPan(item, useInventoryStore.getState().worldItems);
    if (Math.abs(g - grams) > 0.0005) setGrams(g);
  });
  return grams;
}

/** Flame-test tint that switches itself off. */
function useFlameColor(id: string): string | undefined {
  const flame = useChemStore((s) => s.flames[id]);
  const [, force] = useState(0);
  useEffect(() => {
    if (!flame) return;
    const ms = flame.until - performance.now();
    if (ms <= 0) return;
    const t = window.setTimeout(() => force((n) => n + 1), ms + 30);
    return () => window.clearTimeout(t);
  }, [flame]);
  return flame && flame.until > performance.now() ? flame.color : undefined;
}

export const Pickable = memo(function Pickable({ item }: { item: WorldItem }) {
  const def = CATALOG[item.kind];
  const body = useRef<RapierRigidBody>(null);
  const focused = useGameStore((s) => s.focus?.id === item.id);
  const lit = useExperimentStore((s) => item.kind === 'bunsenBurner' && !!s.toggles[item.id]);
  const tare = useExperimentStore((s) => s.values[`tare-${item.id}`] ?? 0);
  const mixture = useChemStore((s) => s.mixtures[item.id]);
  const tool = useChemStore((s) => s.tools[item.id]);
  const heldGrip = useInventoryStore((s) => !!s.held && !!CATALOG[s.held.kind].grip && !s.held.grip);
  const holdingTube = useInventoryStore((s) => s.held?.kind === 'testTube');
  const flameColor = useFlameColor(item.id);
  const grams = useBalanceGrams(item);
  const reading = Math.max(-999, grams - tare).toFixed(3);
  const { name, detail } = itemTitle(item, tool);

  useEffect(() => {
    const b = body.current;
    if (!b) return;
    bodies.set(item.id, b);
    return () => {
      if (bodies.get(item.id) === b) bodies.delete(item.id);
      preSpeeds.delete(item.id);
    };
  }, [item.id]);

  const grab = () => {
    if (!mayTake(item.id, item.variant)) return;
    const exp = useExperimentStore.getState();
    if (item.kind === 'bunsenBurner' && exp.toggles[item.id]) exp.toggle(item.id);
    if (useInventoryStore.getState().pickUp(item.id)) sounds.play('pickup');
  };

  let onInteract = grab;
  let verb = heldGrip ? 'хавчиж авах' : 'авах';
  let label = detail ? `${name} · ${detail}` : name;
  let onWheel: ((d: number) => void) | undefined;
  if (item.kind === 'bunsenBurner') {
    verb = lit ? 'унтраах' : 'асаах';
    onInteract = () => {
      const exp = useExperimentStore.getState();
      const on = exp.toggle(item.id);
      if (on) {
        exp.markSkill('burner');
        emitLab({ key: 'burner:on', quiet: true, itemId: item.id });
      }
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
      emitLab({ key: 'tare', quiet: true });
      useGameStore.getState().logEvent(grams > 0 ? `Тавган дээр ${grams.toFixed(3)} г ачаатай жинг тэглэлээ.` : 'Хоосон жинг тэглэлээ.');
      sounds.play('beep');
    };
  } else if (def.wearable) {
    const what = def.wearable;
    verb = 'зүүх';
    onInteract = () => {
      const chem = useChemStore.getState();
      if (chem.worn[what]) {
        useGameStore.getState().showToast(what === 'goggles' ? 'Нүдний шил аль хэдийн зүүсэн' : 'Бээлий аль хэдийн өмссөн');
        return;
      }
      chem.setWorn(what, true);
      useInventoryStore.getState().consume(item.id);
      sounds.play('pickup');
      emitLab({ key: `wear:${what}`, title: what === 'goggles' ? 'Хамгаалалтын шил зүүлээ' : 'Бээлий өмслөө', detail: 'Аюулгүй ажиллагааны эхний алхам!' });
    };
  } else if (item.kind === 'burette') {
    const flow = tool?.flow ?? 0;
    verb = flow > 0 ? 'краныг хаах' : 'краныг нээх';
    onInteract = () => {
      const chem = useChemStore.getState();
      const next = (chem.tools[item.id]?.flow ?? 0) > 0 ? 0 : 1;
      chem.setTool(item.id, { flow: next });
      sounds.play('click', 0.7);
      if (next > 0) emitLab({ key: 'burette:open', quiet: true, itemId: item.id });
    };
    onWheel = (d) => {
      const chem = useChemStore.getState();
      const flow = Math.min(3, Math.max(0, (chem.tools[item.id]?.flow ?? 0) + d));
      chem.setTool(item.id, { flow });
      sounds.play('tick', 0.6);
      if (flow > 0) emitLab({ key: 'burette:open', quiet: true, itemId: item.id });
    };
  } else if (item.kind === 'mortar' && solidMassG(mixture ?? seedMixture(item.variant)) > 0.01 && !(mixture?.fine ?? false)) {
    verb = 'нунтаглах';
    onInteract = () => {
      const m = mixtureOf(item.id, item.variant);
      useChemStore.getState().setMixtures({ [item.id]: { ...m, fine: true } });
      sounds.play('fizz', 0.4);
      emitLab({ key: 'grind', title: 'Нунтагласан', detail: 'Нунтаг бодис гадаргуу ихтэй тул хурдан уусч, урвалд орно.' });
    };
  }

  const onCollisionEnter = (payload: CollisionEnterPayload) => {
    let speed = preSpeeds.get(item.id) ?? 0;
    const other = payload.other.rigidBody;
    if (other && other.isDynamic()) {
      const v = other.linvel();
      speed = Math.max(speed, Math.hypot(v.x, v.y, v.z));
    }
    if (speed > 0.6) impactSound(item, speed);
    if (def.glass && speed > BREAK_SPEED) breakItem(item);
  };

  // Optional props must be left out entirely: rapier's option setters do not accept undefined.
  const benchVisual = useRef<Group>(null);
  useLayoutEffect(() => {
    if (isWorkbenchObject(item.id)) benchVisual.current?.traverse((object) => { object.castShadow = false; });
  });
  const motion = {
    ...(item.quaternion ? { quaternion: item.quaternion } : { rotation: [0, item.rotY, 0] as [number, number, number] }),
    ...(item.velocity ? { linearVelocity: item.velocity } : {}),
    ...(item.spin ? { angularVelocity: item.spin } : {}),
  };
  return (
    <RigidBody
      ref={body}
      type="dynamic"
      colliders={false}
      position={item.position}
      {...motion}
      ccd
      canSleep
      linearDamping={0.3}
      angularDamping={0.9}
      collisionGroups={PICKABLE_COLLISION}
      onCollisionEnter={onCollisionEnter}
    >
      <ItemColliders shape={def.collider} mass={def.massKg} />
      <Interactable
        id={item.id}
        label={label}
        verb={verb}
        inspectKind={item.kind}
        onInteract={onInteract}
        onGrab={grab}
        onWheel={onWheel}
        useTarget={{ type: 'item', id: item.id, kind: item.kind, variant: item.variant }}
        onStore={item.kind === 'testTubeRack' && holdingTube ? () => storeInto(item.id) : undefined}
        storeVerb="тавиурт хийх"
      >
        <group ref={benchVisual}><EquipmentModel kind={item.kind} variant={item.variant} mixture={mixture} itemId={item.id} lit={lit} flameColor={flameColor} reading={reading} tool={tool} /></group>
        {item.kind === 'testTubeRack' && <HolderContents holderId={item.id} layout={{ type: 'rack' }} />}
      </Interactable>
      {focused && <NameTag title={name} subtitle={detail} height={def.size[1]} />}
    </RigidBody>
  );
});

export function WorldItems() {
  useWorkbench((s) => s.sessions);
  useLabStore((s) => s.active);
  const items = useInventoryStore((s) => s.worldItems);
  const generation = useInventoryStore((s) => s.generation);
  return (
    <group>
      {items.filter((item) => !isInactiveBenchObject(item.id)).map((item) => (
        <Pickable key={`${generation}-${item.id}`} item={item} />
      ))}
    </group>
  );
}
