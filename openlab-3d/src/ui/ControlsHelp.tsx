import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { keyLabel, promptKey, type Bindings, type LookMode } from '../controls/keyMap';
import { requestLock } from '../controls/pointerLock';
import { isTouchDevice } from '../utils/device';

/** Удирдлагын мөрүүд: [товч эсвэл хөдөлгөөн, юу хийх]. Утас болон компьютерт өөр жагсаалттай. ControlsList ба шинэ цэсний Удирдлага таб хоёулаа ашиглана. */
export function controlRows(touch: boolean, b: Bindings, lookMode: LookMode): [string, string][] {
  return touch ? [
    ['Зүүн талын joystick', 'Алхах'],
    ['Баруун талд чирэх', 'Эргэн харах'],
    ['Гэрэлтсэн зүйл дээр товших', 'Харилцах / авах'],
    ['Барьсан зүйлтэй бай руу товших', 'Ашиглах / савлах'],
    ['Барьсан зүйлтэй хоосон газар товших', 'Тавих'],
    ['Хоосон газар удаан дарах', 'Шидэх'],
    ['F', 'Ойроос харах'],
    ['⇧', 'Гүйх горим'],
  ] : [
    [`${keyLabel(b.forward[0])} ${keyLabel(b.left[0])} ${keyLabel(b.backward[0])} ${keyLabel(b.right[0])} / ↑ ← ↓ →`, 'Алхах'],
    [lookMode === 'mouse' ? 'Хулгана' : `← → / ${keyLabel(b.turnLeft[0])} ${keyLabel(b.turnRight[0])}`, 'Эргэн харах'],
    [promptKey('interact', b, lookMode), 'Ашиглах / авах'],
    [promptKey('inspect', b, lookMode), 'Ойроос харах'],
    [promptKey('drop', b, lookMode), 'Тавих / шургуулга, тавиурт хийх'],
    [keyLabel(b.grab[0]), 'Горелк, жинг шууд авах'],
    [keyLabel(b.pour[0]), 'Ашиглах: асгах, дусаах, хэмжих, хутгах (дарсаар)'],
    [keyLabel(b.throw[0]), 'Шидэх (удаан дарвал хүчтэй)'],
    [keyLabel(b.closeup[0]), 'Ширээний ажлын харагдац / буцах'],
    ['Зүүн чирэх', 'Ширээний камер шилжүүлэх'],
    ['Баруун чирэх', 'Ширээний камер эргүүлэх'],
    ['Дугуй / + −', 'Ширээн дээр ойртуулах / холдуулах'],
    [keyLabel(b.cursor[0]), 'Хулганыг чөлөөлөх / буцаах'],
    [keyLabel(b.sprint[0]), 'Гүйх'],
    [keyLabel(b.jump[0]), 'Үсрэх'],
    [keyLabel(b.tools[0]), 'Багажны шургуулга'],
    [keyLabel(b.notes[0]), 'Лабын тэмдэглэл'],
    ['⇕', 'Бюреткийн урсгал (хулганы дугуй)'],
    ['Esc', 'Цэс / түр зогсоох'],
  ];
}

export function ControlsList({ compact = false }: { compact?: boolean }) {
  const b = useSettingsStore((s) => s.bindings);
  const lookMode = useSettingsStore((s) => s.lookMode);
  const rows = controlRows(isTouchDevice(), b, lookMode);
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
  const resumeWalk = () => {
    useGameStore.getState().closePanel();
    requestLock();
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resumeWalk}>
          <motion.div role="dialog" aria-modal="true" aria-labelledby="help-title" className="panel-card w-full max-w-xl p-6" initial={{ y: 16 }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()}>
            <h2 id="help-title" className="font-display text-xl font-bold">
              Удирдлага
            </h2>
            <p className="mb-4 mt-1 text-sm text-slate-500">{isTouchDevice() ? 'Онилох үед гэрэлтсэн зүйлийг товш. Баруун талд чирэх нь харах хөдөлгөөн хэвээр.' : 'Багаж руу ойртоход цагаанаар гэрэлтэнэ. Дараа нь дэлгэцийн доор харагдах товчлуурыг ашиглаарай.'}</p>
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
