import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { SKILLS, useExperimentStore } from '../store/useExperimentStore';
import { resumeWalk } from '../controls/useGameKeys';
import { sounds } from '../utils/sounds';
import { SettingsPanel } from './SettingsPanel';
import { ControlsList } from './ControlsHelp';

type Tab = 'experiments' | 'settings' | 'controls';

function ExperimentsTab() {
  const skills = useExperimentStore((s) => s.skills);
  const doneCount = SKILLS.filter((s) => skills[s.id]).length;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Chemistry Lab</div>
          <h3 className="font-display text-lg font-bold">Bench skills</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {doneCount}/{SKILLS.length}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600">Light a Bunsen burner, weigh glassware on the balance (tare first!), and raise the fume-hood sash.</p>
      <ol className="mt-3 space-y-1.5">
        {SKILLS.map((s, i) => (
          <li key={s.id} className="flex items-start gap-2 text-sm">
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${skills[s.id] ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{skills[s.id] ? '✓' : i + 1}</span>
            <span className={skills[s.id] ? 'text-slate-400 line-through' : 'text-slate-700'}>{s.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'experiments', label: 'Experiments' },
  { id: 'settings', label: 'Settings' },
  { id: 'controls', label: 'Controls' },
];

/** Left slide-in menu: Resume, Experiments, Settings, Controls help. */
export function MenuPanel() {
  const open = useGameStore((s) => s.panel === 'menu');
  const [tab, setTab] = useState<Tab>('experiments');
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-slate-900/25" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resumeWalk} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            className="fixed bottom-0 left-0 top-0 z-50 flex w-[min(420px,100vw)] flex-col bg-slate-50 shadow-2xl"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          >
            <header className="flex items-center gap-3 bg-lab-yellow px-5 py-4 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 font-display text-lg font-bold">OL</div>
              <div className="flex-1">
                <div className="font-display text-lg font-bold leading-tight">OpenLab 3D</div>
                <div className="text-xs text-white/85">Virtual chemistry laboratory</div>
              </div>
              <button type="button" aria-label="Close menu" onClick={resumeWalk} className="focus-ring rounded-full p-2 hover:bg-white/20">
                ✕
              </button>
            </header>
            <div className="px-5 pt-4">
              <button type="button" className="btn-yellow w-full py-3 text-base" onClick={resumeWalk}>
                ▶ Resume
              </button>
              <nav className="mt-4 flex gap-1 rounded-xl bg-slate-200/70 p-1" role="tablist">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => {
                      setTab(t.id);
                      sounds.play('ui');
                    }}
                    className={`focus-ring flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${tab === t.id ? 'bg-white text-lab-ink shadow' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4" role="tabpanel">
              {tab === 'experiments' && <ExperimentsTab />}
              {tab === 'settings' && <SettingsPanel />}
              {tab === 'controls' && <ControlsList />}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
