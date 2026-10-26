import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { usePerfStore } from '../store/usePerfStore';
import { keyLabel } from '../controls/keyMap';
import { isTouchDevice } from '../utils/device';
import { mobileizeControlHint } from '../controls/mobileInteraction';

/** Short banner at the top center for quick notices. */
export function RoomToast() {
  const toast = useGameStore((s) => s.toast);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[55] flex justify-center px-3 sm:px-20" aria-live="polite">
      <AnimatePresence>
        {visible && toast && (
          <motion.div key={toast.id} className="max-w-lg rounded-2xl bg-white/95 px-4 py-2.5 text-center text-lab-ink shadow-hud backdrop-blur" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="font-display text-sm font-semibold leading-tight">{isTouchDevice() ? mobileizeControlHint(toast.title) : toast.title}</div>
            {toast.subtitle && <div className="text-xs text-slate-600">{isTouchDevice() ? mobileizeControlHint(toast.subtitle) : toast.subtitle}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Shown in mouse-look mode while the pointer is free (e.g. after a panel closed). */
export function ClickToLookHint() {
  const mouse = useSettingsStore((s) => s.lookMode === 'mouse');
  const key = useSettingsStore((s) => keyLabel(s.bindings.cursor[0]));
  const show = useGameStore((s) => s.mode === 'walk' && !s.pointerLocked) && mouse;
  const cursorFree = useGameStore((s) => s.cursorFree);
  return show ? (
    <div className="pointer-events-none fixed left-1/2 top-[58%] z-20 -translate-x-1/2 rounded-full bg-white/95 px-4 py-1.5 text-sm font-medium text-lab-ink backdrop-blur">
      {cursorFree ? (
        <>
          Хулган чөлөөтэй · <span className="kbd !border-slate-200 !bg-white !text-lab-ink !shadow-none">{key}</span> эсвэл дэлгэц дээр дарж эргэн харна
        </>
      ) : (
        'Эргэн харахын тулд дарна уу'
      )}
    </div>
  ) : null;
}

const QUALITY_SHORT = { low: 'Бага', medium: 'Дунд', high: 'Өндөр' } as const;

/** Optional frames-per-second readout (Settings → Show FPS), with the governor's quality tier and resolution scale. */
export function FpsCounter() {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      frames++;
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const quality = useSettingsStore((st) => st.quality);
  const auto = useSettingsStore((st) => st.autoQuality);
  const dpr = usePerfStore((st) => st.dpr);
  return (
    <div className="pointer-events-none fixed left-20 top-5 z-30 rounded-md bg-black/55 px-2 py-1 font-mono text-xs text-white tabular-nums">
      {fps} fps · {auto ? 'A·' : ''}{QUALITY_SHORT[quality]} · {dpr.toFixed(2).replace(/\.?0+$/, '')}×
    </div>
  );
}
