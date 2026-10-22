import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { loadingProgress, useLoadingStore } from '../store/useLoadingStore';
import { requestLock } from '../controls/usePointerLock';
import { sounds } from '../utils/sounds';
import { useSettingsStore } from '../store/useSettingsStore';
import { ControlsList } from './ControlsHelp';
import { openNaClExperiment } from '../experiments/nacl/bench';

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-lab-yellow font-display text-2xl font-bold text-white shadow-hud">OL</div>
      <div className="text-left">
        <div className="font-display text-3xl font-bold leading-none text-lab-ink">OpenLab 3D</div>
        <div className="mt-1 text-sm font-medium tracking-wide text-slate-500">Виртуал химийн лаборатори</div>
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
      useGameStore.getState().say('Чөлөөт лабораторид тавтай морил! E дарж дурын багажийг ав, Q дарж тавь, R дарж барьж ашигла эсвэл цутга. NaCl ширээ энэ өрөөний нэг хэсэг. Заавар ба анхааруулгыг дагаарай.', 'wave');
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
              <div className="mt-10 h-3 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Лабораторийг ачаалж байна">
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
                Бүрэн тоноглогдсон <b>химийн лабораторид</b> өөрийн нүдээр орж үзээрэй. Багаж руу ойртоход цагаанаар гэрэлтэнэ, дараа нь дэлгэцийн доор харагдах товчлуурыг ашиглаарай. Бунзены горелк асааж, аналитик жингээр шилэн сав жигнэж, татах шүүгээнд аюулгүй ажиллаарай.
              </p>
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <ControlsList compact />
              </div>
              <div className="mt-5 rounded-2xl border-2 border-lab-yellow bg-amber-50 p-4">
                <div className="text-xs font-bold uppercase text-amber-700">Нэг орон зай · Чөлөөт лаборатори</div>
                <h2 className="mt-1 font-display text-xl font-bold">Багажаа аваад, өөрөө туршаарай</h2>
                <p className="mt-2 text-sm text-slate-600">NaCl ширээ нь энэ өрөөний нэг хэсэг. Дурын багажийг E дарж авч, Q дарж тавь. R дарж барьж цутга. Заавар чиглүүлнэ, алхам түгжихгүй.</p>
                <button type="button" className="btn-ghost mt-3 w-full py-3 text-sm" onClick={openNaClExperiment}>
                  NaCl ажлын ширээнд очих (заавал биш) →
                </button>
              </div>
              <button type="button" className="btn-yellow mt-3 w-full py-3 text-base" onClick={enterLab} autoFocus>
                Лабораторид орох
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">Эргэн харахад хулгана түгжигдэнэ — хүссэн үедээ Esc дарж чөлөөлнө.</p>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
