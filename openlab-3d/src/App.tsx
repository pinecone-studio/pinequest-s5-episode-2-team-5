import { ReactionEffects } from './world/ReactionEffects';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { Player } from './controls/Player';
import { PhysicsDriver } from './controls/PhysicsDriver';
import { buildMovementMap } from './controls/keyMap';
import { setPointerTarget, usePointerLockSync } from './controls/usePointerLock';
import { useGameKeys } from './controls/useGameKeys';
import { Lab } from './world/Lab';
import { Lighting } from './world/Lighting';
import { Effects } from './world/Effects';
import { GlassLOD, PerformanceManager, ShadowUpdater, Warmup } from './world/Performance';
import { FocusRaycaster } from './interaction/useRaycastFocus';
import { HeldItem } from './interaction/HeldItem';
import { ChemSim } from './world/ChemSim';
import { LabFx } from './world/LabFx';
import { useReady } from './store/useLoadingStore';
import { useSettingsStore, QUALITY_PRESETS } from './store/useSettingsStore';
import { useGameStore, type Mode } from './store/useGameStore';
import { DebugBridge } from './utils/DebugBridge';
import { connectExperimentCatalog } from './lab/experiments';
import { startWorkbenchTracking } from './experiments/workbench/session';
import { WorkbenchRuntime } from './experiments/workbench/WorkbenchRuntime';
import { HUD } from './ui/HUD';
import { isTouchDevice } from './utils/device';

/** Marks the physics engine as loaded (rendered inside <Physics>, so after WASM init). */
function EngineReady() {
  useReady('engine');
  return null;
}

/** Modes where the 3D view is covered or frozen: render only on demand. */
const FROZEN: Mode[] = ['inspect', 'ui', 'paused', 'ended'];

export default function App() {
  useEffect(connectExperimentCatalog, []);
  useEffect(startWorkbenchTracking, []);
  const bindings = useSettingsStore((s) => s.bindings);
  const lookMode = useSettingsStore((s) => s.lookMode);
  const quality = useSettingsStore((s) => s.quality);
  const map = useMemo(() => buildMovementMap(bindings, lookMode), [bindings, lookMode]);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [dpr, setDpr] = useState(1);
  const [portraitTouch, setPortraitTouch] = useState(() => isTouchDevice() && window.matchMedia('(orientation: portrait)').matches);
  const mode = useGameStore((s) => s.mode);
  const panel = useGameStore((s) => s.panel);
  usePointerLockSync();
  useGameKeys(canvasEl);
  useEffect(() => {
    const media = window.matchMedia('(orientation: portrait)');
    const update = () => setPortraitTouch(isTouchDevice() && media.matches);
    update();
    media.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      media.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  const onDpr = useCallback((v: number) => setDpr(v), []);
  // The tools drawer still shows the live world behind it, so keep rendering there.
  const frozen = FROZEN.includes(mode) && !(mode === 'ui' && panel === 'tools');
  const preset = QUALITY_PRESETS[quality];

  if (portraitTouch) {
    return <main className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-[#111827] px-8 text-center text-white" lang="mn">
      <div aria-hidden="true" className="text-7xl">📱</div>
      <h1 className="font-display text-2xl font-bold">Утсаа хөндлөнгөөр эргүүлээрэй</h1>
      <p className="max-w-sm text-sm leading-relaxed text-white/75">Open Lab-ийн 3D лаборатори хөндлөн дэлгэцэд тохируулагдсан. Эргүүлмэгц туршилтаа үргэлжлүүлнэ.</p>
      <div aria-hidden="true" className="text-3xl">↻</div>
    </main>;
  }

  return (
    <KeyboardControls map={map}>
      <div className="fixed inset-0" style={{ filter: mode === 'inspect' ? 'blur(8px) brightness(0.85)' : undefined, transition: 'filter 0.3s' }}>
        <Canvas
          shadows={preset.shadows ? (preset.softShadows ? 'soft' : true) : false}
          dpr={dpr}
          frameloop={frozen ? 'demand' : 'always'}
          camera={{ fov: 75, near: 0.03, far: 400, position: [0, 1.65, 0] }}
          gl={{ antialias: !preset.postprocessing, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace, powerPreference: 'high-performance', stencil: false }}
          onCreated={({ gl }) => {
            setPointerTarget(gl.domElement);
            setCanvasEl(gl.domElement);
          }}
          aria-label="Химийн лабораторийн 3D дүрс"
        >
          <Suspense fallback={null}>
            <Physics paused timeStep="vary" gravity={[0, -9.81, 0]}>
              <PhysicsDriver />
              <EngineReady />
              <Lighting />
              <Lab />
              <Player />
              <FocusRaycaster />
              <HeldItem />
              <ChemSim />
              <WorkbenchRuntime />
              <LabFx />
              <ReactionEffects />
            </Physics>
            <Effects />
            <GlassLOD />
            <ShadowUpdater />
            <Warmup />
          </Suspense>
          <PerformanceManager onDpr={onDpr} />
          {import.meta.env.DEV && <DebugBridge />}
        </Canvas>
      </div>
      <HUD />
    </KeyboardControls>
  );
}
