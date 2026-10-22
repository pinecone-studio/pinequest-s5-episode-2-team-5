import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { computeResults, estimateElementaryCharge, useExperimentStore } from '../store/useExperimentStore';
import { resumeWalk } from '../controls/useGameKeys';

const KIND_LABEL = { fall: 'Fall (field off)', field: 'Field on', balance: 'Balanced' } as const;

function time(t: number): string {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

/** Lab notebook: editable notes (saved locally) plus auto-logged events and measurements. */
export function NotesPanel() {
  const open = useGameStore((s) => s.panel === 'notes');
  const notes = useGameStore((s) => s.notes);
  const setNotes = useGameStore((s) => s.setNotes);
  const log = useGameStore((s) => s.log);
  const measurements = useExperimentStore((s) => s.measurements);
  const results = computeResults(measurements);
  const estimate = estimateElementaryCharge(results);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-3 backdrop-blur-[2px] sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resumeWalk}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notes-title"
            className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[#fffdf6] shadow-2xl"
            initial={{ y: 30, rotate: -0.6 }}
            animate={{ y: 0, rotate: 0 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-amber-200/70 bg-lab-yellow px-5 py-3 text-white">
              <h2 id="notes-title" className="font-display text-lg font-bold">
                📓 Lab Notebook
              </h2>
              <button type="button" aria-label="Close notes" className="focus-ring rounded-full px-2 py-1 hover:bg-white/20" onClick={resumeWalk}>
                ✕
              </button>
            </header>
            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1.1fr_1fr]">
              <section className="flex min-h-[220px] flex-col border-b border-amber-100 p-4 md:border-b-0 md:border-r">
                <label htmlFor="notes-text" className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                  My notes
                </label>
                <textarea
                  id="notes-text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Hypothesis, observations, sketches in words…"
                  className="focus-ring min-h-[180px] flex-1 resize-none rounded-lg bg-transparent px-1 font-sans text-[15px] leading-[28px] text-slate-800"
                  style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #e7dcbf 27px, #e7dcbf 28px)', backgroundAttachment: 'local' }}
                />
                <div className="mt-2 text-xs text-slate-400">Saved automatically in this browser.</div>
              </section>
              <section className="scrollbar-thin min-h-0 overflow-y-auto p-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-700">Measurements (auto-logged)</h3>
                {results.length === 0 ? (
                  <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">No measurements yet. Time a drop in the Millikan eyepiece and press Record.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs tabular-nums">
                      <thead className="text-slate-500">
                        <tr>
                          <th className="py-1 pr-2">Drop</th>
                          <th className="pr-2">Type</th>
                          <th className="pr-2 text-right">t (s)</th>
                          <th className="pr-2 text-right">V</th>
                          <th className="pr-2 text-right">v (mm/s)</th>
                          <th className="text-right">q / e</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r) => (
                          <tr key={r.id} className="border-t border-amber-100">
                            <td className="py-1 pr-2 font-semibold">{r.dropLabel}</td>
                            <td className="pr-2">{KIND_LABEL[r.kind]}</td>
                            <td className="pr-2 text-right">{r.kind === 'balance' ? '—' : r.timeS.toFixed(2)}</td>
                            <td className="pr-2 text-right">{r.voltage}</td>
                            <td className="pr-2 text-right">{r.velocityMmS.toFixed(4)}</td>
                            <td className="text-right">{r.units === null ? '—' : r.units.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {estimate && (
                  <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-900">
                    Best estimate: <b>e ≈ {(estimate.e / 1e-19).toFixed(3)} × 10⁻¹⁹ C</b> from {estimate.count} solved measurement{estimate.count === 1 ? '' : 's'}.
                  </div>
                )}
                <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-amber-700">Activity log</h3>
                {log.length === 0 ? (
                  <p className="text-sm text-slate-500">Your actions will appear here.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {[...log].reverse().slice(0, 60).map((l, i) => (
                      <li key={`${l.t}-${i}`} className="flex gap-2">
                        <span className="shrink-0 font-mono text-xs text-slate-400">{time(l.t)}</span>
                        <span className="text-slate-700">{l.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
