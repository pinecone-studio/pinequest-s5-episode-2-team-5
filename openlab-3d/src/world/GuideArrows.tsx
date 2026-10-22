/**
 * Guided mode: glowing chevrons on the floor lead from the player to the next
 * experiment step, and a bobbing arrow hovers over the control to use next.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ExtrudeGeometry, InstancedMesh, MeshStandardMaterial, Object3D, Shape, Vector3, type Group } from 'three';
import { playerState, useGameStore } from '../store/useGameStore';
import { useExperimentStore, type StepId } from '../store/useExperimentStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { roomAt, type RoomId } from './layout';

const chevronGeometry = (() => {
  const s = new Shape();
  s.moveTo(-0.22, -0.12);
  s.lineTo(0, 0.1);
  s.lineTo(0.22, -0.12);
  s.lineTo(0.22, 0.0);
  s.lineTo(0, 0.22);
  s.lineTo(-0.22, 0.0);
  s.closePath();
  const g = new ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  return g;
})();
const arrowGeometry = (() => {
  const s = new Shape();
  s.moveTo(-0.05, 0.12);
  s.lineTo(0.05, 0.12);
  s.lineTo(0.05, 0.03);
  s.lineTo(0.1, 0.03);
  s.lineTo(0, -0.08);
  s.lineTo(-0.1, 0.03);
  s.lineTo(-0.05, 0.03);
  s.closePath();
  const g = new ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 });
  g.translate(0, 0.08, -0.015);
  return g;
})();
const guideMaterial = new MeshStandardMaterial({ color: '#000', emissive: '#F5B800', emissiveIntensity: 1.6, toneMapped: false, transparent: true, opacity: 0.9 });

const STATION_FRONT = new Vector3(-12, 0, -7.75);

/** Hover points over each control of the Millikan station (world space). */
const STEP_TARGETS: Partial<Record<StepId, [number, number, number]>> = {
  powerOn: [-11.84, 1.09, -8.93],
  sprayed: [-12.47, 1.03, -8.84],
  viewed: [-11.85, 1.39, -8.94],
  measuredFall: [-11.85, 1.39, -8.94],
  measuredField: [-11.85, 1.39, -8.94],
  openedLaptop: [-11.42, 1.2, -8.9],
};

/** Doorway waypoints (lab side, hall side) used to route the floor path. */
const EXITS: Partial<Record<RoomId, [number, number][]>> = {
  chemistry: [
    [1, -4.2],
    [1, -1.8],
  ],
  storage: [
    [15, -4.2],
    [15, -1.6],
    [6.5, -1],
  ],
  corridor: [[6.5, -1]],
  biology: [
    [-7, 6.2],
    [-7, 3.8],
  ],
};

function buildPath(from: Vector3, room: RoomId | null): Vector3[] {
  const pts: Vector3[] = [new Vector3(from.x, 0, from.z)];
  if (room !== 'physics') {
    for (const [x, z] of EXITS[room ?? 'mainHall'] ?? []) pts.push(new Vector3(x, 0, z));
    pts.push(new Vector3(-12, 0, -1.6), new Vector3(-12, 0, -4.4));
  }
  pts.push(STATION_FRONT.clone());
  return pts;
}

const MAX_CHEVRONS = 18;
const SPACING = 0.85;

export function GuideArrows() {
  const guided = useSettingsStore((s) => s.guided);
  const steps = useExperimentStore((s) => s.steps);
  const chevrons = useRef<InstancedMesh>(null);
  const arrow = useRef<Group>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const next = useMemo(() => (Object.keys(STEP_TARGETS) as StepId[]).find((id) => !steps[id]) ?? null, [steps]);
  const done = steps.openedLaptop && steps.measuredField;

  useFrame((state) => {
    const mesh = chevrons.current;
    const mode = useGameStore.getState().mode;
    const show = guided && !done && (mode === 'walk' || mode === 'ui' || mode === 'paused');
    if (arrow.current) {
      const target = steps.reachedLab && next ? STEP_TARGETS[next] : null;
      arrow.current.visible = show && !!target;
      if (target) {
        arrow.current.position.set(target[0], target[1] + Math.sin(state.clock.elapsedTime * 3) * 0.03, target[2]);
        arrow.current.rotation.y = state.clock.elapsedTime * 1.5;
      }
    }
    if (!mesh) return;
    const nearStation = playerState.position.distanceTo(STATION_FRONT) < 1.2;
    if (!show || nearStation) {
      mesh.count = 0;
      return;
    }
    const path = buildPath(playerState.position, roomAt(playerState.position.x, playerState.position.z));
    const t = (state.clock.elapsedTime * 0.9) % SPACING;
    let placed = 0;
    let travelled = 0;
    let nextMark = 0.9 + t;
    for (let i = 0; i < path.length - 1 && placed < MAX_CHEVRONS; i++) {
      const a = path[i];
      const b = path[i + 1];
      const len = a.distanceTo(b);
      if (len < 0.01) continue;
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      while (nextMark <= travelled + len && placed < MAX_CHEVRONS) {
        const k = (nextMark - travelled) / len;
        dummy.position.set(a.x + (b.x - a.x) * k, 0.012, a.z + (b.z - a.z) * k);
        dummy.rotation.set(0, yaw + Math.PI, 0);
        const fade = 1 - placed / MAX_CHEVRONS;
        dummy.scale.setScalar(0.6 + 0.4 * fade);
        dummy.updateMatrix();
        mesh.setMatrixAt(placed++, dummy.matrix);
        nextMark += SPACING;
      }
      travelled += len;
    }
    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={chevrons} args={[chevronGeometry, guideMaterial, MAX_CHEVRONS]} frustumCulled={false} userData={{ noOutline: true }} />
      <group ref={arrow} visible={false}>
        <mesh geometry={arrowGeometry} material={guideMaterial} scale={0.45} position={[0, 0.04, 0]} userData={{ noOutline: true }} />
      </group>
    </group>
  );
}
