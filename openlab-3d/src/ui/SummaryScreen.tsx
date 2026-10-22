import { AnimatePresence, motion } from 'framer-motion';
import { playerApi, useGameStore } from '../store/useGameStore';
import { SKILLS, useExperimentStore } from '../store/useExperimentStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { SPAWN } from '../world/layout';
import { CATALOG } from '../equipment/equipmentCatalog';
import { resetScenePortables } from '../interaction/portable';
import { resetSandbox } from '../experiments/nacl/sandbox';

function duration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} мин ${s % 60} сек` : `${s} сек`;
}

export function restartSession(): void {
  resetScenePortables();
  resetSandbox();
  useExperimentStore.getState().reset();
  useInventoryStore.getState().reset();
  playerApi.teleport(SPAWN.x, SPAWN.z, SPAWN.yaw);
  useGameStore.getState().restart();
}

/** End-of-session summary: time, bench skills, inspected and placed equipment. */
export function SummaryScreen() {
  const game = useGameStore();
  const skills = useExperimentStore((s) => s.skills);
  const placed = useInventoryStore((s) => s.placedCount);
  const open = game.mode === 'ended';
  const done = SKILLS.filter((s) => skills[s.id]).length;
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-gradient-to-br from-slate-100 to-amber-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="panel-card w-full max-w-3xl p-6 sm:p-8" initial={{ y: 24 }} animate={{ y: 0 }} role="dialog" aria-labelledby="summary-title">
            <div className="text-xs font-bold uppercase tracking-wider text-lab-yellowDark">Сесс дууслаа</div>
            <h2 id="summary-title" className="font-display text-3xl font-bold">
              Лабораторийн тайлан
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Лабд өнгөрүүлсэн хугацаа', duration((game.endedAt ?? Date.now()) - game.sessionStart)],
                ['Лабораторийн дадал', `${done} / ${SKILLS.length}`],
                ['Ойроос харсан багаж', String(game.inspectedKinds.length)],
                ['Тавьсан эд зүйл', String(placed)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="font-display text-xl font-bold">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="font-semibold">Лабораторийн дадал · {done}/{SKILLS.length}</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {SKILLS.map((s) => (
                    <li key={s.id} className={skills[s.id] ? 'text-slate-700' : 'text-slate-400'}>
                      {skills[s.id] ? '✅' : '⬜'} {s.label}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="font-semibold">Ойроос харсан багаж</h3>
                {game.inspectedKinds.length > 0 ? (
                  <p className="mt-2 text-sm text-slate-600">{game.inspectedKinds.map((k) => CATALOG[k].name).join(', ')}</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Энэ удаа юу ч ойроос хараагүй байна. Дараагийн удаа аль нэг багаж дээр F дарж үзээрэй.</p>
                )}
              </section>
            </div>
            <div className="mt-6 flex justify-end">
              <button className="btn-yellow px-6 py-3" onClick={restartSession}>
                Шинээр эхлэх
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
