import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { playerApi, useGameStore } from '../store/useGameStore';
import { STEP_ORDER, useExperimentStore } from '../store/useExperimentStore';
import { ROOMS, type RoomId } from '../world/layout';
import { resumeWalk } from '../controls/useGameKeys';
import { sounds } from '../utils/sounds';
import { SettingsPanel } from './SettingsPanel';
import { ControlsList } from './ControlsHelp';

type Tab = 'rooms' | 'experiments' | 'settings' | 'controls';

const ROOM_ICONS: Record<RoomId, string> = { mainHall: '🏛️', corridor: '🚪', physics: '⚛️', chemistry: '⚗️', biology: '🔬', storage: '📦' };

export function teleportTo(x: number, z: number, yaw: number): void {
  playerApi.teleport(x, z, yaw);
  sounds.play('whoosh');
  resumeWalk();
}

function RoomsTab() {
  const visited = useGameStore((s) => s.visitedRooms);
  const current = useGameStore((s) => s.currentRoom);
  return (
    <ul className="space-y-2">
      {ROOMS.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            onClick={() => teleportTo(r.spawn.x, r.spawn.z, r.spawn.yaw)}
            className="focus-ring flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-lab-yellow hover:bg-amber-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg text-lg" style={{ background: r.mapColor }} aria-hidden>
              {ROOM_ICONS[r.id]}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">{r.name}</span>
              <span className="block text-xs text-slate-500">{current === r.id ? 'You are here' : visited.includes(r.id) ? 'Visited' : 'Not visited yet'}</span>
            </span>
            <span className="text-xs font-semibold text-lab-yellowDark">Go →</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ExperimentsTab() {
  const steps = useExperimentStore((s) => s.steps);
  const count = useExperimentStore((s) => s.measurements.length);
  const doneCount = STEP_ORDER.filter((s) => steps[s.id]).length;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-lab-yellowDark">Physics Lab · Station 1</div>
            <h3 className="font-display text-lg font-bold">Millikan Oil Drop</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {doneCount}/{STEP_ORDER.length}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600">Measure the charge of tiny oil drops and discover that charge comes in whole multiples of e.</p>
        <ol className="mt-3 space-y-1.5">
          {STEP_ORDER.map((s, i) => (
            <li key={s.id} className="flex items-start gap-2 text-sm">
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${steps[s.id] ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{steps[s.id] ? '✓' : i + 1}</span>
              <span className={steps[s.id] ? 'text-slate-400 line-through' : 'text-slate-700'}>{s.label}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">{count} measurement{count === 1 ? '' : 's'} recorded</span>
          <button className="btn-yellow !py-1.5 text-sm" onClick={() => teleportTo(-12, -7.6, 0)}>
            Go to station
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-violet-600">Biology Lab</div>
        <h3 className="font-display text-lg font-bold">Cells under the microscope</h3>
        <p className="mt-1 text-sm text-slate-600">Compare onion, blood, pond-water and leaf slides. Scroll to focus while looking through the eyepiece.</p>
        <div className="mt-3 flex justify-end">
          <button className="btn-ghost !py-1.5 text-sm" onClick={() => teleportTo(-13.5, 9.4, -Math.PI / 2)}>
            Go to microscopes
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Chemistry Lab</div>
        <h3 className="font-display text-lg font-bold">Bench skills</h3>
        <p className="mt-1 text-sm text-slate-600">Light a Bunsen burner, weigh glassware on the balance (tare first!), and raise the fume-hood sash.</p>
        <div className="mt-3 flex justify-end">
          <button className="btn-ghost !py-1.5 text-sm" onClick={() => teleportTo(1, -5.2, 0)}>
            Go to chemistry
          </button>
        </div>
      </div>
    </div>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'rooms', label: 'Rooms' },
  { id: 'experiments', label: 'Experiments' },
  { id: 'settings', label: 'Settings' },
  { id: 'controls', label: 'Controls' },
];

/** Left slide-in menu: Resume, Rooms (teleport), Experiments, Settings, Controls help. */
export function MenuPanel() {
  const open = useGameStore((s) => s.panel === 'menu');
  const [tab, setTab] = useState<Tab>('rooms');
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
                <div className="text-xs text-white/85">Virtual science laboratory</div>
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
              {tab === 'rooms' && <RoomsTab />}
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
