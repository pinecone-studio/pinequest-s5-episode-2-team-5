import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { keyLabel, promptKey } from '../controls/keyMap';
import { resumeWalk } from '../controls/useGameKeys';

export function ControlsList({ compact = false }: { compact?: boolean }) {
  const b = useSettingsStore((s) => s.bindings);
  const lookMode = useSettingsStore((s) => s.lookMode);
  const rows: [string, string][] = [
    [`${keyLabel(b.forward[0])} ${keyLabel(b.left[0])} ${keyLabel(b.backward[0])} ${keyLabel(b.right[0])} / ↑ ← ↓ →`, 'Алхах'],
    [lookMode === 'mouse' ? 'Хулгана' : `← → / ${keyLabel(b.turnLeft[0])} ${keyLabel(b.turnRight[0])}`, 'Эргэн харах'],
    [promptKey('interact', b, lookMode), 'Ашиглах / авах'],
    [promptKey('inspect', b, lookMode), 'Ойроос харах'],
    [promptKey('drop', b, lookMode), 'Тавих'],
    [keyLabel(b.use[0]), 'Чиглүүлж ашиглах / цутгах (дарж барих)'],
    [keyLabel(b.closeup[0]), 'Ширээний ажлын харагдац / буцах'],
    ['Зүүн чирэх', 'Ширээгээр шилжих (ширээний харагдац)'],
    ['Баруун чирэх', 'Эргүүлэх (ширээний харагдац)'],
    ['Дугуй / + −', 'Ойртуулах, холдуулах (ширээний харагдац)'],
    [keyLabel(b.sprint[0]), 'Гүйх'],
    [keyLabel(b.jump[0]), 'Үсрэх'],
    [keyLabel(b.tools[0]), 'Багажны шургуулга'],
    [keyLabel(b.notes[0]), 'Лабын тэмдэглэл'],
    [keyLabel(b.map[0]), 'Газрын зураг'],
    ['Esc', 'Цэс / түр зогсоох'],
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
              Удирдлага
            </h2>
            <p className="mb-4 mt-1 text-sm text-slate-500">Багаж руу ойртоход цагаанаар гэрэлтэнэ. Дараа нь дэлгэцийн доор харагдах товчлуурыг ашиглаарай.</p>
            <ControlsList />
            <div className="mt-5 flex justify-end">
              <button className="btn-yellow" onClick={resumeWalk} autoFocus>
                Ойлголоо
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
