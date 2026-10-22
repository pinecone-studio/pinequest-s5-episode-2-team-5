import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { keyLabel, promptKey } from '../controls/keyMap';
import { resumeWalk } from '../controls/useGameKeys';

export function ControlsList({ compact = false }: { compact?: boolean }) {
  const b = useSettingsStore((s) => s.bindings);
  const lookMode = useSettingsStore((s) => s.lookMode);
  const rows: [string, string][] = [
    [`${keyLabel(b.forward[0])} ${keyLabel(b.left[0])} ${keyLabel(b.backward[0])} ${keyLabel(b.right[0])} / ↑ ← ↓ →`, 'Move'],
    [lookMode === 'mouse' ? 'Mouse' : `← → / ${keyLabel(b.turnLeft[0])} ${keyLabel(b.turnRight[0])}`, 'Look around'],
    [promptKey('interact', b, lookMode), 'Interact / pick up'],
    [promptKey('inspect', b, lookMode), 'Inspect object'],
    [promptKey('drop', b, lookMode), 'Drop / place item'],
    [keyLabel(b.sprint[0]), 'Sprint'],
    [keyLabel(b.jump[0]), 'Jump'],
    [keyLabel(b.tools[0]), 'Tools drawer'],
    [keyLabel(b.notes[0]), 'Lab notes'],
    [keyLabel(b.map[0]), 'Minimap'],
    ['Esc', 'Menu / pause'],
  ];
  return (
    <ul className={`grid gap-x-6 gap-y-2 ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
      {rows.map(([k, label]) => (
        <li key={label} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-600">{label}</span>
          <span className="flex flex-wrap justify-end gap-1">
            {k.split(' ').filter(Boolean).map((part, i) => (part === '/' ? <span key={i} className="text-slate-400">/</span> : <span key={i} className="kbd">{part}</span>))}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ControlsHelp() {
  const open = useGameStore((s) => s.panel === 'help');
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resumeWalk}>
          <motion.div role="dialog" aria-modal="true" aria-labelledby="help-title" className="panel-card w-full max-w-xl p-6" initial={{ y: 16 }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()}>
            <h2 id="help-title" className="font-display text-xl font-bold">
              Controls
            </h2>
            <p className="mb-4 mt-1 text-sm text-slate-500">Walk up to equipment until it glows white, then use the keys shown at the bottom of the screen.</p>
            <ControlsList />
            <div className="mt-5 flex justify-end">
              <button className="btn-yellow" onClick={resumeWalk} autoFocus>
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
