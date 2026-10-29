/**
 * Lab-specific HUD pieces: the pour/measure gauge above the prompt, the throw wind-up
 * bar, the safety-gear badges (with a faint goggles frame on screen while they are
 * worn) and the card of the active experiment with its next step.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useActionHud } from '../interaction/actions';
import { throwCharge } from '../interaction/heldApi';
import { useChemStore } from '../store/useChemStore';
import { useGameStore } from '../store/useGameStore';
import { useLabStore } from '../store/useLabStore';
import { useExperimentCatalog } from '../lab/experiments';
import { spawnNearPlayer } from '../interaction/spawn';
import { currentSession, useWorkbench } from '../experiments/workbench/session';
import { PreparationChecklist } from '../experiments/workbench/PreparationHints';
import { sounds } from '../utils/sounds';
import { isTouchDevice } from '../utils/device';
import { mobileizeControlHint } from '../controls/mobileInteraction';
import { ProcedureBlock, ProcedureList } from '../menu/ProcedureBlock';
import { TextbookPreparation } from '../menu/TextbookPreparation';
import { SHOW_LAB_STEPS_IN_CARD, cardTitle, groupsToShow, unlinkedCard, useLaunchedProcedure } from '../menu/launchedProcedure';
import { procedureGroupsForLab } from '../menu/labProcedureData';

export function ActionGauge() {
  const { label, detail, visible } = useActionHud();
  return (
    // Утсан дээр бэлтгэлийн карт доод хэсгийг эзэлдэг тул заагчийг дээш байрлуулна.
    <div className={`pointer-events-none fixed inset-x-0 bottom-40 z-20 flex justify-center ${isTouchDevice() ? '' : 'sm:bottom-24'}`}>
      <AnimatePresence>
        {visible && (
          <motion.div className="rounded-2xl bg-sky-900/75 px-4 py-2 text-center text-white shadow-hud backdrop-blur" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="font-display text-base font-semibold tabular-nums">{label}</div>
            {detail && <div className="text-xs text-white/80 tabular-nums">{detail}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ThrowMeter() {
  const [power, setPower] = useState<number | null>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const since = throwCharge.since;
      setPower(since === null ? null : Math.min(1, (performance.now() - since) / 900));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  if (power === null) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-[58%] z-20 w-40 -translate-x-1/2">
      <div className="mb-1 text-center text-xs font-semibold text-white drop-shadow">Шидэх хүч</div>
      <div className="h-2 overflow-hidden rounded-full bg-black/40">
        <div className="h-full rounded-full bg-gradient-to-r from-lab-yellow to-red-500" style={{ width: `${Math.round(power * 100)}%` }} />
      </div>
    </div>
  );
}

export function SafetyBadges() {
  const worn = useChemStore((s) => s.worn);
  const take = (what: 'goggles' | 'gloves') => {
    useChemStore.getState().setWorn(what, false);
    spawnNearPlayer(what);
    sounds.play('pickup');
  };
  return (
    <>
      {worn.goggles && (
        <div
          className="pointer-events-none fixed inset-0 z-[5]"
          style={{ boxShadow: 'inset 0 0 0 10px rgba(80,90,105,0.35), inset 0 0 90px 30px rgba(140,200,255,0.12)', borderRadius: '42px' }}
          aria-hidden
        />
      )}
      <div className="pointer-events-auto fixed right-4 top-[68px] z-30 flex flex-col items-end gap-1.5">
        {(['goggles', 'gloves'] as const).map((what) => (
          <button
            key={what}
            type="button"
            onClick={() => worn[what] && take(what)}
            title={worn[what] ? 'Дарж тайлах' : isTouchDevice() ? 'Ширээн дээрх эсвэл «Хамгаалалт» шургуулганаас аваад товшиж зүү' : 'Ширээн дээрх эсвэл «Хамгаалалт» шургуулганаас аваад E дарж зүү'}
            className={`focus-ring flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-hud backdrop-blur ${worn[what] ? 'bg-emerald-500/90 text-white' : 'bg-black/45 text-white/80'}`}
          >
            <span>{what === 'goggles' ? '🥽' : '🧤'}</span>
            {what === 'goggles' ? (worn.goggles ? 'Нүдний шил зүүсэн' : 'Нүдний шилгүй') : worn.gloves ? 'Бээлий өмссөн' : 'Бээлийгүй'}
          </button>
        ))}
      </div>
    </>
  );
}

/** The active experiment, its next step and progress (top left, under the menu button). */
export function ExperimentCard() {
  const experiments = useExperimentCatalog((s) => s.experiments);
  const active = useLabStore((s) => s.active);
  const progress = useLabStore((s) => s.progress);
  useWorkbench((s) => s.sessions);
  const launched = useLaunchedProcedure();
  const [collapsed, setCollapsed] = useState(false);
  // Утсан дээр «Туршилтын бэлтгэл» доод эгнээнд, анх хураасан байдалтай гарна.
  const touch = isTouchDevice();
  const [prepCollapsed, setPrepCollapsed] = useState(touch);
  const x = active ? experiments.find((experiment) => experiment.id === active) : undefined;
  // «Туршилтын бэлтгэл» самбар: туршилтын нэр + «Бэлтгэлээ хийе» хэсэг. Бүх туршилтад ижил хүрээтэй гарна.
  const prepCard = (title: string, body: ReactNode) => {
    const closed = touch ? prepCollapsed : collapsed;
    const toggle = () => (touch ? setPrepCollapsed((c) => !c) : setCollapsed((c) => !c));
    // Утас: зүүн талын Pip робот, чатнаас зай аваад бэлтгэлийн картыг дэлгэцийн баруун зах хүртэл сунгана.
    const box = touch
      ? 'pointer-events-auto fixed bottom-2 left-[192px] right-2 z-30 rounded-xl bg-white/95 p-2 text-lab-ink shadow-hud'
      : 'pointer-events-auto fixed left-3 top-[68px] z-30 w-[min(320px,calc(100vw-24px))] rounded-xl bg-white/95 p-3 text-lab-ink shadow-hud sm:left-4 sm:top-[76px] sm:w-[min(320px,calc(100vw-80px))]';
    return <div className={box}>
      <button type="button" className="focus-ring flex w-full items-center justify-between gap-2 text-left" onClick={toggle} aria-expanded={!closed}>
        <span><span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700">Туршилтын бэлтгэл</span><b className="block text-xs">{title}</b></span>
        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900">{closed ? 'Нээх +' : 'Хураах −'}</span>
      </button>
      {!closed && <div className={`mt-2 overflow-y-auto overscroll-contain ${touch ? 'max-h-[45dvh]' : 'max-h-[40dvh]'}`}>{body}</div>}
    </div>;
  };
  if (!x) {
    // Лабын заавартай холбоогүй туршилтыг цэснээс сонгосон бол эхлээд бэлтгэл, дараа нь нэр, алхмыг нь "Туршилт" картаар харуулна
    if (launched.labId === null && launched.prep) return prepCard(launched.title, <TextbookPreparation />);
    const picked = unlinkedCard(launched);
    if (!picked) return null;
    return (
      <div className="pointer-events-auto fixed left-4 top-[76px] z-30 w-[min(300px,calc(100vw-120px))] ">
        <div className="rounded-2xl bg-white/90 p-3 text-lab-ink shadow-hud backdrop-blur">
          <button type="button" className="focus-ring flex w-full items-center justify-between gap-2 text-left" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed}>
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600">Туршилт</span>
              <span className="block font-display text-sm font-bold leading-tight">{picked.title}</span>
            </span>
            <span className="text-xs text-slate-400">{collapsed ? '▼' : '▲'}</span>
          </button>
          {!collapsed && <ProcedureList groups={[picked]} />}
        </div>
      </div>
    );
  }
  const heading = cardTitle(x.id, launched, x.title);
  const done = progress[x.id] ?? [];
  const next = x.steps.find((s) => !done.includes(s.id));
  if (!currentSession()?.ready) return prepCard(heading, <PreparationChecklist />);
  // Лаб ширээн дээрх хэрэгслийг хянадаггүй туршилт: сурах бичгийн бодис, хэрэгслийн жагсаалтаар бэлтгэнэ
  if (launched.labId === x.id && launched.prep) return prepCard(heading, <TextbookPreparation />);
  // Сурах бичгийн "Хэрхэн хийх" алхамтай бол картыг цэвэр «Туршилт» болгоно (лабын ерөнхий 3 алхам, 0/3, зөвлөгөөг нууна)
  const groups = groupsToShow(x.id, launched, procedureGroupsForLab(x.id));
  const clean = !SHOW_LAB_STEPS_IN_CARD && groups.length > 0;
  return (
    <div className="pointer-events-auto fixed left-4 top-[76px] z-30 w-[min(300px,calc(100vw-120px))] ">
      <div className="rounded-2xl bg-white/90 p-3 text-lab-ink shadow-hud backdrop-blur">
        <button type="button" className="focus-ring flex w-full items-center justify-between gap-2 text-left" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed}>
          <span>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600">{clean ? 'Туршилт' : <>Туршилт · {done.length}/{x.steps.length}</>}</span>
            <span className="block font-display text-sm font-bold leading-tight">{heading}</span>
          </span>
          <span className="text-xs text-slate-400">{collapsed ? '▼' : '▲'}</span>
        </button>
        {!collapsed && (clean ? <ProcedureList groups={groups} /> : (
          <>
            <ol className="mt-2 space-y-1">
              {x.steps.map((s, i) => {
                const ok = done.includes(s.id);
                const isNext = s === next;
                return (
                  <li key={s.id} className={`flex items-start gap-2 text-xs ${ok ? 'text-slate-400 line-through' : isNext ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${ok ? 'bg-green-500 text-white' : isNext ? 'bg-slate-200 text-slate-900' : 'bg-slate-200 text-slate-500'}`}>{ok ? '✓' : i + 1}</span>
                    {s.text}
                  </li>
                );
              })}
            </ol>
            {next && (
              <button
                type="button"
                className="focus-ring mt-2 w-full rounded-lg bg-white px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-slate-100"
                onClick={() => useGameStore.getState().say(next.hint, 'think')}
              >
                💡 Зөвлөгөө: {isTouchDevice() ? mobileizeControlHint(next.hint) : next.hint}
              </button>
            )}
            <ProcedureBlock labId={x.id} />
          </>
        ))}
      </div>
    </div>
  );
}
