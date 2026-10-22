import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { resumeWalk } from '../controls/useGameKeys';
import { sounds } from '../utils/sounds';

/** Shown when Esc releases the mouse. */
export function PauseMenu() {
  const open = useGameStore((s) => s.mode === 'paused');
  const lookMode = useSettingsStore((s) => s.lookMode);
  const go = (panel: 'menu' | 'help' | 'endConfirm') => {
    sounds.play('ui');
    useGameStore.getState().openPanel(panel);
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" aria-labelledby="pause-title" className="panel-card w-full max-w-xs p-6 text-center" initial={{ scale: 0.94 }} animate={{ scale: 1 }}>
            <h2 id="pause-title" className="font-display text-2xl font-bold">
              Paused
            </h2>
            <p className="mt-1 text-sm text-slate-500">{lookMode === 'mouse' ? 'Click Resume to grab the mouse again.' : 'Press Esc or Resume to continue.'}</p>
            <div className="mt-5 flex flex-col gap-2">
              <button className="btn-yellow py-3 text-base" onClick={resumeWalk} autoFocus>
                ▶ Resume
              </button>
              <button className="btn-ghost" onClick={() => go('menu')}>
                Menu & settings
              </button>
              <button className="btn-ghost" onClick={() => go('help')}>
                Controls
              </button>
              <button className="btn-ghost text-red-600" onClick={() => go('endConfirm')}>
                End session
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
