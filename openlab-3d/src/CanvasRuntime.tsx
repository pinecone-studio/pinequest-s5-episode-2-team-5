import { lazy, Suspense, useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls } from '@react-three/drei';
import { NeutralToneMapping, SRGBColorSpace } from 'three';
import type { buildMovementMap } from './controls/keyMap';
import { setPointerTarget, usePointerLockSync } from './controls/usePointerLock';
import { useGameKeys } from './controls/useGameKeys';
import { useGameStore, type Mode } from './store/useGameStore';
import type { QualityPreset } from './store/useSettingsStore';
import { isTouchDevice } from './utils/device';

const LabScene = lazy(() => import('./world/LabScene'));
const TouchControls = lazy(() => import('./ui/TouchControls').then(({ TouchControls }) => ({ default: TouchControls })));
const DebugBridge = lazy(() => import('./utils/DebugBridge').then(({ DebugBridge }) => ({ default: DebugBridge })));

const FROZEN: Mode[] = ['inspect', 'ui', 'paused', 'ended'];

export function CanvasRuntime({
  map,
  dpr,
  onDpr,
  onReady,
  preset,
}: {
  map: ReturnType<typeof buildMovementMap>;
  dpr: number;
  onDpr: (dpr: number) => void;
  onReady: () => void;
  preset: QualityPreset;
}) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const mode = useGameStore((s) => s.mode);
  const panel = useGameStore((s) => s.panel);
  const frozen = FROZEN.includes(mode) && !(mode === 'ui' && panel === 'tools');
  usePointerLockSync();
  useGameKeys(canvas);
  const onCreated = useCallback(({ gl }: { gl: { domElement: HTMLCanvasElement; localClippingEnabled: boolean } }) => {
    gl.localClippingEnabled = true;
    setPointerTarget(gl.domElement);
    setCanvas(gl.domElement);
    onReady();
  }, [onReady]);

  return (
    <KeyboardControls map={map}>
      <div className="fixed inset-0" style={{ filter: mode === 'inspect' ? 'blur(8px) brightness(0.85)' : undefined, transition: 'filter 0.3s' }}>
        <Canvas
          shadows={preset.shadows ? (preset.softShadows ? 'soft' : true) : false}
          dpr={dpr}
          frameloop={frozen ? 'demand' : 'always'}
          camera={{ fov: 75, near: 0.03, far: 400, position: [0, 1.65, 0] }}
          gl={{ antialias: preset.antialias, toneMapping: NeutralToneMapping, outputColorSpace: SRGBColorSpace, powerPreference: 'high-performance', stencil: false }}
          onCreated={onCreated}
          aria-label="Химийн лабораторийн 3D дүрс"
        >
          <Suspense fallback={null}><LabScene onDpr={onDpr} /></Suspense>
          {import.meta.env.DEV && <Suspense fallback={null}><DebugBridge /></Suspense>}
        </Canvas>
      </div>
      {/* Утасны удирдлага (joystick, E F Q R) зөвхөн утас/таблет ба Expo Go дээр. PC-д гараар удирдана. */}
      {isTouchDevice() && <TouchControls />}
    </KeyboardControls>
  );
}
