/**
 * Star in the room. It is drawn in its own overlay scene after the lab (drei Hud, same camera),
 * so walls and benches never hide it and the lab's ambient occlusion never smudges it.
 *
 * It flies beside the player's view: when they turn it swings around them (never through
 * them), when they walk it trails a little and catches up, and it banks into its turns. After
 * a mistake it flies to whatever fixes it (starGuide.ts) and points at it with a bouncing arrow
 * and a pulsing ring; when that is out of view, an arrow at the screen edge shows the way.
 */
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Hud } from '@react-three/drei';
import { useReducedMotion } from 'framer-motion';
import { MathUtils, Quaternion, Vector3, type Group, type Mesh, type PerspectiveCamera } from 'three';
import { useGameStore } from '../store/useGameStore';
import { QUALITY_PRESETS, useSettingsStore } from '../store/useSettingsStore';
import { guideFinished, guidePosition, starCompass, stopGuide, useStarGuide } from '../lab/starGuide';
import { StarModel } from '../ui/StarModel';
import { isTouchDevice } from '../utils/device';

/** Distance in front of the eyes while following, and Star's size there (metres). */
const NEAR = 0.95;
const SCALE = 0.13;
/** Largest size when far away, so Star stays easy to spot across the room. */
const FAR_SCALE = 0.5;
/** Height above the thing Star points at. */
const HOVER = 0.42;

const eye = new Vector3();
const forward = new Vector3();
const right = new Vector3();
const up = new Vector3();
const goal = new Vector3();
const target = new Vector3();
const want = new Vector3();
const offset = new Vector3();
const before = new Vector3();
const view = new Vector3();
const swing = new Quaternion();
const step = new Quaternion();

function Companion({ calm }: { calm: boolean }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const star = useRef<Group>(null);
  const bank = useRef<Group>(null);
  const arrow = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const fly = useRef({ ready: false, anchor: new Vector3(), pos: new Vector3(), dir: new Vector3(0, 0, -1), scale: SCALE, lean: 0 });
  const mode = useGameStore((s) => s.mode);
  const side = isTouchDevice() ? 1 : -1;
  const shown = mode !== 'loading' && mode !== 'start' && mode !== 'ended' && mode !== 'inspect';

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const ease = (rate: number) => 1 - Math.exp(-rate * dt);
    const t = state.clock.elapsedTime;
    const f = fly.current;
    camera.getWorldPosition(eye);
    camera.getWorldDirection(forward);
    right.crossVectors(forward, camera.up).normalize();
    up.crossVectors(right, forward).normalize();

    // Guiding: hover above the target until it is fixed, picked up, reached or wiped.
    let guiding = false;
    const guide = useStarGuide.getState().guide;
    if (guide) {
      const found = guidePosition(guide.target, target);
      if (guideFinished(guide, target, found)) stopGuide();
      else {
        guiding = true;
        goal.copy(target);
        goal.y += HOVER + (calm ? 0 : Math.sin(t * 2.4) * 0.03);
      }
    }
    if (!guiding) {
      // Beside the view, a little above the work area and inside narrow screens: left of centre,
      // or right on phones, where the speech bubble covers the top left.
      const halfH = NEAR * Math.tan(MathUtils.degToRad(camera.fov / 2));
      const halfW = halfH * (size.width / Math.max(1, size.height));
      const drift = calm ? 0 : 1;
      goal.copy(eye)
        .addScaledVector(forward, NEAR)
        .addScaledVector(right, side * Math.min(0.42, halfW * 0.55) + Math.sin(t * 0.5) * 0.03 * drift)
        .addScaledVector(up, Math.min(0.1, halfH * 0.18) + Math.sin(t * 1.3) * 0.015 * drift);
    }
    if (!f.ready) {
      f.anchor.copy(eye);
      f.pos.copy(goal);
      f.ready = true;
    }
    before.copy(f.pos);
    // The point Star circles: the player's eyes, trailing a little behind when they walk.
    f.anchor.lerp(eye, calm ? 1 : ease(7));
    // Swing the direction around the player and change the distance separately, so Star flies
    // around them instead of cutting through their head when they turn.
    want.copy(goal).sub(f.anchor);
    const wantDist = Math.max(0.35, want.length());
    want.divideScalar(wantDist);
    offset.copy(f.pos).sub(f.anchor);
    const dist = offset.length();
    if (dist > 1e-4) f.dir.copy(offset).divideScalar(dist);
    swing.setFromUnitVectors(f.dir, want);
    step.identity().slerp(swing, calm ? 1 : ease(guiding ? 3 : 8));
    f.dir.applyQuaternion(step).normalize();
    const nextDist = MathUtils.lerp(dist, wantDist, calm ? 1 : ease(guiding ? 2.5 : 8));
    f.pos.copy(f.anchor).addScaledVector(f.dir, nextDist);

    if (star.current) {
      star.current.visible = shown;
      star.current.position.copy(f.pos);
      star.current.lookAt(eye);
      const far = MathUtils.clamp(SCALE * Math.pow(nextDist / NEAR, 0.7), SCALE, FAR_SCALE);
      f.scale = MathUtils.lerp(f.scale, guiding ? far : SCALE, ease(4));
      star.current.scale.setScalar(f.scale);
    }
    // Bank into sideways flight, like a little plane.
    const sideways = dt > 0 ? before.sub(f.pos).dot(right) / dt : 0;
    f.lean = MathUtils.lerp(f.lean, calm ? 0 : MathUtils.clamp(sideways * 0.5, -0.6, 0.6), ease(6));
    if (bank.current) bank.current.rotation.z = f.lean;

    // The arrow and ring on what to pick up or clean, grown with distance so they read from afar.
    const pointing = shown && guiding;
    const reach = MathUtils.clamp(eye.distanceTo(target) / 2.5, 1, 3.5);
    if (arrow.current) {
      arrow.current.visible = pointing;
      arrow.current.position.copy(target);
      arrow.current.position.y += (0.2 + (calm ? 0 : Math.abs(Math.sin(t * 4)) * 0.06)) * reach;
      arrow.current.scale.setScalar(reach);
    }
    if (ring.current) {
      ring.current.visible = pointing;
      ring.current.position.copy(target);
      ring.current.scale.setScalar(reach * (calm ? 1 : 1 + Math.sin(t * 5) * 0.18));
    }

    // Out of view: an arrow at the screen edge points the way.
    const compass = starCompass.el;
    if (compass) {
      view.copy(goal).applyMatrix4(camera.matrixWorldInverse);
      const ahead = -view.z;
      const halfH = Math.tan(MathUtils.degToRad(camera.fov / 2));
      const halfW = halfH * (size.width / Math.max(1, size.height));
      const inView = ahead > 0.1 && Math.abs(view.x / ahead) < halfW * 0.92 && Math.abs(view.y / ahead) < halfH * 0.9;
      if (!pointing || inView) compass.style.opacity = '0';
      else {
        // Behind the player: point left or right, the way to turn.
        const angle = ahead <= 0 ? (view.x < 0 ? Math.PI : 0) : Math.atan2(view.y, view.x);
        const x = size.width / 2 + Math.cos(angle) * (size.width / 2 - 40);
        const y = size.height / 2 - Math.sin(angle) * (size.height / 2 - 40);
        compass.style.opacity = '1';
        compass.style.transform = `translate(${x - 24}px, ${y - 24}px)`;
        if (starCompass.arrow) starCompass.arrow.style.transform = `rotate(${-angle}rad)`;
      }
    }
  });

  return (
    <>
      <group ref={star} scale={SCALE}>
        <group ref={bank}>
          <StarModel calm={calm} sparkleSize={0.8} />
        </group>
      </group>
      <group ref={arrow} visible={false}>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.05, 0.12, 20]} />
          <meshBasicMaterial color="#ffb020" toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.11, 0.14, 40]} />
        <meshBasicMaterial color="#ffc533" transparent opacity={0.85} toneMapped={false} />
      </mesh>
    </>
  );
}

/** Draws the lab when post-processing is off; the composer does it otherwise (both at priority 1). */
function LabPass() {
  useFrame(({ gl, scene, camera }) => {
    gl.autoClear = true;
    gl.render(scene, camera);
  }, 1);
  return null;
}

export function StarCompanion() {
  const postprocessing = useSettingsStore((s) => QUALITY_PRESETS[s.quality].postprocessing);
  const reduced = useSettingsStore((s) => s.reducedMotion);
  const calm = (useReducedMotion() ?? false) || reduced;
  // Star is drawn after the lab at a fixed priority, so a quality change never rebuilds it. Its
  // overlay has plain lights only: an environment map here upset the lab's own when quality changed.
  return (
    <>
      {!postprocessing && <LabPass />}
      <Hud renderPriority={2}>
        <hemisphereLight args={['#fff6e5', '#ffd9a8', 0.7]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[1.5, 3, 2]} intensity={1.6} color="#fff4e0" />
        <Companion calm={calm} />
      </Hud>
    </>
  );
}
