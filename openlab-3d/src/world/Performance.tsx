/**
 * Performance helpers: a frame-rate governor picks quality and resolution, BakeShadows
 * freezes the shadow map (re-rendered only when items move), and a one-time shader
 * warm-up compiles every material while the loading screen is still up.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { BakeShadows } from '@react-three/drei';
import { Mesh, Vector3, type Object3D } from 'three';
import { useFrame } from '@react-three/fiber';
import { transmissionOriginals, transmissionTwins } from '../materials/glass';
import { usePortableStore } from '../interaction/portable';
import { QUALITY_PRESETS, defaultQuality, useSettingsStore } from '../store/useSettingsStore';
import { AUTO_LADDER, FrameGovernor, GOVERNOR, ladderFor, manualLadder } from './qualityGovernor';
import { usePerfStore } from '../store/usePerfStore';
import { useGameStore, type Mode } from '../store/useGameStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { LOAD_STEPS, useLoadingStore } from '../store/useLoadingStore';
import { FONTS, GLYPHS } from '../utils/fonts';
import { preloadFont } from 'troika-three-text';

const MEASURED: Mode[] = ['walk', 'bench'];


/**
 * Frame-rate governor: measures real frame times while you play and walks a ladder of
 * quality levels (see qualityGovernor.ts) so the lab holds about 60 fps on whatever PC or
 * phone it runs on. Auto picks tier and resolution; a manual tier only adapts resolution.
 */
export function PerformanceManager({ onDpr }: { onDpr: (dpr: number) => void }) {
  const auto = useSettingsStore((s) => s.autoQuality);
  const manualQuality = useSettingsStore((s) => (s.autoQuality ? null : s.quality));
  const device = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const ladder = useMemo(() => ladderFor(auto || !manualQuality ? AUTO_LADDER : manualLadder(manualQuality, QUALITY_PRESETS[manualQuality].dpr), device), [auto, manualQuality, device]);
  const governor = useRef<FrameGovernor | null>(null);
  const window_ = useRef({ start: 0, frames: 0, settleUntil: 0, last: 0, longGaps: 0 });

  const apply = useCallback(
    (level: number) => {
      const w = window_.current;
      w.start = 0;
      w.settleUntil = performance.now() + GOVERNOR.settleS * 1000;
      const l = ladder[level];
      onDpr(l.dpr);
      usePerfStore.setState({ dpr: l.dpr, level, levels: ladder.length });
      if (useSettingsStore.getState().autoQuality) useSettingsStore.setState({ quality: l.quality, autoLevel: level });
    },
    [ladder, onDpr],
  );

  // Start from the level this device settled on last time, else from its likely tier.
  useEffect(() => {
    const s = useSettingsStore.getState();
    let start = 0;
    if (s.autoQuality) {
      const firstLow = Math.max(0, ladder.findIndex((l) => l.quality === 'low'));
      start = s.autoLevel !== null && s.autoLevel < ladder.length ? s.autoLevel : defaultQuality() === 'low' ? firstLow : 0;
    }
    governor.current = new FrameGovernor(ladder, start);
    apply(governor.current.level);
  }, [ladder, apply]);

  useFrame(() => {
    const w = window_.current;
    const g = governor.current;
    const now = performance.now();
    const gap = now - w.last;
    w.last = now;
    // A long gap is a hitch or a resume after a pause, unless they keep coming: then the
    // device is simply that slow and those frames must count.
    w.longGaps = gap > 500 ? w.longGaps + 1 : 0;
    if (!g || !MEASURED.includes(useGameStore.getState().mode) || document.hidden || (w.longGaps > 0 && w.longGaps < 3)) {
      // Paused, covered or just resumed: start a fresh window.
      w.start = 0;
      return;
    }
    if (now < w.settleUntil) return;
    if (!w.start) {
      w.start = now;
      w.frames = 0;
      return;
    }
    w.frames++;
    const elapsed = (now - w.start) / 1000;
    if (elapsed < GOVERNOR.windowS) return;
    const next = g.onWindow(w.frames / elapsed);
    w.start = now;
    w.frames = 0;
    if (next !== null) apply(next);
  });
  return null;
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
