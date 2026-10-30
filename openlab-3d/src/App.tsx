import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { buildMovementMap } from './controls/keyMap';
import { useSettingsStore, QUALITY_PRESETS, type QualityPreset } from './store/useSettingsStore';
import { useGameStore } from './store/useGameStore';
import { isTouchDevice } from './utils/device';
import { LoadingScreen } from './ui/LoadingScreen';

const CanvasRuntime = lazy(() => import('./CanvasRuntime').then(({ CanvasRuntime }) => ({ default: CanvasRuntime })));
const GameHUD = lazy(() => import('./ui/HUD').then(({ HUD }) => ({ default: HUD })));

export default function App() {
  const bindings = useSettingsStore((s) => s.bindings);
  const lookMode = useSettingsStore((s) => s.lookMode);
  const quality = useSettingsStore((s) => s.quality);
  const map = useMemo(() => buildMovementMap(bindings, lookMode), [bindings, lookMode]);
  const [dpr, setDpr] = useState(1);
  const [loadCanvas, setLoadCanvas] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [portraitTouch, setPortraitTouch] = useState(() => isTouchDevice() && window.matchMedia('(orientation: portrait)').matches);
  const mode = useGameStore((s) => s.mode);
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
  useEffect(() => {
    if (portraitTouch) return;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => setLoadCanvas(true));
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [portraitTouch]);
  const onDpr = useCallback((value: number) => setDpr(value), []);
  const preset: QualityPreset = QUALITY_PRESETS[quality];

  if (portraitTouch) {
    return <main className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-[#111827] px-8 text-center text-white" lang="mn">
      <div aria-hidden="true" className="text-7xl">📱</div>
      <h1 className="font-display text-2xl font-bold">Утсаа хөндлөнгөөр эргүүлээрэй</h1>
      <p className="max-w-sm text-sm leading-relaxed text-white/75">Open Lab-ийн 3D лаборатори хөндлөн дэлгэцэд тохируулагдсан. Эргүүлмэгц туршилтаа үргэлжлүүлнэ.</p>
      <div aria-hidden="true" className="text-3xl">↻</div>
    </main>;
  }

  return (
    <>
      {loadCanvas && <Suspense fallback={null}>
        <CanvasRuntime map={map} dpr={dpr} onDpr={onDpr} onReady={() => setCanvasReady(true)} preset={preset} />
      </Suspense>}
      {/* Kept mounted when the session ends: the HUD holds the end-of-session report. */}
      {mode !== 'loading' && mode !== 'start' && <Suspense fallback={null}><GameHUD /></Suspense>}
      <LoadingScreen />
      {mode === 'walk' && !canvasReady && <div className="pointer-events-none fixed inset-x-0 bottom-8 z-20 text-center text-sm font-semibold text-slate-600" role="status">3D лабораторийг нээж байна…</div>}
    </>
  );
}
