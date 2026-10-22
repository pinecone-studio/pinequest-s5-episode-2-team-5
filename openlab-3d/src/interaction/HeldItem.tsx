/** Shared carrying with an exact cursor placement preview at the worktop. */
import { useCallback, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector2, Vector3, type Group } from 'three';
import { EquipmentModel } from '../equipment/registry';
import { CATALOG } from '../equipment/equipmentCatalog';
import { playerState, useGameStore } from '../store/useGameStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { sounds } from '../utils/sounds';
import { heldApi, tablePointer } from './heldApi';
import { raycastSurfaces, type Placement } from './surfaces';
import { playerBodyRef } from '../controls/Player';
import { portableApi, usePortableStore } from './portable';
import { labSpace, labUse } from '../experiments/nacl/sandbox';

const ghostOk = new MeshBasicMaterial({ color: '#7ce7c3', transparent: true, opacity: 0.5, depthWrite: false });
const ghostFloor = new MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.45, depthWrite: false });
const offset = new Vector3(0.2, -0.24, -0.42);
const cursorRay = new Raycaster();
const center = new Vector2();

export function HeldItem() {
  const held = useInventoryStore((s) => s.held);
  const portable = usePortableStore((s) => s.held);
  const camera = useThree((s) => s.camera);
  const { world, rapier } = useRapier();
  const hand = useRef<Group>(null);
  const ghost = useRef<Group>(null);
  const smoothQ = useRef(new Quaternion());
  const footprint = portable?.footprint ?? (held ? Math.max(CATALOG[held.kind].size[0], CATALOG[held.kind].size[2]) / 2 : 0.04);

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
    heldApi.place = () => {
      const target = solve(); const h = useInventoryStore.getState().held;
      if (!target || !h) return false;
      labUse.end();
      const yaw = useGameStore.getState().mode === 'bench' ? tablePointer.angle : playerState.yaw;
      const ok = useInventoryStore.getState().place([target.point.x, target.point.y + 0.012, target.point.z], yaw);
      if (ok) sounds.play('clink');
      return ok;
    };
    portableApi.place = () => {
      const target = solve(); const h = usePortableStore.getState().held;
      if (!target || !h) return false;
      labUse.end();
      const yaw = useGameStore.getState().mode === 'bench' ? tablePointer.angle : playerState.yaw;
      h.move(target.point.clone().add(new Vector3(0, 0.004, 0)), yaw, 0);
      usePortableStore.setState({ held: null });
      sounds.play('clink');
      return true;
    };
    return () => { heldApi.place = () => false; portableApi.place = () => false; heldApi.refreshTarget = () => null; heldApi.target = null; };
  }, [camera, solve]);

  useFrame((_, dt) => {
    const mode = useGameStore.getState().mode;
    const atBench = mode === 'bench';
    const visible = mode === 'walk' || atBench;
    const target = solve();
    const yaw = atBench ? tablePointer.angle : playerState.yaw;
    if (portable && visible && usePortableStore.getState().held?.id === portable.id) {
      const preview = atBench && !labUse.source && (target?.point ?? tablePointer.lastPoint);
      const pouring = atBench && labUse.source === portable.id && labUse.target;
      const bottom = pouring ? labSpace.position(labUse.target!).add(new Vector3(0.06, 0.12, 0)) : preview ? preview.clone().add(new Vector3(0, 0.008, 0)) : new Vector3(0.14, -0.2, -0.45).applyQuaternion(camera.quaternion).add(camera.position);
      portable.move(bottom, yaw, labUse.source === portable.id ? -0.5 : 0);
    }
    if (hand.current) {
      const smooth = !useSettingsStore.getState().reducedMotion;
      if (smooth) smoothQ.current.slerp(camera.quaternion, 1 - Math.exp(-14 * dt)); else smoothQ.current.copy(camera.quaternion);
      hand.current.position.copy(offset).applyQuaternion(smoothQ.current).add(camera.position);
      hand.current.quaternion.copy(smoothQ.current);
      hand.current.visible = visible && (!atBench || !!labUse.source || !target);
    }
    if (ghost.current) {
      ghost.current.visible = visible && !!target;
      if (!target) return;
      ghost.current.position.copy(target.point).add(new Vector3(0, 0.005, 0));
      ghost.current.rotation.set(0, yaw, 0);
      ghost.current.traverse((o) => {
        if (o instanceof Mesh) { o.material = target.surfaceId === 'floor' ? ghostFloor : ghostOk; o.castShadow = false; o.raycast = () => undefined; }
      });
    }
  });

  if (!held && !portable) return null;
  if (portable) return <group ref={ghost}><mesh rotation={[-Math.PI / 2, 0, 0]} material={ghostOk} raycast={() => undefined}><ringGeometry args={[footprint, footprint + 0.012, 32]} /></mesh></group>;
  if (!held) return null;
  return <group>
    <group ref={hand}><group rotation={[0.15, -0.5, 0]}><EquipmentModel kind={held.kind} variant={held.variant} /></group></group>
    <group ref={ghost}><EquipmentModel kind={held.kind} variant={held.variant} /></group>
  </group>;
}
