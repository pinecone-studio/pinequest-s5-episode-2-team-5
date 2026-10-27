import { investigationById } from '../../../src/lib/textbook-investigations';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { SKILLS, useExperimentStore } from '../store/useExperimentStore';
import { experimentDone, useLabStore } from '../store/useLabStore';
import { useExperimentCatalog } from '../lab/experiments';
import { resumeWalk } from '../controls/useGameKeys';
import { sounds } from '../utils/sounds';
import { SettingsPanel } from './SettingsPanel';
import { ControlsList } from './ControlsHelp';
import { LabMenu } from '../menu/LabMenu';
import { openNaClExperiment } from '../experiments/nacl/bench';
import { repeatBenchExperiment, selectBenchExperiment, useWorkbench } from '../experiments/workbench/session';

type Tab = 'experiments' | 'settings' | 'controls';

/** true = ☰ товчоор шинэ загварын цэс (src/menu) гарна. false болговол хуучин цэс (доорх толгой + 3 таб) буцна. */
export const NEW_LAB_MENU: boolean = true;

function SkillsCard() {
  const skills = useExperimentStore((s) => s.skills);
  const doneCount = SKILLS.filter((s) => skills[s.id]).length;
  return (
    <div className="space-y-4">
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-bold text-slate-700">Өрөө доторх ажлын ширээ</div>
      <h3 className="mt-1 font-display text-lg font-bold">Нээлттэй ажлын ширээ</h3>
      <p className="mt-2 text-sm text-slate-600">Туршилтаа сонгоод ширээнд суу. Tab-аас хэрэгслээ олж бэлдээд, хэмжиж, цутгаж, урвалыг ойроос ажигла.</p>
      <button type="button" className="mt-3 w-full rounded-lg border border-slate-200 bg-white py-3 font-semibold" onClick={openNaClExperiment}>NaCl ширээнд очих →</button>
      <button type="button" className="mt-2 text-xs text-sky-800 underline" onClick={() => selectBenchExperiment('nacl')}>NaCl туршилтыг сонгох</button>
    </section>
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Үндсэн дадал</div>
          <h3 className="font-display text-lg font-bold">Лабораторийн дадал</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {doneCount}/{SKILLS.length}
        </span>
      </div>
      <ol className="mt-2 space-y-1.5">
        {SKILLS.map((s, i) => (
          <li key={s.id} className="flex items-start gap-2 text-sm">
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${skills[s.id] ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{skills[s.id] ? '✓' : i + 1}</span>
            <span className={skills[s.id] ? 'text-slate-400 line-through' : 'text-slate-700'}>{s.label}</span>
          </li>
        ))}
      </ol>
    </div>
    </div>
  );
}

function ExperimentsTab() {
  const experiments = useExperimentCatalog((s) => s.experiments);
  const progress = useLabStore((s) => s.progress);
  const active = useLabStore((s) => s.active);
  const [open, setOpen] = useState<string | null>(active);
  const [search,setSearch]=useState('');
  const [kind,setKind]=useState('all');
  const [grade,setGrade]=useState('all');
  const filtered=experiments.filter((x)=>x.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())&&(grade==='all'||String(investigationById(x.id)?.grade??8)===grade)&&(kind==='all'||(investigationById(x.id)?.mode??'bench')===kind));
  const sessions = useWorkbench((s) => s.sessions);
  const finished = experiments.filter((x) => experimentDone(progress, x.id)).length;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-950">
        <div className="flex items-center justify-between gap-2">
          <b className="text-base">Туршилтаа эхлүүлэх</b>
          <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-indigo-800">{finished}/{experiments.length} дууссан</span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold">
          <span className="rounded-lg bg-white p-2"><b className="block text-base text-indigo-700">1</b>Туршилт сонго</span>
          <span className="rounded-lg bg-white p-2"><b className="block text-base text-indigo-700">2</b>Хэрэгслээ бэлд</span>
          <span className="rounded-lg bg-white p-2"><b className="block text-base text-indigo-700">3</b>Алхмаа хий</span>
        </div>
        <p className="mt-2 text-xs leading-snug">Эхлүүлсний дараа зүүн дээд талын “Бэлтгэлээ хийе” карт дараагийн хэрэгсэл, хаана байгааг нь заана.</p>
      </div>
      <input className="min-h-10 w-full rounded-lg border border-slate-200 p-2 text-sm" aria-label="Туршилт хайх" placeholder="Туршилт хайх…" value={search} onChange={(e)=>setSearch(e.target.value)}/>
      <div className="flex flex-wrap gap-2">{[['all','Бүгд'],['bench','Ширээний туршилт'],['model','Виртуал багаж']].map(([id,label])=><button key={id} className={`min-h-10 rounded-full border px-3 text-xs ${kind===id?'border-sky-500 bg-sky-50':'border-slate-200'}`} aria-pressed={kind===id} onClick={()=>setKind(id)}>{label}</button>)}</div>
      <div className="flex flex-wrap gap-2">{[['all','Бүх анги'],['7','7-р анги'],['8','8-р анги'],['9','9-р анги'],['10','10-р анги']].map(([id,label])=><button key={id} className={`min-h-10 rounded-full border px-3 text-xs ${grade===id?'border-sky-500 bg-sky-50':'border-slate-200'}`} aria-pressed={grade===id} onClick={()=>setGrade(id)}>{label}</button>)}</div>
      <ul className="space-y-2">
        {filtered.map((x) => {
          const done = progress[x.id] ?? [];
          const complete = experimentDone(progress, x.id);
          const expanded = open === x.id;
          return (
            <li key={x.id} className={`overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition ${active === x.id ? 'border-indigo-500 shadow-indigo-100' : 'border-slate-200'}`}>
              <button type="button" className="focus-ring flex w-full items-center gap-3 p-3 text-left" onClick={() => { setOpen(expanded ? null : x.id); sounds.play('ui', .55); }} aria-expanded={expanded}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${complete ? 'bg-emerald-600 text-white' : active === x.id ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'}`}>{complete ? '✓' : `${done.length}/${x.steps.length}`}</span>
                <span className="flex-1">
                  <span className="block font-semibold leading-tight">{x.title}</span>
                  <span className="block text-xs text-slate-600">{investigationById(x.id)?.grade??8}-р анги · {x.level} · {investigationById(x.id)?.mode==='model'?'Виртуал багаж · ':''}{x.steps.length} алхам</span>
                  {active === x.id && <span className="mt-1 inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-900">Одоо сонгосон</span>}
                </span>
                <span className="text-xs text-slate-400">{expanded ? '▲' : '▼'}</span>
              </button>
              {expanded && (
                <div className="space-y-3 border-t border-slate-100 p-3 text-sm">
                  <p className="text-slate-600">{x.goal}</p>
                  <div>
                    <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Хэрэгсэл ба бодис</div>
                    <ul className="space-y-0.5 text-xs text-slate-600">
                      {x.materials.map((m) => (
                        <li key={m}>📍 {m}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-2 text-xs text-amber-900">⚠ {x.safety}</div>
                  <ol className="space-y-1">
                    {x.steps.map((s, i) => (
                      <li key={s.id} className="flex items-start gap-2 text-xs">
                        <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${done.includes(s.id) ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{done.includes(s.id) ? '✓' : i + 1}</span>
                        <span>
                          <span className={done.includes(s.id) ? 'text-slate-400 line-through' : 'font-medium text-slate-700'}>{s.text}</span>
                          <span className="block text-slate-500">{s.hint}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                  {complete && <div className="rounded-xl bg-sky-50 p-2 text-xs text-sky-900">🔬 {x.explain}</div>}
                  <button
                    type="button"
                    className="btn-yellow w-full py-3 text-sm font-extrabold"
                    onClick={() => {
                      selectBenchExperiment(x.id, !sessions[x.id]);
                      sounds.play('success', 0.5);
                      resumeWalk();
                      const next = x.steps.find((s) => !done.includes(s.id));
                      if (next) useGameStore.getState().say(`«${x.title}» эхэллээ. Зүүн дээд талын “Бэлтгэлээ хийе” картыг дагаарай. Тэнд дараагийн хэрэгсэл болон байршил нь гарна.`, 'wave');
                    }}
                  >
                    {sessions[x.id] ? '▶ Туршилтаа үргэлжлүүлэх' : '▶ Энэ туршилтыг эхлүүлэх'}
                  </button>
                  {(sessions[x.id] || complete) && <button className="min-h-9 w-full rounded-lg border border-slate-300 bg-white py-2 text-sm font-semibold" onClick={() => { repeatBenchExperiment(x.id); resumeWalk(); }}>↻ Дахин хийх</button>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <SkillsCard />
      <button type="button" className="btn-ghost w-full text-xs" onClick={() => useLabStore.getState().resetProgress()}>
        Туршилтын явцыг арилгах
      </button>
    </div>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'experiments', label: 'Туршилт' },
  { id: 'settings', label: 'Тохиргоо' },
  { id: 'controls', label: 'Удирдлага' },
];

/** Left slide-in menu: Resume, Experiments, Settings, Controls help. */
export function MenuPanel() {
  const open = useGameStore((s) => s.panel === 'menu');
  const [tab, setTab] = useState<Tab>('experiments');
  // Шинэ дэлгэц бэлэн болоогүй хэсгийн товч дарахад хуучин цэсийг түр нээнэ (самбар хаагдахад буцаж шинэ болно)
  const [legacy, setLegacy] = useState(false);
  return (
    <AnimatePresence onExitComplete={() => setLegacy(false)}>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-slate-900/25" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resumeWalk} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Үндсэн цэс"
            className="fixed bottom-0 left-0 top-0 z-50 flex w-[min(420px,100vw)] flex-col bg-slate-50 shadow-2xl"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          >
            {NEW_LAB_MENU && !legacy ? (
              <LabMenu
                onClose={resumeWalk}
                onLegacy={(next) => {
                  setTab(next);
                  setLegacy(true);
                }}
              />
            ) : (
              <>
                <header className="flex items-center gap-3 bg-lab-yellow px-5 py-4 text-white">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 font-display text-lg font-bold">OL</div>
                  <div className="flex-1">
                    <div className="font-display text-lg font-bold leading-tight">OpenLab 3D</div>
                    <div className="text-xs text-white/85">Виртуал химийн лаборатори</div>
                  </div>
                  <button type="button" aria-label="Цэсийг хаах" onClick={resumeWalk} className="focus-ring rounded-full p-2 hover:bg-white/20">
                    ✕
                  </button>
                </header>
                <div className="px-5 pt-4">
                  <button type="button" className="btn-yellow w-full py-3 text-base" onClick={resumeWalk}>
                    ▶ Үргэлжлүүлэх
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
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
