/**
 * Lab-specific HUD pieces: the pour/measure gauge above the prompt, the throw wind-up
 * bar, the safety-gear badges (with a faint goggles frame on screen while they are
 * worn) and the card of the active experiment with its next step.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useActionHud } from '../interaction/actions';
import { throwCharge } from '../interaction/heldApi';
import { useChemStore } from '../store/useChemStore';
import { useGameStore } from '../store/useGameStore';
import { useLabStore } from '../store/useLabStore';
import { experimentById } from '../lab/experiments';
import { spawnNearPlayer } from '../interaction/spawn';
import { sounds } from '../utils/sounds';

export function ActionGauge() {
  const { label, detail, visible } = useActionHud();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-40 z-20 flex justify-center sm:bottom-24">
      <AnimatePresence>
        {visible && (
          <motion.div className="rounded-2xl bg-sky-900/75 px-4 py-2 text-center text-white shadow-hud backdrop-blur" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="font-display text-base font-semibold tabular-nums">{label}</div>
            {detail && <div className="text-xs text-white/80 tabular-nums">{detail}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ThrowMeter() {
  const [power, setPower] = useState<number | null>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const since = throwCharge.since;
      setPower(since === null ? null : Math.min(1, (performance.now() - since) / 900));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  if (power === null) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-[58%] z-20 w-40 -translate-x-1/2">
      <div className="mb-1 text-center text-xs font-semibold text-white drop-shadow">Шидэх хүч</div>
      <div className="h-2 overflow-hidden rounded-full bg-black/40">
        <div className="h-full rounded-full bg-gradient-to-r from-lab-yellow to-red-500" style={{ width: `${Math.round(power * 100)}%` }} />
      </div>
    </div>
  );
}

export function SafetyBadges() {
  const worn = useChemStore((s) => s.worn);
  const take = (what: 'goggles' | 'gloves') => {
    useChemStore.getState().setWorn(what, false);
    spawnNearPlayer(what);
    sounds.play('pickup');
  };
  return (
    <>
      {worn.goggles && (
        <div
          className="pointer-events-none fixed inset-0 z-[5]"
          style={{ boxShadow: 'inset 0 0 0 10px rgba(80,90,105,0.35), inset 0 0 90px 30px rgba(140,200,255,0.12)', borderRadius: '42px' }}
          aria-hidden
        />
      )}
      <div className="pointer-events-auto fixed right-4 top-[68px] z-30 flex flex-col items-end gap-1.5">
        {(['goggles', 'gloves'] as const).map((what) => (
          <button
            key={what}
            type="button"
            onClick={() => worn[what] && take(what)}
            title={worn[what] ? 'Дарж тайлах' : 'Ширээн дээрх эсвэл «Хамгаалалт» шургуулганаас аваад E дарж зүү'}
            className={`focus-ring flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-hud backdrop-blur ${worn[what] ? 'bg-emerald-500/90 text-white' : 'bg-black/45 text-white/80'}`}
          >
            <span>{what === 'goggles' ? '🥽' : '🧤'}</span>
            {what === 'goggles' ? (worn.goggles ? 'Нүдний шил зүүсэн' : 'Нүдний шилгүй') : worn.gloves ? 'Бээлий өмссөн' : 'Бээлийгүй'}
          </button>
        ))}
      </div>
    </>
  );
}

/** The active experiment, its next step and progress (top left, under the menu button). */
export function ExperimentCard() {
  const active = useLabStore((s) => s.active);
  const progress = useLabStore((s) => s.progress);
  const [collapsed, setCollapsed] = useState(false);
  const x = active ? experimentById(active) : undefined;
  if (!x) return null;
  const done = progress[x.id] ?? [];
  const next = x.steps.find((s) => !done.includes(s.id));
  return (
    <div className="pointer-events-auto fixed left-4 top-[76px] z-30 w-[min(300px,calc(100vw-120px))] max-sm:hidden">
      <div className="rounded-2xl bg-white/90 p-3 text-lab-ink shadow-hud backdrop-blur">
        <button type="button" className="focus-ring flex w-full items-center justify-between gap-2 text-left" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed}>
          <span>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600">Туршилт · {done.length}/{x.steps.length}</span>
            <span className="block font-display text-sm font-bold leading-tight">{x.title}</span>
          </span>
          <span className="text-xs text-slate-400">{collapsed ? '▼' : '▲'}</span>
        </button>
        {!collapsed && (
          <>
            <ol className="mt-2 space-y-1">
              {x.steps.map((s, i) => {
                const ok = done.includes(s.id);
                const isNext = s === next;
                return (
                  <li key={s.id} className={`flex items-start gap-2 text-xs ${ok ? 'text-slate-400 line-through' : isNext ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${ok ? 'bg-green-500 text-white' : isNext ? 'bg-lab-yellow text-white' : 'bg-slate-200 text-slate-500'}`}>{ok ? '✓' : i + 1}</span>
                    {s.text}
                  </li>
                );
              })}
            </ol>
            {next && (
              <button
                type="button"
                className="focus-ring mt-2 w-full rounded-lg bg-amber-50 px-2 py-1 text-left text-[11px] text-amber-900 hover:bg-amber-100"
                onClick={() => useGameStore.getState().say(next.hint, 'think')}
              >
                💡 Зөвлөгөө: {next.hint}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
