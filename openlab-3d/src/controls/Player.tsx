/**
 * First-person player: a kinematic rapier capsule (radius 0.3 m, 1.0 m cylinder → 1.6 m tall)
 * moved by rapier's character controller, with the camera at 1.65 m eye height.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { CapsuleCollider, RigidBody, interactionGroups, useRapier, type RapierCollider, type RapierRigidBody } from '@react-three/rapier';
import { Euler, PerspectiveCamera, Vector3 } from 'three';
import { playerApi, playerState, useGameStore } from '../store/useGameStore';
import { useSettingsStore } from '../store/useSettingsStore';
import {
  ACCELERATION,
  CAPSULE_CENTER_Y,
  CAPSULE_HALF_HEIGHT,
  CAPSULE_RADIUS,
  DECELERATION,
  EYE_OFFSET,
  GRAVITY,
  GROUP_PICKABLE,
  JUMP_VELOCITY,
  KEY_TURN_SPEED,
  PITCH_LIMIT,
  PLAYER_COLLISION,
  SPRINT_MULTIPLIER,
  WALK_SPEED,
} from '../utils/constants';
import { SPAWN } from '../world/layout';
import { sounds } from '../utils/sounds';
import { touchInput } from '../interaction/heldApi';
import type { MoveAction } from './keyMap';
import { preStepHooks } from './PhysicsDriver';

export const playerBodyRef: { current: RapierRigidBody | null } = { current: null };

const euler = new Euler(0, 0, 0, 'YXZ');
/** Query groups that find loose items (their filter accepts the pickable group). */
const PUSH_QUERY = interactionGroups(GROUP_PICKABLE, [GROUP_PICKABLE]);
const IDENTITY = { x: 0, y: 0, z: 0, w: 1 };
const desired = new Vector3();
const target = new Vector3();

export function Player() {
  const body = useRef<RapierRigidBody>(null);
  const collider = useRef<RapierCollider>(null);
  const { world, rapier } = useRapier();
  // Slightly fatter than the body: things on the floor get nudged before they are touched.
  const pushShape = useMemo(() => new rapier.Capsule(CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS + 0.05), [rapier]);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const [, getKeys] = useKeyboardControls<MoveAction>();

  const controller = useMemo(() => {
    const c = world.createCharacterController(0.02);
    c.setUp({ x: 0, y: 1, z: 0 });
    c.setSlideEnabled(true);
    c.enableAutostep(0.22, 0.15, false);
    c.enableSnapToGround(0.25);
    c.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    c.setApplyImpulsesToDynamicBodies(false);
    return c;
  }, [world]);
  useEffect(() => () => world.removeCharacterController(controller), [world, controller]);

  const velocity = useRef(new Vector3());
  const verticalSpeed = useRef(0);
  const grounded = useRef(true);
  const jumpHeld = useRef(false);
  const bob = useRef({ phase: 0, amount: 0, distance: 0 });
  const sprinting = useRef(false);

  useEffect(() => {
    playerApi.teleport = (x, z, yaw) => {
      const rb = body.current;
      if (!rb) return;
      const p = { x, y: CAPSULE_CENTER_Y + 0.05, z };
      rb.setTranslation(p, true);
      rb.setNextKinematicTranslation(p);
      playerState.position.set(x, 0, z);
      playerState.yaw = yaw;
      playerState.pitch = 0;
      velocity.current.set(0, 0, 0);
      verticalSpeed.current = 0;
    };
    playerBodyRef.current = body.current;
    return () => {
      playerApi.teleport = () => undefined;
      playerBodyRef.current = null;
    };
  }, []);

  /** Movement + collision for one physics substep. */
  const simulate = (dt: number) => {
    const rb = body.current;
    const col = collider.current;
    if (!rb || !col) return;
    const game = useGameStore.getState();
    const settings = useSettingsStore.getState();
    const canMove = game.mode === 'walk';
    const keys = getKeys();

    // Keyboard turning (keyboard-turn look mode).
    if (canMove && settings.lookMode === 'keyboard') {
      const turn = (keys.turnLeft ? 1 : 0) - (keys.turnRight ? 1 : 0);
      const tilt = (keys.lookUp ? 1 : 0) - (keys.lookDown ? 1 : 0);
      playerState.yaw += turn * KEY_TURN_SPEED * settings.sensitivity * dt;
      playerState.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, playerState.pitch + tilt * KEY_TURN_SPEED * 0.6 * dt));
    }

    // Desired horizontal velocity in world space.
    let ix = 0;
    let iz = 0;
    if (canMove) {
      ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + touchInput.moveX;
      iz = (keys.forward ? 1 : 0) - (keys.backward ? 1 : 0) + touchInput.moveY;
    }
    const len = Math.hypot(ix, iz);
    if (len > 1) {
      ix /= len;
      iz /= len;
    }
    const sprint = canMove && (keys.sprint || touchInput.sprint);
    sprinting.current = sprint;
    const speed = WALK_SPEED * (sprint ? SPRINT_MULTIPLIER : 1);
    const sin = Math.sin(playerState.yaw);
    const cos = Math.cos(playerState.yaw);
    // Forward is -z rotated by yaw; right is +x rotated by yaw.
    target.set((ix * cos - iz * sin) * speed, 0, (-ix * sin - iz * cos) * speed);
    const rate = target.lengthSq() >= velocity.current.lengthSq() ? ACCELERATION : DECELERATION;
    velocity.current.lerp(target, 1 - Math.exp(-rate * dt));
    if (velocity.current.lengthSq() < 1e-5) velocity.current.set(0, 0, 0);

    // Gravity and jumping.
    if (grounded.current && verticalSpeed.current < 0) verticalSpeed.current = -1;
    if (canMove && settings.jumpEnabled && keys.jump && !jumpHeld.current && grounded.current) {
      verticalSpeed.current = JUMP_VELOCITY;
    }
    jumpHeld.current = keys.jump;
    verticalSpeed.current -= GRAVITY * dt;

    desired.set(velocity.current.x * dt, verticalSpeed.current * dt, velocity.current.z * dt);
    controller.computeColliderMovement(col, desired, undefined, PLAYER_COLLISION);
    const move = controller.computedMovement();
    grounded.current = controller.computedGrounded();
    if (grounded.current && verticalSpeed.current < 0) verticalSpeed.current = -1;
    // Bumped the ceiling.
    if (verticalSpeed.current > 0 && move.y < desired.y * 0.5) verticalSpeed.current = 0;

    // If a wall stopped us, bleed off the stored velocity so we don't "stick" to it.
    const actualX = move.x / dt;
    const actualZ = move.z / dt;
    velocity.current.x += (actualX - velocity.current.x) * 0.5;
    velocity.current.z += (actualZ - velocity.current.z) * 0.5;

    const t = rb.translation();
    const nx = t.x + move.x;
    const ny = t.y + move.y;
    const nz = t.z + move.z;
    rb.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
    playerState.position.set(nx, ny - CAPSULE_CENTER_Y, nz);
    playerState.speed = Math.hypot(move.x, move.z) / dt;
    playerState.grounded = grounded.current;

    // Walking into loose items on the floor pushes them along (sprinting can knock glass over).
    if (playerState.speed > 0.3) {
      const vx = move.x / dt;
      const vz = move.z / dt;
      world.intersectionsWithShape(
        { x: nx, y: ny, z: nz },
        IDENTITY,
        pushShape,
        (c) => {
          const b = c.parent();
          if (!b || !b.isDynamic()) return true;
          const p = b.translation();
          let dx = p.x - nx;
          let dz = p.z - nz;
          const d = Math.hypot(dx, dz) || 1;
          dx /= d;
          dz /= d;
          const toward = vx * dx + vz * dz;
          if (toward <= 0) return true;
          const v = b.linvel();
          const dv = toward * 1.15 - (v.x * dx + v.z * dz);
          if (dv <= 0) return true;
          const m = b.mass();
          b.applyImpulse({ x: dx * dv * m, y: 0.1 * dv * m, z: dz * dv * m }, true);
          return true;
        },
        undefined,
        PUSH_QUERY,
      );
    }
  };

  useEffect(() => {
    const hook = (dt: number) => simulate(dt);
    preStepHooks.add(hook);
    return () => {
      preStepHooks.delete(hook);
    };
  });

  /** Camera, head bob and footsteps, once per rendered frame. */
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const settings = useSettingsStore.getState();
    const nx = playerState.position.x;
    const ny = playerState.position.y + CAPSULE_CENTER_Y;
    const nz = playerState.position.z;
    const groundSpeed = playerState.speed;
    const sprint = sprinting.current;
    const sin = Math.sin(playerState.yaw);
    const cos = Math.cos(playerState.yaw);

    // Footsteps every ~0.72 m, head bob tied to the same phase.
    const b = bob.current;
    if (grounded.current && groundSpeed > 0.3) {
      b.distance += groundSpeed * dt;
      const stride = sprint ? 0.9 : 0.72;
      if (b.distance > stride) {
        b.distance = 0;
        sounds.play('footstep', sprint ? 1.1 : 0.8);
      }
      b.phase += (groundSpeed * dt * Math.PI) / stride;
    }
    const bobOn = settings.headBob && !settings.reducedMotion;
    const targetAmount = bobOn && grounded.current ? Math.min(groundSpeed / WALK_SPEED, 1.6) : 0;
    b.amount += (targetAmount - b.amount) * (1 - Math.exp(-8 * dt));
    const bobY = Math.abs(Math.sin(b.phase)) * 0.045 * b.amount - 0.02 * b.amount;
    const bobX = Math.cos(b.phase) * 0.018 * b.amount;

    euler.set(playerState.pitch, playerState.yaw, 0);
    camera.position.set(nx + bobX * cos, ny + EYE_OFFSET + bobY, nz - bobX * sin);
    camera.quaternion.setFromEuler(euler);
    if (Math.abs(camera.fov - settings.fov) > 0.01) {
      camera.fov = settings.fov;
      camera.updateProjectionMatrix();
    }
  });

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={[SPAWN.x, CAPSULE_CENTER_Y + 0.05, SPAWN.z]}
      enabledRotations={[false, false, false]}
      userData={{ player: true }}
    >
      <CapsuleCollider ref={collider} args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} collisionGroups={PLAYER_COLLISION} />
    </RigidBody>
  );
}
