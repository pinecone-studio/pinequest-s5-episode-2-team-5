/**
 * Automatic glass-paneled pocket door: two 0.8 m × 2.28 m aluminum-framed panels slide
 * apart into the 0.2 m wall when the player comes within 2.4 m. Each panel is a
 * kinematic rapier body, so a closed door blocks the player.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { MeshStandardMaterial } from 'three';
import { DOOR_HEIGHT, WALL_THICKNESS } from '../../utils/constants';
import { windowGlass } from '../../materials/glass';
import { playerState } from '../../store/useGameStore';
import { sounds } from '../../utils/sounds';
import { FONTS } from '../../utils/fonts';
import { DOORS, type DoorDef } from '../layout';

const frameMat = new MeshStandardMaterial({ color: '#b8bec5', metalness: 0.7, roughness: 0.3 });
const jambMat = new MeshStandardMaterial({ color: '#8d949c', metalness: 0.5, roughness: 0.4 });
const signMat = new MeshStandardMaterial({ color: '#2b3036', roughness: 0.5 });
const stripeMat = new MeshStandardMaterial({ color: '#F5B800', roughness: 0.5 });
const handleMat = new MeshStandardMaterial({ color: '#e5e8eb', metalness: 0.9, roughness: 0.15 });

const OPEN_DISTANCE = 2.4;
const PANEL_H = DOOR_HEIGHT - 0.02;
const PANEL_T = 0.04;

function Panel({ width, side }: { width: number; side: -1 | 1 }) {
  const stile = 0.06;
  return (
    <group>
      {/* Aluminum stiles and rails. */}
      <mesh material={frameMat} position={[-width / 2 + stile / 2, PANEL_H / 2, 0]} castShadow>
        <boxGeometry args={[stile, PANEL_H, PANEL_T]} />
      </mesh>
      <mesh material={frameMat} position={[width / 2 - stile / 2, PANEL_H / 2, 0]} castShadow>
        <boxGeometry args={[stile, PANEL_H, PANEL_T]} />
      </mesh>
      <mesh material={frameMat} position={[0, PANEL_H - stile / 2, 0]}>
        <boxGeometry args={[width, stile, PANEL_T]} />
      </mesh>
      <mesh material={frameMat} position={[0, 0.09, 0]}>
        <boxGeometry args={[width, 0.18, PANEL_T]} />
      </mesh>
      <mesh material={frameMat} position={[0, 1.02, 0]}>
        <boxGeometry args={[width, 0.05, PANEL_T]} />
      </mesh>
      {/* Glass inset. */}
      <mesh material={windowGlass} position={[0, (PANEL_H + 0.18) / 2, 0]} renderOrder={2} userData={{ noOutline: true }}>
        <boxGeometry args={[width - stile * 2, PANEL_H - 0.18 - stile, 0.01]} />
      </mesh>
      {/* Vertical pull bars on both faces, near the meeting edge. */}
      {[-1, 1].map((f) => (
        <mesh key={f} material={handleMat} position={[(width / 2 - 0.12) * -side, 1.05, f * (PANEL_T / 2 + 0.03)]}>
          <cylinderGeometry args={[0.012, 0.012, 0.5, 10]} />
        </mesh>
      ))}
    </group>
  );
}

export function Door({ def }: { def: DoorDef }) {
  const left = useRef<RapierRigidBody>(null);
  const right = useRef<RapierRigidBody>(null);
  const open = useRef(0);
  const wantOpen = useRef(false);
  const panelW = def.width / 2 + 0.02;
  // Local frame: the door spans local x; rotate for doors in z-running walls.
  const rotY = def.axis === 'x' ? 0 : Math.PI / 2;
  const along = useMemo(() => (def.axis === 'x' ? { x: 1, z: 0 } : { x: 0, z: -1 }), [def.axis]);

  useFrame((_, dt) => {
    const d = Math.hypot(playerState.position.x - def.x, playerState.position.z - def.z);
    const shouldOpen = d < OPEN_DISTANCE;
    if (shouldOpen !== wantOpen.current) {
      wantOpen.current = shouldOpen;
      sounds.play('door', 0.9);
    }
    const target = shouldOpen ? 1 : 0;
    const step = Math.min(1, dt * 1.6);
    open.current += Math.max(-step, Math.min(step, target - open.current));
    const k = open.current * open.current * (3 - 2 * open.current);
    const offset = def.width / 4 + (def.width / 2) * k;
    left.current?.setNextKinematicTranslation({ x: def.x - along.x * offset, y: 0, z: def.z - along.z * offset });
    right.current?.setNextKinematicTranslation({ x: def.x + along.x * offset, y: 0, z: def.z + along.z * offset });
  });

  const signNormal = def.signSide * (WALL_THICKNESS / 2 + 0.012);
  return (
    <group>
      {/* Jamb trims and header on both faces. */}
      <group position={[def.x, 0, def.z]} rotation={[0, rotY, 0]}>
        {[-1, 1].map((face) => (
          <group key={face} position={[0, 0, face * (WALL_THICKNESS / 2 + 0.01)]}>
            <mesh material={jambMat} position={[-def.width / 2 - 0.03, DOOR_HEIGHT / 2, 0]}>
              <boxGeometry args={[0.06, DOOR_HEIGHT, 0.02]} />
            </mesh>
            <mesh material={jambMat} position={[def.width / 2 + 0.03, DOOR_HEIGHT / 2, 0]}>
              <boxGeometry args={[0.06, DOOR_HEIGHT, 0.02]} />
            </mesh>
            <mesh material={jambMat} position={[0, DOOR_HEIGHT + 0.03, 0]}>
              <boxGeometry args={[def.width + 0.12, 0.06, 0.02]} />
            </mesh>
          </group>
        ))}
        {/* Room sign above the doorway. */}
        <group position={[0, 2.66, signNormal]} rotation={[0, def.signSide === 1 ? 0 : Math.PI, 0]}>
          <mesh material={signMat}>
            <boxGeometry args={[1.9, 0.32, 0.02]} />
          </mesh>
          <mesh material={stripeMat} position={[-0.9, 0, 0.011]}>
            <boxGeometry args={[0.06, 0.32, 0.002]} />
          </mesh>
          <Text font={FONTS.bold} fontSize={0.12} color="#ffffff" anchorX="center" anchorY="middle" position={[0.03, 0, 0.012]} letterSpacing={0.06}>
            {def.sign}
          </Text>
        </group>
      </group>
      <RigidBody ref={left} type="kinematicPosition" colliders={false} position={[def.x - along.x * (def.width / 4), 0, def.z - along.z * (def.width / 4)]} rotation={[0, rotY, 0]}>
        <CuboidCollider args={[panelW / 2, PANEL_H / 2, 0.04]} position={[0, PANEL_H / 2, 0]} />
        <Panel width={panelW} side={-1} />
      </RigidBody>
      <RigidBody ref={right} type="kinematicPosition" colliders={false} position={[def.x + along.x * (def.width / 4), 0, def.z + along.z * (def.width / 4)]} rotation={[0, rotY, 0]}>
        <CuboidCollider args={[panelW / 2, PANEL_H / 2, 0.04]} position={[0, PANEL_H / 2, 0]} />
        <Panel width={panelW} side={1} />
      </RigidBody>
    </group>
  );
}

export function Doors() {
  return (
    <group>
      {DOORS.map((d) => (
        <Door key={d.id} def={d} />
      ))}
    </group>
  );
}
