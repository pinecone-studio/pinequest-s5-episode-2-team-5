/**
 * Renders the carried item at the lower right of the view with a lagging sway, and a
 * translucent ghost where it will land (bench top under the crosshair, else the nearest
 * surface, else the floor in front). Q places it there.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { Mesh, MeshBasicMaterial, Quaternion, Vector3, type Group } from 'three';
import { EquipmentModel } from '../equipment/registry';
import { CATALOG } from '../equipment/equipmentCatalog';
import { playerState, useGameStore } from '../store/useGameStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { sounds } from '../utils/sounds';
import { heldApi } from './heldApi';
import { panHeightAt } from './balance';
import { nearestSurfacePoint, raycastSurfaces, type Placement } from './surfaces';
import { playerBodyRef } from '../controls/Player';

const ghostOk = new MeshBasicMaterial({ color: '#bff3ff', transparent: true, opacity: 0.35, depthWrite: false });
const ghostFloor = new MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.35, depthWrite: false });
const GLASS_KINDS = new Set(['beaker', 'erlenmeyer', 'testTube', 'graduatedCylinder', 'reagentBottle', 'petriDish', 'pipette', 'thermometer', 'specimenJar', 'testTubeRack', 'glassRod', 'funnel', 'watchGlass', 'evaporatingDish', 'volumetricFlask', 'washBottle', 'mortar']);

const offset = new Vector3(0.2, -0.24, -0.42);
const tmpV = new Vector3();
const dir = new Vector3();

export function HeldItem() {
  const held = useInventoryStore((s) => s.held);
  const camera = useThree((s) => s.camera);
  const { world, rapier } = useRapier();
  const hand = useRef<Group>(null);
  const ghost = useRef<Group>(null);
  const smoothQ = useRef(new Quaternion());
  const ghostIsFloor = useRef(false);

  const footprint = useMemo(() => {
    if (!held) return 0.05;
    const s = CATALOG[held.kind].size;
    return Math.max(s[0], s[2]) / 2;
  }, [held]);

  useEffect(() => {
    smoothQ.current.copy(camera.quaternion);
    heldApi.place = () => {
      const target = heldApi.target;
      const h = useInventoryStore.getState().held;
      if (!target || !h) return false;
      const inv = useInventoryStore.getState();
      // Over a balance pan the item rests on the pan, not on the bench beside it.
      const y = (h.kind === 'scale' ? null : panHeightAt(target.point.x, target.point.z, inv.worldItems)) ?? target.point.y;
      const ok = inv.place([target.point.x, y + 0.012, target.point.z], playerState.yaw);
      if (ok) sounds.play(GLASS_KINDS.has(h.kind) ? 'clink' : 'tick', 1);
      return ok;
    };
    return () => {
      heldApi.place = () => false;
      heldApi.target = null;
    };
  }, [camera]);

  useFrame((_, dt) => {
    if (!held) {
      heldApi.target = null;
      return;
    }
    const settings = useSettingsStore.getState();
    const sway = !settings.reducedMotion;
    // Hand-held model.
    if (hand.current) {
      if (sway) smoothQ.current.slerp(camera.quaternion, 1 - Math.exp(-14 * dt));
      else smoothQ.current.copy(camera.quaternion);
      const bobble = sway ? Math.sin(performance.now() / 1000 * 7) * 0.004 * Math.min(1, playerState.speed / 3) : 0;
      tmpV.copy(offset);
      tmpV.y += bobble;
      tmpV.applyQuaternion(smoothQ.current).add(camera.position);
      hand.current.position.copy(tmpV);
      hand.current.quaternion.copy(smoothQ.current);
      hand.current.visible = useGameStore.getState().mode === 'walk';
    }
    // Placement target.
    camera.getWorldDirection(dir);
    let target: Placement | null = raycastSurfaces(camera.position, dir, 3.0, footprint);
    let floor = false;
    if (!target) target = nearestSurfacePoint(playerState.position, 1.2, footprint + 0.02);
    if (!target) {
      floor = true;
      const flat = tmpV.set(dir.x, 0, dir.z);
      if (flat.lengthSq() < 1e-4) flat.set(-Math.sin(playerState.yaw), 0, -Math.cos(playerState.yaw));
      flat.normalize();
      let reach = 0.75;
      const origin = { x: playerState.position.x, y: 0.3, z: playerState.position.z };
      const hit = world.castRay(new rapier.Ray(origin, { x: flat.x, y: 0, z: flat.z }), reach + 0.2, true, undefined, undefined, undefined, playerBodyRef.current ?? undefined, (c) => {
        const rb = c.parent();
        return !rb || rb.isFixed();
      });
      if (hit) reach = Math.max(0.35, hit.timeOfImpact - 0.25);
      target = { point: new Vector3(origin.x + flat.x * reach, 0, origin.z + flat.z * reach), surfaceId: 'floor' };
    }
    heldApi.target = target;
    ghostIsFloor.current = floor;
    if (ghost.current) {
      ghost.current.position.copy(target.point);
      ghost.current.rotation.set(0, playerState.yaw, 0);
      ghost.current.visible = useGameStore.getState().mode === 'walk';
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

  if (!held) return null;
  return (
    <group>
      <group ref={hand}>
        <group rotation={[0.15, -0.5, 0]}>
          <EquipmentModel kind={held.kind} variant={held.variant} />
        </group>
      </group>
      <group ref={ghost}>
        <EquipmentModel kind={held.kind} variant={held.variant} />
      </group>
    </group>
  );
}
