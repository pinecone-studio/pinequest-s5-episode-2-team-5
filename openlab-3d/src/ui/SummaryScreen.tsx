import { AnimatePresence, motion } from 'framer-motion';
import { playerApi, useGameStore } from '../store/useGameStore';
import { computeResults, estimateElementaryCharge, STEP_ORDER, useExperimentStore } from '../store/useExperimentStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { ROOMS, SPAWN } from '../world/layout';
import { CATALOG } from '../equipment/equipmentCatalog';
import { clearDrops } from '../experiment/millikanSim';
import { MILLIKAN } from '../utils/constants';
import { sounds } from '../utils/sounds';

function duration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} min ${s % 60} s` : `${s} s`;
}

export function restartSession(): void {
  sounds.setHum(false);
  clearDrops();
  useExperimentStore.getState().reset();
  useInventoryStore.getState().reset();
  playerApi.teleport(SPAWN.x, SPAWN.z, SPAWN.yaw);
  useGameStore.getState().restart();
}

/** End-of-session summary: time, rooms, steps, measurements and the estimate of e. */
export function SummaryScreen() {
  const game = useGameStore();
  const steps = useExperimentStore((s) => s.steps);
  const measurements = useExperimentStore((s) => s.measurements);
  const results = computeResults(measurements);
  const estimate = estimateElementaryCharge(results);
  const open = game.mode === 'ended';
  const done = STEP_ORDER.filter((s) => steps[s.id]).length;
  const err = estimate ? Math.abs((estimate.e - MILLIKAN.e) / MILLIKAN.e) * 100 : null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-gradient-to-br from-slate-100 to-amber-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="panel-card w-full max-w-3xl p-6 sm:p-8" initial={{ y: 24 }} animate={{ y: 0 }} role="dialog" aria-labelledby="summary-title">
            <div className="text-xs font-bold uppercase tracking-wider text-lab-yellowDark">Session complete</div>
            <h2 id="summary-title" className="font-display text-3xl font-bold">
              Lab report
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Time in lab', duration((game.endedAt ?? Date.now()) - game.sessionStart)],
                ['Areas explored', `${game.visitedRooms.length} / ${ROOMS.length}`],
                ['Equipment inspected', String(game.inspectedKinds.length)],
                ['Measurements', String(measurements.length)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="font-display text-xl font-bold">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="font-semibold">Millikan Oil Drop · {done}/{STEP_ORDER.length} steps</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {STEP_ORDER.map((s) => (
                    <li key={s.id} className={steps[s.id] ? 'text-slate-700' : 'text-slate-400'}>
                      {steps[s.id] ? '✅' : '⬜'} {s.label}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="font-semibold">Result</h3>
                {estimate ? (
                  <>
                    <p className="mt-2 font-display text-3xl font-bold tabular-nums">{(estimate.e / 1e-19).toFixed(3)} × 10⁻¹⁹ C</p>
                    <p className="text-sm text-slate-500">
                      from {estimate.count} solved charge{estimate.count === 1 ? '' : 's'} · {err?.toFixed(1)}% from the accepted 1.602 × 10⁻¹⁹ C
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No charge was solved this time. Record a fall run and a field run for the same drop next session.</p>
                )}
                {game.inspectedKinds.length > 0 && (
                  <p className="mt-3 text-xs text-slate-500">Inspected: {game.inspectedKinds.map((k) => CATALOG[k].name).join(', ')}</p>
                )}
              </section>
            </div>
            <div className="mt-6 flex justify-end">
              <button className="btn-yellow px-6 py-3" onClick={restartSession}>
                Start a new session
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
