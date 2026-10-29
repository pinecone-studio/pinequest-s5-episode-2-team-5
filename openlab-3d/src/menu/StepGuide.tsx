/**
 * «Туршилтын заавар»: бэлтгэл дууссаны дараа баруун доод буланд гарах алхам алхмын заавар.
 * Алхмууд нэг нэгээр нээгдэнэ: одоогийн алхам дээрх «Хийсэн ✓»-г дарахад тэр алхам тэмдэглэгдэж, дараагийнх нь гарч ирнэ.
 * Сурах бичгийн алхам чөлөөт бичвэр тул лаб өөрөө шалгаж чадахгүй — сурагч өөрөө тэмдэглэнэ.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { isTouchDevice } from '../utils/device';
import { sounds } from '../utils/sounds';
import { useLaunchedProcedure } from './launchedProcedure';
import { useDemoShown } from '../experiments/workbench/guidance/DemoProgress';
import type { ProcedureGroup } from './labProcedure';

export function StepGuide({ id, title, groups }: { id: string; title: string; groups: ProcedureGroup[] }) {
  // Нэгээс олон бүлэг бол (апп дахь ▶ холбоосоор орсон) бүлэг бүрийн эхний алхмын дээр нэрийг нь харуулна
  const steps = groups.flatMap((group, g) => group.steps.map((text, i) => ({ key: `${g}-${i}`, text, heading: groups.length > 1 && i === 0 ? group.title : '' })));
  const key = `${id}:${title}`;
  const stored = useLaunchedProcedure((s) => (s.stepsKey === key ? s.stepsDone : 0));
  const setStepsDone = useLaunchedProcedure((s) => s.setStepsDone);
  const touch = isTouchDevice();
  const bench = useGameStore((s) => s.mode === 'bench');
  const [collapsed, setCollapsed] = useState(false);
  // 3D үзүүлбэр явж байх үед өөрийн алхмын мөртэй тул энэ карт хураагдаж, багажийг халхлахгүй (дарж нээж болно)
  const demo = useDemoShown();
  useEffect(() => { if (demo) setCollapsed(true); }, [demo]);
  const calm = useReducedMotion() ?? false;
  const current = useRef<HTMLLIElement>(null);
  const done = Math.min(stored, steps.length);
  // Шинэ алхам нээгдэхэд жагсаалтыг тэр алхам руу гүйлгэнэ
  useEffect(() => {
    current.current?.scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' });
  }, [done, collapsed, calm]);
  if (!steps.length) return null;
  const finished = done === steps.length;
  const left = steps.length - done - 1;
  const mark = (next: number) => {
    setStepsDone(key, next);
    sounds.play(next === steps.length ? 'success' : 'ui', 0.5);
  };
  // Утас: бэлтгэлийн карттай ижил доод эгнээ (зүүн талын Star, чатнаас зай авна), баруун талын үйлдлийн товчнуудаас доогуур багтахаар авсаархан.
  // Ширээнд суусан үед Star нуугдана; ширээний камерын товчнууд нарийн дэлгэцэд доод эгнээг, өргөнд баруун доод буланг эзэлдэг тул тэднээс зайлсхийнэ.
  const box = touch
    ? `pointer-events-auto fixed z-30 rounded-xl bg-white/95 p-2 text-lab-ink shadow-hud ${bench ? 'bottom-[112px] left-2 right-2 sm:bottom-2 sm:right-[290px]' : 'bottom-2 left-[192px] right-2'}`
    : 'pointer-events-auto fixed bottom-4 right-4 z-30 w-[min(340px,calc(100vw-32px))] rounded-xl bg-white/95 p-3 text-lab-ink shadow-hud';
  return (
    <section className={box} aria-label="Туршилтын заавар">
      <button type="button" className="focus-ring flex w-full items-center justify-between gap-2 text-left" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed}>
        <span className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">Туршилтын заавар · {done}/{steps.length}</span>
          <b className="block truncate text-xs">{title}</b>
        </span>
        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-900">{collapsed ? 'Нээх +' : 'Хураах −'}</span>
      </button>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden>
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      {/* Утас: зөвхөн одоогийн алхам + «Хийсэн ✓» нэг мөрөнд (хийсэн алхмуудыг дээрх тоо, зураас харуулна) */}
      {!collapsed && touch && (
        <div className="mt-1.5" aria-live="polite">
          {finished ? (
            <div className="flex items-center justify-between gap-2" role="status">
              <b className="text-xs text-emerald-900">🎉 Бүх алхам дууслаа!</b>
              <button type="button" className="focus-ring min-h-9 rounded-lg px-2 text-[11px] font-semibold text-emerald-800 underline" onClick={() => mark(0)}>Дахин эхлэх</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-emerald-800 ring-2 ring-emerald-400">{done + 1}</span>
              <span className="line-clamp-2 min-w-0 flex-1 text-xs font-semibold leading-snug">{steps[done].text}</span>
              {done > 0 && <button type="button" aria-label="Өмнөх алхам руу буцах" className="focus-ring min-h-9 shrink-0 rounded-lg px-2 text-sm font-bold text-slate-500" onClick={() => mark(done - 1)}>←</button>}
              <button type="button" className="focus-ring min-h-9 shrink-0 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white" onClick={() => mark(done + 1)}>Хийсэн ✓</button>
            </div>
          )}
        </div>
      )}
      {!collapsed && !touch && (
        <>
          <ol className="mt-2 max-h-[40dvh] space-y-1.5 overflow-y-auto overscroll-contain pr-1" aria-live="polite">
            {steps.slice(0, done + 1).map((step, i) => {
              const ok = i < done;
              return (
                <motion.li key={step.key} ref={i === done ? current : undefined} initial={calm ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                  {step.heading && <p className="mb-1 text-[11px] font-bold leading-tight text-slate-800">{step.heading}</p>}
                  <div className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs leading-snug ${ok ? 'text-slate-500' : 'border-2 border-emerald-400 bg-emerald-50 font-semibold text-slate-900'}`}>
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${ok ? 'bg-emerald-500 text-white' : 'bg-white text-emerald-800 ring-2 ring-emerald-400'}`}>{ok ? '✓' : i + 1}</span>
                    <span className="flex-1">{step.text}</span>
                  </div>
                  {!ok && (
                    <button type="button" className="focus-ring mt-1.5 min-h-9 w-full rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700" onClick={() => mark(done + 1)}>
                      {left > 0 ? 'Хийсэн ✓ · Дараагийн алхам' : 'Хийсэн ✓ · Дуусгах'}
                    </button>
                  )}
                </motion.li>
              );
            })}
          </ol>
          {finished ? (
            <div className="mt-2 rounded-lg bg-emerald-50 p-2 text-center" role="status">
              <p className="text-sm font-bold text-emerald-900">🎉 Бүх алхам дууслаа!</p>
              <button type="button" className="focus-ring mt-1 rounded px-1 text-[11px] font-semibold text-emerald-800 underline" onClick={() => mark(0)}>Дахин эхлэх</button>
            </div>
          ) : (
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
              <span>{left > 0 ? `Дараа нь ${left} алхам` : 'Сүүлийн алхам'}</span>
              {done > 0 && <button type="button" className="focus-ring rounded px-1 font-semibold text-slate-600 hover:text-slate-900" onClick={() => mark(done - 1)}>← Буцаах</button>}
            </div>
          )}
        </>
      )}
    </section>
  );
}
