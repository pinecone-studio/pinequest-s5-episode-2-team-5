import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { useSettingsStore } from '../store/useSettingsStore';

/** Short banner at the top center: room names and quick hints. */
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
    <div className="pointer-events-none fixed inset-x-0 top-5 z-30 flex justify-center px-20" aria-live="polite">
      <AnimatePresence>
        {visible && toast && (
          <motion.div key={toast.id} className="rounded-2xl bg-black/55 px-5 py-2.5 text-center text-white shadow-hud backdrop-blur" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="font-display text-lg font-semibold leading-tight">{toast.title}</div>
            {toast.subtitle && <div className="text-xs text-white/80">{toast.subtitle}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Shown in mouse-look mode while the pointer is free (e.g. after a panel closed). */
export function ClickToLookHint() {
  const mouse = useSettingsStore((s) => s.lookMode === 'mouse');
  const show = useGameStore((s) => s.mode === 'walk' && !s.pointerLocked) && mouse;
  return show ? (
    <div className="pointer-events-none fixed left-1/2 top-[58%] z-20 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-sm font-medium text-white backdrop-blur">Click to look around</div>
  ) : null;
}

/** Optional frames-per-second readout (Settings → Show FPS). */
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
  return <div className="pointer-events-none fixed left-20 top-5 z-30 rounded-md bg-black/55 px-2 py-1 font-mono text-xs text-white tabular-nums">{fps} fps</div>;
}
