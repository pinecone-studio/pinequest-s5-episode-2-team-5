/**
 * Performance helpers: PerformanceMonitor lowers/raises the DPR within the preset range,
 * AdaptiveDpr reacts to regressions, BakeShadows freezes the shadow map (re-rendered
 * only when items move), and a one-time shader warm-up compiles every material while
 * the loading screen is still up.
 */
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { AdaptiveDpr, BakeShadows, PerformanceMonitor } from '@react-three/drei';
import { Mesh, Vector3, type Object3D } from 'three';
import { useFrame } from '@react-three/fiber';
import { transmissionOriginals, transmissionTwins } from '../materials/glass';
import { usePortableStore } from '../interaction/portable';
import { QUALITY_PRESETS, useSettingsStore } from '../store/useSettingsStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { LOAD_STEPS, useLoadingStore } from '../store/useLoadingStore';
import { FONTS, GLYPHS } from '../utils/fonts';
import { preloadFont } from 'troika-three-text';

export function PerformanceManager({ onDpr }: { onDpr: (dpr: number) => void }) {
  const quality = useSettingsStore((s) => s.quality);
  const [min, max] = QUALITY_PRESETS[quality].dpr;
  const factor = useRef(1);
  const device = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
  useEffect(() => {
    factor.current = 1;
    onDpr(Math.min(max, Math.max(min, device)));
  }, [min, max, device, onDpr]);
  return (
    <>
      <PerformanceMonitor
        bounds={(refresh) => (refresh > 90 ? [55, 100] : [48, 58])}
        flipflops={4}
        onChange={({ factor: f }) => {
          factor.current = f;
          onDpr(Math.round((min + (Math.min(max, device) - min) * f) * 100) / 100);
        }}
      />
      <AdaptiveDpr pixelated={false} />
    </>
  );
}

/** Re-render the (baked) shadow map whenever items are placed or picked up. */
export function ShadowUpdater() {
  const gl = useThree((s) => s.gl);
  const items = useInventoryStore((s) => s.worldItems);
  const portable = usePortableStore((s) => s.held?.id);
  const shadows = useSettingsStore((s) => QUALITY_PRESETS[s.quality].shadows);
  useEffect(() => {
    gl.shadowMap.enabled = shadows;
    const id = window.setTimeout(() => {
      gl.shadowMap.needsUpdate = true;
    }, 400);
    return () => window.clearTimeout(id);
  }, [gl, items, shadows, portable]);
  return <BakeShadows />;
}

/** Warm first-view text and compile scene materials after the first render. */
export function Warmup() {
  const { gl, scene, camera } = useThree();
  const done = useLoadingStore((s) => s.done);
  const started = useRef(false);
  useEffect(() => {
    preloadFont({ font: FONTS.bold, characters: GLYPHS }, () => undefined);
  }, []);
  useEffect(() => {
    const needed = LOAD_STEPS;
    if (started.current || !needed.every((s) => done.includes(s))) return;
    started.current = true;
    // Compile after the browser has had a frame to paint the lab and start UI.
    const id = window.requestAnimationFrame(() => {
      const hidden: Object3D[] = [];
      scene.traverse((o) => {
        if (!o.visible) {
          hidden.push(o);
          o.visible = true;
        }
      });
      const finish = () => {
        hidden.forEach((o) => (o.visible = false));
      };
      try {
        gl.compileAsync(scene, camera).then(finish, finish);
      } catch {
        finish();
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [done, gl, scene, camera]);
  return null;
}

const NEAR_GLASS = 3.2;
const tmp = new Vector3();

/**
 * Glass LOD: three.js re-renders every opaque object for the transmission pass whenever
 * any transmissive mesh is on screen. Glassware farther than ~3 m from the camera swaps
 * to its alpha-blended twin, so the (expensive) pass only runs when glass is close
 * enough for refraction to be noticeable.
 */
export function GlassLOD() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const enabled = useSettingsStore((s) => QUALITY_PRESETS[s.quality].transmission);
  const frame = useRef(0);
  useFrame(() => {
    if (!enabled) return;
    frame.current = (frame.current + 1) % 10;
    if (frame.current !== 0) return;
    scene.traverse((o) => {
      if (!(o instanceof Mesh) || Array.isArray(o.material)) return;
      const cheap = transmissionTwins.get(o.material);
      const original = cheap ? undefined : transmissionOriginals.get(o.material);
      if (!cheap && !original) return;
      o.getWorldPosition(tmp);
      const near = tmp.distanceTo(camera.position) < NEAR_GLASS;
      if (cheap && !near) o.material = cheap;
      else if (original && near) o.material = original;
    });
  });
  return null;
}
