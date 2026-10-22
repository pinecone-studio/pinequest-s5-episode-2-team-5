/**
 * The carried item at the lower right of the view (with the tongs or holder gripping it),
 * a translucent ghost where Q will put it down (bench top under the crosshair, a raised
 * spot such as the tripod gauze or balance pan, else the floor), the pour animation with
 * a liquid stream into the target, and throwing (hold T to wind up).
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { Color, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, Quaternion, Raycaster, Vector2, Vector3, type Group } from 'three';
import { EquipmentModel } from '../equipment/registry';
import { CATALOG } from '../equipment/equipmentCatalog';
import { liquidMl } from '../chemistry/mixture';
import { playerState, useGameStore } from '../store/useGameStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { mixtureOf, useChemStore } from '../store/useChemStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { sounds } from '../utils/sounds';
import { heldApi, tablePointer } from './heldApi';
import { supportHeightAt } from './bodies';
import { raycastSurfaces, type Placement } from './surfaces';
import { actionVisual } from './actions';
import { HolderContents } from './StoredItems';
import { interactables } from './registry';
import { portableApi, usePortableStore } from './portable';
import { labSpace, labUse } from '../experiments/nacl/sandbox';
import { endHeldUse } from './useHeld';
import { playerBodyRef } from '../controls/Player';

const ghostOk = new MeshBasicMaterial({ color: '#bff3ff', transparent: true, opacity: 0.35, depthWrite: false });
const ghostFloor = new MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.35, depthWrite: false });
const streamMaterial = new MeshPhysicalMaterial({ color: '#cfe6f5', transparent: true, opacity: 0.85, roughness: 0.05, clearcoat: 1, emissiveIntensity: 0.15 });
const sprayMaterial = new MeshBasicMaterial({ color: '#f1f5f9', transparent: true, opacity: 0.45, depthWrite: false });

const cursorRay = new Raycaster();
const center = new Vector2();

const offset = new Vector3(0.2, -0.24, -0.42);
const tmpV = new Vector3();
const dir = new Vector3();
const spout = new Vector3();
const end = new Vector3();
const mid = new Vector3();
const up = new Vector3(0, 1, 0);

/** Hand-held pose: tubes stand up, long tools point forward. */
function handRotation(kind: string): [number, number, number] {
  if (kind === 'fireExtinguisher') return [0.1, -0.2, 0];
  return [0.15, -0.5, 0];
}

export function HeldItem() {
  const held = useInventoryStore((s) => s.held);
  const portable = usePortableStore((s) => s.held);
  const mixture = useChemStore((s) => (held ? s.mixtures[held.id] : undefined));
  const tool = useChemStore((s) => (held ? s.tools[held.id] : undefined));
  const camera = useThree((s) => s.camera);
  const { world, rapier } = useRapier();
  const hand = useRef<Group>(null);
  const tilt = useRef<Group>(null);
  const ghost = useRef<Group>(null);
  const stream = useRef<Mesh>(null);
  const spray = useRef<Mesh>(null);
  const smoothQ = useRef(new Quaternion());
  const tiltAmount = useRef(0);

  const footprint = useMemo(() => {
    if (portable) return portable.footprint;
    if (!held) return 0.05;
    const s = CATALOG[held.kind].size;
    return Math.max(s[0], s[2]) / 2;
  }, [held, portable]);

  const solve = useCallback((): Placement | null => {
    const livePortable = usePortableStore.getState().held;
    const liveHeld = useInventoryStore.getState().held;
    if (!livePortable && !liveHeld) { heldApi.target = null; return null; }
    const bench = useGameStore.getState().mode === 'bench';
    if (bench && !tablePointer.active) { heldApi.target = null; return null; }
    const margin = livePortable?.footprint ?? (liveHeld ? Math.max(CATALOG[liveHeld.kind].size[0], CATALOG[liveHeld.kind].size[2]) / 2 : 0.04);
    camera.updateWorldMatrix(true, false);
    cursorRay.setFromCamera(bench ? tablePointer.ndc : center, camera);
    const { origin, direction } = cursorRay.ray;
    const reach = bench ? 5 : 3;
    let target = raycastSurfaces(origin, direction, reach, margin);
    // No nearest-surface fallback: use the point the cursor/crosshair actually hits.
    if (!target && direction.y < -0.001) {
      const t = -origin.y / direction.y;
      if (t > 0 && t < reach) target = { point: origin.clone().addScaledVector(direction, t), surfaceId: 'floor' };
    }
    if (target) {
      const distance = origin.distanceTo(target.point);
      const hit = world.castRay(new rapier.Ray(origin, direction), distance, true, undefined, undefined, undefined, playerBodyRef.current ?? undefined, (c) => !c.parent() || c.parent()!.isFixed());
      if (hit && hit.timeOfImpact < distance - 0.08) target = null;
    }
    heldApi.target = target;
    if (bench && target) tablePointer.lastPoint = target.point.clone();
    return target;
  }, [camera, world, rapier]);

  useEffect(() => {
    smoothQ.current.copy(camera.quaternion);
    heldApi.refreshTarget = solve;
    portableApi.place = () => {
      const target = solve(); const h = usePortableStore.getState().held;
      if (!target || !h) return false;
      endHeldUse();
      h.move(target.point.clone().add(new Vector3(0, .004, 0)), useGameStore.getState().mode === 'bench' ? tablePointer.angle : playerState.yaw, 0);
      usePortableStore.setState({ held: null });
      sounds.play('clink');
      return true;
    };
    heldApi.place = () => {
      const target = solve();
      const h = useInventoryStore.getState().held;
      if (!target || !h) return false;
      const inv = useInventoryStore.getState();
      if (h.kind === 'testTube' && liquidMl(mixtureOf(h.id, h.variant)) > 0.3) {
        useGameStore.getState().showToast('Шингэнтэй хуруу шилийг хэвтүүлж болохгүй', 'Хуруу шилний тавиур руу хараад Q дар — асгарна');
        return true;
      }
      const raised = supportHeightAt(target.point.x, target.point.z, inv.worldItems, h.kind);
      const y = Math.max(raised ?? -1, target.point.y);
      endHeldUse();
      const ok = inv.place([target.point.x, y + 0.012, target.point.z], useGameStore.getState().mode === 'bench' ? tablePointer.angle : playerState.yaw);
      if (ok) sounds.play(CATALOG[h.kind].glass ? 'clink' : 'tick', 1);
      return ok;
    };
    heldApi.throwHeld = (power) => {
      const h = useInventoryStore.getState().held;
      const g = hand.current;
      if (!h || !g) return false;
      g.updateWorldMatrix(true, false);
      const pos = new Vector3().setFromMatrixPosition(g.matrixWorld);
      camera.getWorldDirection(dir);
      const speed = 1.6 + power * 7.5;
      const vel: [number, number, number] = [dir.x * speed, dir.y * speed + 1 + power, dir.z * speed];
      const q = new Quaternion().setFromRotationMatrix(g.matrixWorld);
      const spin: [number, number, number] = [(Math.random() - 0.5) * 6 * power, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 6 * power];
      const ok = useInventoryStore.getState().throwHeld([pos.x, pos.y, pos.z], [q.x, q.y, q.z, q.w], vel, spin);
      if (ok) sounds.play('throw', 0.5 + power);
      return ok;
    };
    return () => {
      portableApi.place = () => false; heldApi.refreshTarget = () => null;
      heldApi.place = () => false;
      heldApi.throwHeld = () => false;
      heldApi.target = null;
    };
  }, [camera, solve]);

  useFrame((_, dt) => {
    const mode = useGameStore.getState().mode;
    const atBench = mode === 'bench';
    const visible = mode === 'walk' || atBench;
    const target = solve();
    const yaw = atBench ? tablePointer.angle : playerState.yaw;
    if (portable && usePortableStore.getState().held?.id === portable.id) {
      const preview = atBench && !labUse.source && (target?.point ?? tablePointer.lastPoint);
      const pouring = atBench && labUse.source === portable.id && labUse.target;
      const bottom = pouring ? labSpace.position(labUse.target!).add(new Vector3(.06, .12, 0))
        : preview ? preview.clone().add(new Vector3(0, .008, 0))
        : new Vector3(.14, -.2, -.45).applyQuaternion(camera.quaternion).add(camera.position);
      if (visible) portable.move(bottom, yaw, labUse.source === portable.id ? -.5 : 0);
      if (ghost.current) {
        ghost.current.visible = visible && !!target && !labUse.source;
        if (target) { ghost.current.position.copy(target.point).add(new Vector3(0, .005, 0)); ghost.current.rotation.set(0, yaw, 0); }
      }
      return;
    }
    if (!held) {
      heldApi.target = null;
      return;
    }
    const settings = useSettingsStore.getState();
    const game = useGameStore.getState();
    const sway = !settings.reducedMotion;
    const kind = actionVisual.kind;
    const pouring = kind === 'pour' || kind === 'drip';
    const benchPour = labUse.source === held.id;
    // Hand-held model.
    if (hand.current) {
      if (sway) smoothQ.current.slerp(camera.quaternion, 1 - Math.exp(-14 * dt));
      else smoothQ.current.copy(camera.quaternion);
      const bobble = sway ? Math.sin((performance.now() / 1000) * 7) * 0.004 * Math.min(1, playerState.speed / 3) : 0;
      tmpV.copy(offset);
      tmpV.y += bobble;
      // Bring the item toward the middle while using it.
      if (kind) {
        tmpV.x -= 0.1 * actionVisual.strength;
        tmpV.y += (kind === 'heat' ? 0.02 : 0.07) * actionVisual.strength;
      }
      tmpV.applyQuaternion(smoothQ.current).add(camera.position);
      hand.current.position.copy(tmpV);
      hand.current.quaternion.copy(smoothQ.current);
      hand.current.visible = visible && (!atBench || !!labUse.source || !target);
    }
    // Tilt to pour.
    const targetTilt = benchPour ? 0.65 : pouring ? (CATALOG[held.kind].drops ? 1.9 : 0.55 + 0.75 * actionVisual.strength) : 0;
    tiltAmount.current += (targetTilt - tiltAmount.current) * (1 - Math.exp(-10 * dt));
    if (tilt.current) tilt.current.rotation.z = tiltAmount.current;
    // Liquid stream from the spout to the target.
    const s = stream.current;
    if (s) {
      const entry = actionVisual.targetId ? interactables.get(actionVisual.targetId) : undefined;
      const show = pouring && !!entry && tiltAmount.current > 0.4 && !CATALOG[held.kind].drops;
      s.visible = show;
      if (show && entry && tilt.current) {
        const h = CATALOG[held.kind].size[1];
        spout.set(-0.03, h, 0);
        tilt.current.localToWorld(spout);
        entry.object.getWorldPosition(end);
        const targetKind = useInventoryStore.getState().worldItems.find((w) => w.id === actionVisual.targetId)?.kind;
        end.y += targetKind ? Math.min(0.08, CATALOG[targetKind].size[1] * 0.6) : 0.05;
        mid.copy(end).sub(spout);
        const len = mid.length();
        s.position.copy(spout).addScaledVector(mid, 0.5);
        s.quaternion.setFromUnitVectors(up, mid.normalize());
        const w = 0.6 + actionVisual.strength * 0.6;
        s.scale.set(w, len, w);
        streamMaterial.color.set(actionVisual.color);
        streamMaterial.emissive.copy(new Color(actionVisual.color));
      }
    }
    // CO₂ cloud from the extinguisher horn.
    if (spray.current) {
      spray.current.visible = kind === 'extinguish';
      if (kind === 'extinguish') {
        const t = performance.now() / 1000;
        spray.current.scale.set(0.35 + Math.sin(t * 30) * 0.03, 1.4, 0.35 + Math.cos(t * 27) * 0.03);
      }
    }
    // The same exact cursor solver is used on click and every preview frame.
    const floor = target?.surfaceId === 'floor';
    if (ghost.current) {
      ghost.current.visible = visible && !!target && !kind && !labUse.source;
      if (!target) return;
      const raised = supportHeightAt(target.point.x, target.point.z, useInventoryStore.getState().worldItems, held.kind);
      ghost.current.position.set(target.point.x, Math.max(raised ?? -1, target.point.y), target.point.z);
      ghost.current.rotation.set(0, yaw, 0);
      ghost.current.visible = visible && !game.focus?.canStore && !kind && !labUse.source;
      const mat = floor ? ghostFloor : ghostOk;
      ghost.current.traverse((o) => {
        if (o instanceof Mesh) {
          o.material = mat;
          o.castShadow = false;
          o.raycast = () => undefined;
        }
      });
    }
  });

  if (portable) return <group ref={ghost}><mesh rotation={[-Math.PI / 2, 0, 0]} material={ghostOk} raycast={() => undefined}><ringGeometry args={[footprint, footprint + .012, 32]} /></mesh></group>;
  if (!held) return null;
  const grip = held.grip;
  return (
    <group>
      <group ref={hand}>
        <group rotation={handRotation(held.kind)}>
          <group ref={tilt}>
            <EquipmentModel kind={held.kind} variant={held.variant} mixture={mixture} itemId={held.id} tool={tool} upright />
            {held.kind === 'testTubeRack' && <HolderContents holderId={held.id} layout={{ type: 'rack' }} interactive={false} />}
            {held.kind === 'fireExtinguisher' && (
              <mesh ref={spray} material={sprayMaterial} position={[0.06, 0.1, 0.6]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
                <coneGeometry args={[0.25, 1, 16, 1, true]} />
              </mesh>
            )}
          </group>
          {grip && (
            <group position={[0.02, CATALOG[held.kind].size[1] * 0.75, 0.03]} rotation={[0.4, 0, 0]}>
              <EquipmentModel kind={grip.kind} variant={grip.variant} />
            </group>
          )}
        </group>
      </group>
      <mesh ref={stream} material={streamMaterial} visible={false} raycast={() => undefined} userData={{ noOutline: true }}>
        <cylinderGeometry args={[0.0035, 0.0028, 1, 8, 1, true]} />
      </mesh>
      <group ref={ghost}>
        <EquipmentModel kind={held.kind} variant={held.variant} />
      </group>
    </group>
  );
}
