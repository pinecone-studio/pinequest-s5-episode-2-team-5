/**
 * "Star", the lab helper (an original design): a chubby, puffy golden star with a warm glow,
 * big glossy eyes, pink cheeks and a smile. It bobs, blinks and sparkles; it hops when happy,
 * tilts its head after a mishap and shakes with a red glow when it has to say "Stop!". How it
 * flies around the room is up to whoever places it (StarCompanion).
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import { AdditiveBlending, CanvasTexture, Color, ExtrudeGeometry, MeshPhysicalMaterial, MeshStandardMaterial, Shape, SphereGeometry, TorusGeometry, Vector2, type Group } from 'three';
import { useGameStore } from '../store/useGameStore';

/** A five-point star with rounded tips and inner corners. */
function starShape(outer: number, inner: number): Shape {
  const points = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    return new Vector2(Math.cos(a) * r, Math.sin(a) * r);
  });
  const corner = (i: number) => {
    const v = points[i];
    const k = i % 2 ? 0.2 : 0.3;
    return { v, start: v.clone().lerp(points[(i + 9) % 10], k), end: v.clone().lerp(points[(i + 1) % 10], k) };
  };
  const shape = new Shape();
  const first = corner(0);
  shape.moveTo(first.start.x, first.start.y);
  for (let i = 0; i < 10; i++) {
    const c = corner(i);
    if (i > 0) shape.lineTo(c.start.x, c.start.y);
    shape.quadraticCurveTo(c.v.x, c.v.y, c.end.x, c.end.y);
  }
  shape.closePath();
  return shape;
}

const DEPTH = 0.06;
const BEVEL = 0.13;
/** z of the flat front face, where the face features sit. */
const FRONT = DEPTH / 2 + BEVEL;

const bodyGeo = new ExtrudeGeometry(starShape(0.5, 0.27), { depth: DEPTH, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: 0.09, bevelSegments: 8, curveSegments: 10 });
bodyGeo.center();
const eyeGeo = new SphereGeometry(0.062, 24, 16);
const shineGeo = new SphereGeometry(0.019, 10, 8);
const smileGeo = new TorusGeometry(0.045, 0.011, 8, 24, Math.PI);

const WARM = new Color('#ff9a1f');
const ALARM = new Color('#ff3b24');
const body = new MeshPhysicalMaterial({ color: '#ffd23f', emissive: WARM.clone(), emissiveIntensity: 0.3, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.25, sheen: 0.6, sheenColor: '#fff3c4' });
const ink = new MeshPhysicalMaterial({ color: '#3a2314', roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
const shine = new MeshStandardMaterial({ color: '#fff', emissive: '#fff', emissiveIntensity: 1.2, toneMapped: false });
const blush = new MeshStandardMaterial({ color: '#ff7f9b', transparent: true, opacity: 0.55, depthWrite: false });

/** Soft round glow behind the star (drawn once into a small texture). */
function useHalo(): CanvasTexture | null {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const g = canvas.getContext('2d');
    if (!g) return null;
    const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,214,110,0.75)');
    gradient.addColorStop(0.5, 'rgba(255,170,60,0.25)');
    gradient.addColorStop(1, 'rgba(255,150,40,0)');
    g.fillStyle = gradient;
    g.fillRect(0, 0, 64, 64);
    return new CanvasTexture(canvas);
  }, []);
}

/** sparkleSize is in screen terms: smaller when the star is seen up close. */
export function StarModel({ calm = false, sparkleSize = 2.6 }: { calm?: boolean; sparkleSize?: number }) {
  const root = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  const smile = useRef<Group>(null);
  const gasp = useRef<Group>(null);
  const robot = useGameStore((s) => s.robot);
  const halo = useHalo();
  const anim = useRef({ waveUntil: 0, hopUntil: 0, shakeUntil: 0, nextBlink: 2, blink: 0, spin: 0 });
  const alarmed = robot.open && robot.mood === 'danger';
  const tilted = robot.open && (robot.mood === 'oops' || robot.mood === 'think');

  useEffect(() => {
    if (robot.id === 0) return;
    const now = performance.now() / 1000;
    if (robot.mood === 'wave') anim.current.waveUntil = now + 1.8;
    if (robot.mood === 'happy') anim.current.hopUntil = now + 1;
    if (robot.mood === 'danger') anim.current.shakeUntil = now + 0.9;
  }, [robot.id, robot.mood]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const t = state.clock.elapsedTime;
    const now = performance.now() / 1000;
    const a = anim.current;
    const ease = (rate: number) => 1 - Math.exp(-rate * dt);
    if (root.current) {
      const hopping = now < a.hopUntil;
      const hop = hopping ? Math.abs(Math.sin((a.hopUntil - now) * Math.PI * 2)) * 0.16 : 0;
      a.spin = hopping ? Math.PI * 2 * (1 - (a.hopUntil - now)) : 0;
      const shake = now < a.shakeUntil ? Math.sin(now * 42) * 0.05 : 0;
      const bob = calm ? 0.02 : 0.04;
      root.current.position.x = shake;
      root.current.position.y = Math.sin(t * 2) * bob + hop;
      root.current.rotation.y = Math.sin(t * 0.7) * 0.25 + a.spin;
      const waving = now < a.waveUntil ? Math.sin(now * 16) * 0.22 : 0;
      const tilt = tilted ? 0.22 : Math.sin(t * 1.1) * 0.06;
      root.current.rotation.z += (tilt + waving - root.current.rotation.z) * ease(8);
    }
    // Glow warm, or pulse red while warning.
    body.emissive.lerp(alarmed ? ALARM : WARM, ease(6));
    body.emissiveIntensity = alarmed ? 0.55 + Math.sin(t * 9) * 0.2 : 0.3;
    a.nextBlink -= dt;
    if (a.nextBlink <= 0) {
      a.blink = 0.13;
      a.nextBlink = 2.2 + Math.random() * 3;
    }
    a.blink = Math.max(0, a.blink - dt);
    if (eyes.current) eyes.current.scale.y = a.blink > 0 ? 0.15 : alarmed ? 1.15 : 1;
    if (smile.current) smile.current.visible = !alarmed;
    if (gasp.current) gasp.current.visible = alarmed;
  });

  return (
    <group>
      {halo && (
        <mesh position={[0, 0, -0.25]} renderOrder={-1}>
          <planeGeometry args={[1.6, 1.6]} />
          <meshBasicMaterial map={halo} color={alarmed ? '#ff5a46' : '#ffffff'} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </mesh>
      )}
      <Sparkles count={calm ? 6 : 14} scale={[1.7, 1.7, 0.6]} size={sparkleSize} speed={0.35} color="#ffe58a" opacity={0.9} />
      <group ref={root}>
        <mesh geometry={bodyGeo} material={body} />
        <group ref={eyes} position={[0, 0.035, FRONT]}>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.105, 0, 0]}>
              <mesh geometry={eyeGeo} material={ink} scale={[0.85, 1.15, 0.45]} />
              <mesh geometry={shineGeo} material={shine} position={[0.018, 0.03, 0.03]} />
              <mesh geometry={shineGeo} material={shine} position={[-0.016, -0.022, 0.03]} scale={0.5} />
            </group>
          ))}
        </group>
        {[-1, 1].map((s) => (
          <mesh key={s} material={blush} position={[s * 0.17, -0.035, FRONT + 0.002]} scale={[1.25, 1, 1]}>
            <circleGeometry args={[0.04, 20]} />
          </mesh>
        ))}
        <group ref={smile} position={[0, -0.05, FRONT]}>
          <mesh geometry={smileGeo} material={ink} rotation={[0, 0, Math.PI]} scale={tilted ? 0.7 : 1} />
        </group>
        <group ref={gasp} position={[0, -0.075, FRONT + 0.004]} visible={false}>
          <mesh material={ink}>
            <circleGeometry args={[0.028, 20]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
