import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { resumeWalk } from '../controls/useGameKeys';

function time(t: number): string {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

/** Lab notebook: editable notes (saved locally) plus auto-logged events. */
export function NotesPanel() {
  const open = useGameStore((s) => s.panel === 'notes');
  const notes = useGameStore((s) => s.notes);
  const setNotes = useGameStore((s) => s.setNotes);
  const log = useGameStore((s) => s.log);
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
                📓 Лабораторийн тэмдэглэл
              </h2>
              <button type="button" aria-label="Тэмдэглэлийг хаах" className="focus-ring rounded-full px-2 py-1 hover:bg-white/20" onClick={resumeWalk}>
                ✕
              </button>
            </header>
            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1.1fr_1fr]">
              <section className="flex min-h-[220px] flex-col border-b border-amber-100 p-4 md:border-b-0 md:border-r">
                <label htmlFor="notes-text" className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                  Миний тэмдэглэл
                </label>
                <textarea
                  id="notes-text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Таамаглал, ажиглалт, дүгнэлт…"
                  className="focus-ring min-h-[180px] flex-1 resize-none rounded-lg bg-transparent px-1 font-sans text-[15px] leading-[28px] text-slate-800"
                  style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #e7dcbf 27px, #e7dcbf 28px)', backgroundAttachment: 'local' }}
                />
                <div className="mt-2 text-xs text-slate-400">Энэ хөтөч дээр автоматаар хадгалагдана.</div>
              </section>
              <section className="scrollbar-thin min-h-0 overflow-y-auto p-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-700">Үйлдлийн бүртгэл</h3>
                {log.length === 0 ? (
                  <p className="text-sm text-slate-500">Таны үйлдлүүд энд харагдана.</p>
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
