import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { openPanelFromGame, resumeWalk } from '../controls/useGameKeys';
import { releaseLock } from '../controls/usePointerLock';
import { sounds } from '../utils/sounds';

/** "End" button (top right) and its confirmation dialog. */
export function EndButton() {
  return (
    <button type="button" aria-label="End session" onClick={() => openPanelFromGame('endConfirm')} className="hud-square focus-ring pointer-events-auto text-sm font-semibold tracking-wide">
      End
    </button>
  );
}

export function EndConfirm() {
  const open = useGameStore((s) => s.panel === 'endConfirm');
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="alertdialog" aria-modal="true" aria-labelledby="end-title" className="panel-card w-full max-w-sm p-6 text-center" initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">🧪</div>
            <h2 id="end-title" className="font-display text-xl font-bold">
              End this lab session?
            </h2>
            <p className="mt-2 text-sm text-slate-600">You’ll see a summary of your measurements and progress. Your notebook text is kept.</p>
            <div className="mt-5 flex justify-center gap-3">
              <button className="btn-ghost" onClick={resumeWalk} autoFocus>
                Keep working
              </button>
              <button
                className="btn-yellow"
                onClick={() => {
                  releaseLock();
                  sounds.play('success');
                  useGameStore.getState().endSession();
                }}
              >
                End session
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
