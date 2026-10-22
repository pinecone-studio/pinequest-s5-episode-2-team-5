import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { loadingProgress, useLoadingStore } from '../store/useLoadingStore';
import { requestLock } from '../controls/usePointerLock';
import { sounds } from '../utils/sounds';
import { useSettingsStore } from '../store/useSettingsStore';
import { ControlsList } from './ControlsHelp';

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-lab-yellow font-display text-2xl font-bold text-white shadow-hud">OL</div>
      <div className="text-left">
        <div className="font-display text-3xl font-bold leading-none text-lab-ink">OpenLab 3D</div>
        <div className="mt-1 text-sm font-medium tracking-wide text-slate-500">Virtual Science Laboratory</div>
      </div>
    </div>
  );
}

export function enterLab(): void {
  sounds.unlock();
  sounds.setVolume(useSettingsStore.getState().volume);
  sounds.play('success');
  const game = useGameStore.getState();
  game.setMode('walk');
  requestLock();
  window.setTimeout(() => {
    if (!useGameStore.getState().robot.text) {
      useGameStore.getState().say('Welcome! Walk to the Physics Lab to start the Millikan Oil Drop experiment.', 'wave');
    }
  }, 700);
}

/** Loading progress, then the "Click to enter the lab" start screen with the controls. */
export function LoadingScreen() {
  const mode = useGameStore((s) => s.mode);
  const done = useLoadingStore((s) => s.done);
  const { progress, label, complete } = loadingProgress(done);
  useEffect(() => {
    if (complete && useGameStore.getState().mode === 'loading') useGameStore.getState().setMode('start');
  }, [complete]);
  const visible = mode === 'loading' || mode === 'start';
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loading"
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4"
          style={{ background: mode === 'loading' ? 'linear-gradient(160deg,#f6f7f9 0%,#e7ebef 100%)' : 'rgba(238,240,242,0.55)', backdropFilter: mode === 'start' ? 'blur(6px)' : undefined }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {mode === 'loading' ? (
            <div className="w-full max-w-md text-center">
              <div className="flex justify-center">
                <Logo />
              </div>
              <div className="mt-10 h-3 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Loading the lab">
                <motion.div className="h-full rounded-full bg-lab-yellow" initial={{ width: "4%" }} animate={{ width: `${Math.max(4, progress * 100)}%` }} transition={{ ease: 'easeOut', duration: 0.35 }} />
              </div>
              <div className="mt-3 flex justify-between text-sm text-slate-500">
                <span>{label}…</span>
                <span className="font-semibold tabular-nums">{Math.round(progress * 100)}%</span>
              </div>
            </div>
          ) : (
            <motion.div className="panel-card w-full max-w-2xl p-6 sm:p-8" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <Logo />
              <p className="mt-4 text-slate-600">
                Explore a full science facility in first person. Walk up to any equipment until it glows white, then use the keys shown at the bottom of the screen. Your first mission: the <b>Millikan Oil Drop</b> experiment in the Physics Lab.
              </p>
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <ControlsList compact />
              </div>
              <button type="button" className="btn-yellow mt-6 w-full py-4 text-lg" onClick={enterLab} autoFocus>
                Click to enter the lab
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">The mouse is captured for looking around — press Esc any time to get it back.</p>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
