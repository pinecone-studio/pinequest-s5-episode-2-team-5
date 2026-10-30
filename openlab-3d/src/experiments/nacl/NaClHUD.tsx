import {guidedPlan} from '../workbench/guidance/plans';
import { KI_DOSE_ML } from '../../lab/quantity-guidance';
import { MeasurementGuide } from '../workbench/MeasurementGuide';
import { StarInstructions } from '../../ui/StarGuidance';
/** One room, one set of equipment. Guidance never locks an object or a step. */
import { useEffect, useRef } from 'react';
import { bench, enterBench, exitBench } from './bench';
import { drawScopeImage } from './engine';
import { NAMES, LABEL_KEYS } from './data';
import { contentsLabel, describe, labSpace, labUse, mixture, partId, partKey, useSandbox } from './sandbox';
import { useGuideCue } from '../workbench/guidance/runtime';
import { gasMl, liquidMl, solidMassG } from '../../chemistry/mixture';
import { Grade9Controls } from '../grade9/Controls';
import { requestLock } from '../../controls/usePointerLock';
import { interactables } from '../../interaction/registry';
import { tablePointer } from '../../interaction/heldApi';
import { beginHeldUse, endHeldUse } from '../../interaction/useHeld';
import { transfer } from '../../interaction/actions';
import { dropHeld } from '../../controls/useGameKeys';
import { useChemStore, mixtureOf } from '../../store/useChemStore';
import { useGameStore } from '../../store/useGameStore';
import { usePortableStore } from '../../interaction/portable';
import { useInventoryStore } from '../../store/useInventoryStore';
import { benchUseTarget } from '../../interaction/benchUseTarget';
import { interactItem } from '../../interaction/interactItem';
import { benchView, useBenchView } from './view';
import { experimentGuide } from './guidance';
import { promptKey } from '../../controls/keyMap';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useLabStore } from '../../store/useLabStore';
import { useExperimentCatalog } from '../../lab/experiments';
import { currentSession, jumpToStep, useWorkbench } from '../workbench/session';
import { isTouchDevice } from '../../utils/device';
import { PreparationChecklist } from '../workbench/PreparationHints';
import { EquipmentTourCaption } from '../workbench/guidance/equipment-tour';
import { mobileizeControlHint } from '../../controls/mobileInteraction';
import { TextbookPreparation } from '../../menu/TextbookPreparation';
import { SHOW_LAB_STEPS_IN_CARD, benchGroups, benchTitle, useLaunchedProcedure } from '../../menu/launchedProcedure';
import { procedureGroupsForLab } from '../../menu/labProcedureData';

function readItem(id: string) {
  mixture(id);
  useSandbox.setState({ inspected: id });
  useBenchView.setState({ selected: id, level: 'detail' });
  if (useGameStore.getState().mode === 'walk') enterBench(id);
}

function WorldLabels() {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      bench.engine?.labelSpots(window.innerWidth, window.innerHeight).forEach((spot, i) => {
        const el = refs.current[i]; if (!el) return;
        const id = partId(spot.key);
        const game = useGameStore.getState();
        const view = useBenchView.getState();
        const selected = game.mode === 'bench' ? view.selected === id || useSandbox.getState().hovered === id : game.focus?.id === id;
        // Seated labels describe the pointed item without intercepting clicks on nearby glassware.
        el.style.pointerEvents = game.mode === 'bench' ? 'none' : 'auto';
        el.style.display = spot.visible && selected && usePortableStore.getState().held?.id !== id ? 'block' : 'none';
        el.style.transform = `translate(${spot.x}px,${spot.y}px) translate(-50%,-100%)`;
        const m = mixture(id);
        el.textContent = `${NAMES[spot.key]} · ${contentsLabel(m)}${m.ml > 0 ? ` · ${m.ml.toFixed(1)} см³` : ''}`;
      });
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
    {LABEL_KEYS.map((key, i) => <button key={key} ref={(el) => { refs.current[i] = el; }}
      className="pointer-events-auto absolute left-0 top-0 max-w-[180px] rounded-md bg-white/90 px-2 py-1 text-[10px] text-lab-ink shadow"
      onClick={() => { if (usePortableStore.getState().held || useInventoryStore.getState().held) { useSandbox.setState({ inspected: partId(key), hovered: partId(key) }); useBenchView.setState({ selected: partId(key) }); } else { readItem(partId(key)); if (useGameStore.getState().mode === 'bench') interactItem(partId(key)); } }} />)}
  </div>;
}

function Microscope() {
  const open = useSandbox((s) => s.scope);
  const focus = useSandbox((s) => s.focus);
  const ref = useRef<HTMLCanvasElement>(null);
  const hasSample = useSandbox((s) => (s.contents[partId('slide')]?.salt ?? 0) > 0.001) && labSpace.distance(partId('slide'), partId('scope')) < 0.2;
  useEffect(() => { if (open && ref.current && hasSample) drawScopeImage(ref.current); }, [open, hasSample]);
  if (!open) return null;
  return <section className="fixed left-1/2 top-1/2 z-40 w-[min(360px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-4 text-lab-ink shadow-hud">
    <div className="flex justify-between"><b>Микроскоп</b><button onClick={() => useSandbox.setState({ scope: false })} aria-label="Микроскопыг хаах">✕</button></div>
    {hasSample ? <canvas ref={ref} width={520} height={520} className="my-4 w-full rounded-full" style={{ filter: `blur(${Math.abs(focus - 64) * 0.25}px)` }} /> : <p className="my-10 text-center text-sm text-slate-500">Тавцан хоосон. Талстаас шилэн хавтас руу дээж шилжүүлж тавиарай.</p>}
    <label className="block text-xs">Фокус<input type="range" min={0} max={100} value={focus} className="mt-2 w-full" onChange={(e) => useSandbox.setState({ focus: +e.target.value })} /></label>
  </section>;
}

/**
 * What the selected item can do: pour or dose into it, use it, pick it up, turn it, and the
 * controls that run Grade 7–10 apparatus (Grade9Controls). Only controls, no description: without
 * this card those experiments cannot be started or finished.
 */
function BenchControls() {
  const id = useSandbox((s) => s.inspected);
  const demoPlaying = useGuideCue((s) => !!s.target);
  useChemStore((s) => id ? s.mixtures[id] : undefined);
  const portable = usePortableStore((s) => s.held);
  const normal = useInventoryStore((s) => s.held);
  const mode = useGameStore((s) => s.mode);
  const inspecting = useBenchView((s) => s.inspecting);
  if (!id || demoPlaying) return null;
  const heldId = portable?.id ?? normal?.id;
  const item = describe(id); const m = mixture(id); const key = partKey(id);
  const close = () => {
    if (inspecting) { benchView.back(); return; }
    useSandbox.setState({ inspected: null }); useBenchView.setState({ selected: null });
    if (mode === 'walk') requestLock();
  };
  const tool = heldId ? describe(heldId) : null;
  const heldContents = heldId ? mixtureOf(heldId, normal?.variant) : undefined;
  const doseGas = !!heldContents && gasMl(heldContents) > 0 && liquidMl(heldContents) < .005;
  const doseUnit = doseGas ? 'мл хий' : heldContents && liquidMl(heldContents) <= .005 && solidMassG(heldContents) > 0 ? 'г' : 'см³';
  const doseVerb = doseGas ? 'дамжуулах' : doseUnit === 'г' ? 'хийх' : 'цутгах';
  const fittingPaper = !!tool && ['paper', 'stack'].includes(tool.role) && key === 'funnel';
  const canPour = !!tool && !['paper', 'stack'].includes(tool.role) && tool.capacity > 0 && item.capacity > 0 && heldId !== id;
  const action = () => { if (heldId !== id) beginHeldUse(id); };
  const dose = (ml: number) => {
    if (key || portable) { labUse.dose(id, ml); return; }
    const to = interactables.get(id)?.useTarget;
    if (normal && to?.type === 'item') transfer(normal, to, ml);
  };
  const entry = interactables.get(id);
  return <section className="fixed inset-x-4 bottom-28 z-40 max-h-[24vh] overflow-auto rounded-2xl bg-white/95 p-3 text-sm text-lab-ink shadow-hud sm:inset-x-auto sm:right-4 sm:top-32 sm:bottom-auto sm:max-h-[53vh] sm:w-[270px] sm:p-4" aria-label="Багажийн удирдлага">
    <div className="flex justify-between gap-2"><h2 className="font-bold">{item.label}</h2><button aria-label="Удирдлагыг хаах" onClick={close}>✕</button></div>
    {heldId && heldId !== id && <div className="mt-2">
      <p className="mb-2 text-[11px] text-slate-600">{tool?.label} → {item.label}</p>
      <button className="touch-none rounded-lg bg-slate-200 px-3 py-2 text-xs font-bold" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); action(); }} onPointerUp={endHeldUse} onPointerCancel={endHeldUse} onBlur={endHeldUse}
        onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); action(); } }} onKeyUp={endHeldUse}>Дарж барьж {fittingPaper ? 'цаасыг суулгах' : canPour ? 'цутгах' : 'ашиглах'}</button>
      {canPour && <div className="mt-2 flex flex-wrap gap-2">{[.1, 1, 5].map((ml) => <button key={ml} className="rounded-lg bg-sky-100 px-3 py-2 text-xs font-bold" onClick={() => dose(ml)}>{ml} {doseUnit} {doseVerb}</button>)}</div>}
    </div>}
    <div className="mt-2 flex flex-wrap gap-2">
      {((entry?.onGrab && entry.onGrab !== entry.onInteract) || key === 'lamp' || key === 'scope') && <button className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold" onClick={() => { if (key) labUse.start(id); else entry?.onInteract?.(); }}>Ашиглах</button>}
      <button className="rounded-lg bg-sky-100 px-3 py-2 text-xs font-semibold text-sky-900" onClick={() => mode === 'walk' ? readItem(id) : inspecting ? benchView.back() : benchView.inspect(id)}>{inspecting ? 'Esc · Ширээнд буцах' : 'F · Барьж шинжлэх'}</button>
      {!heldId && !inspecting && <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" onClick={() => { interactItem(id, true); }}>Авах / зөөх</button>}
      {heldId === id && <button className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-semibold" onClick={() => { tablePointer.angle += Math.PI / 4; }}>Эргүүлэх 45°</button>}
      {heldId === id && isTouchDevice() && <button className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-semibold" onClick={dropHeld}>Тавих</button>}
    </div>
    <Grade9Controls id={id} />
    {item.capacity > 0 && <div className="mt-2 rounded-xl bg-sky-50 px-3 py-2"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Одоогийн эзэлхүүн</span><output className="font-mono text-2xl font-bold tabular-nums text-sky-900" aria-label="Одоогийн эзэлхүүн">{m.ml.toFixed(1)} <small className="text-sm">см³</small></output>{key === 'cyl' && <div className="text-xs text-sky-800">Зорилго: 50.0 см³ · Менискийн доод ирмэгийг урдаас унш.</div>}</div>}
  </section>;
}

function panButtons() {
  return <><button aria-label="Камерыг зүүн тийш" className="rounded bg-slate-100 px-2 py-1 sm:px-3" onClick={() => benchView.pan(-1, 0)}>←</button><button aria-label="Камерыг урагш" className="rounded bg-slate-100 px-2 py-1 sm:px-3" onClick={() => benchView.pan(0, 1)}>↑</button><button aria-label="Камерыг хойш" className="rounded bg-slate-100 px-2 py-1 sm:px-3" onClick={() => benchView.pan(0, -1)}>↓</button><button aria-label="Камерыг баруун тийш" className="rounded bg-slate-100 px-2 py-1 sm:px-3" onClick={() => benchView.pan(1, 0)}>→</button></>;
}

function CameraControls() {
  const view = useBenchView();
  return <section className="fixed inset-x-4 bottom-3 z-30 rounded-2xl bg-white/95 p-2 text-lab-ink shadow-hud sm:inset-x-auto sm:bottom-20 sm:right-4 sm:w-[270px] sm:p-3" aria-label="Ширээний камер">
    <div className="mb-2 hidden items-center justify-between text-xs font-bold sm:flex"><span>Ойртуулах / холдуулах</span><span className="font-mono text-[10px] text-slate-500">{Math.round(view.distance * 100)} см</span></div>
    <div className="flex items-center gap-2"><button className="rounded-lg bg-slate-100 px-3 py-2 text-lg font-bold" aria-label="Холдуулах" onClick={() => benchView.zoom(1.3)}>−</button><input aria-label="Камерын зай" type="range" min={0} max={100} value={(Math.log(Math.max(.018, view.distance)) - Math.log(.018)) / (Math.log(3.5) - Math.log(.018)) * 100} className="min-w-0 flex-1 accent-sky-600" onChange={(e) => benchView.setDistance(Math.exp(Math.log(.018) + +e.target.value / 100 * (Math.log(3.5) - Math.log(.018))))} /><button className="rounded-lg bg-slate-100 px-3 py-2 text-lg font-bold" aria-label="Ойртуулах" onClick={() => benchView.zoom(1 / 1.3)}>+</button></div>
    <div className="mt-1 flex gap-1 sm:mt-2 sm:flex-wrap"><button className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold sm:py-2 sm:text-[11px]" onClick={benchView.table}>Ажлын харагдац</button><button className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold sm:py-2 sm:text-[11px]" onClick={benchView.overview}>Бүтэн ширээ</button><div className="ml-auto flex items-center justify-center gap-1 sm:hidden">{panButtons()}</div></div>
    <div className="mt-2 hidden items-center justify-center gap-1 sm:flex">{panButtons()}</div>
  </section>;
}

export function NaClHUD() {
  const mode = useGameStore((s) => s.mode);
  const active = useLabStore((s) => s.active);
  const progress = useLabStore((s) => s.progress);
  const catalog = useExperimentCatalog((s) => s.experiments);
  const workbench = useWorkbench();
  const session = currentSession();
  const view = useBenchView();
  const toast = useGameStore((s) => s.toast);
  useEffect(() => {
    if (mode === 'bench' && toast && Date.now() - toast.id < 1500) useSandbox.setState({ warning: [toast.title, toast.subtitle].filter(Boolean).join(' · ') });
  }, [mode, toast]);
  const state = useSandbox();
  const portable = usePortableStore((s) => s.held);
  const normal = useInventoryStore((s) => s.held);
  const settings = useSettingsStore();
  const held = portable?.label ?? (normal ? describe(normal.id).label : null);
  const closeup = mode === 'bench';
  const cohesiveGuide=!!active&&!!guidedPlan(active);
  const lesson = catalog.find((x) => x.id === active);
  const preparing = !!lesson && !session?.ready;
  // Ширээнд суухад ExperimentCard нуугддаг тул цэснээс сонгосон туршилтын нэр, "Хэрхэн хийх" алхмыг энд харуулна
  const launched = useLaunchedProcedure();
  const topic = benchTitle(active, launched, lesson?.title);
  const groups = benchGroups(active, launched, active ? procedureGroupsForLab(active) : []);
  const clean = !SHOW_LAB_STEPS_IN_CARD && groups.length > 0;
  // Лаб ширээн дээрх хэрэгслийг хянадаггүй (эсвэл лабын заавартай холбоогүй) туршилт: сурах бичгийн бодис, хэрэгслийн жагсаалтаар бэлтгэнэ
  const textbookPrep = !!launched.prep && launched.labId === active;
  const done = active ? progress[active] ?? [] : [];
  const nextStep = lesson?.steps.findIndex((s) => !done.includes(s.id)) ?? 0;
  const autoStep = nextStep < 0 ? lesson?.steps.length ?? 0 : nextStep;
  const selectedStep = isTouchDevice() ? autoStep : (session?.stepOverride ?? autoStep);
  const guide = experimentGuide(isTouchDevice() ? undefined : session?.stepOverride ?? undefined);
  const q = promptKey('drop', settings.bindings, settings.lookMode);
  const receiver = benchUseTarget();
  const receiverLabel = receiver ? describe(receiver).label : null;
  const r = promptKey('pour', settings.bindings, settings.lookMode);
  return <>
    {closeup && !workbench.drawer && <EquipmentTourCaption />}
    {closeup && held && !view.inspecting && !workbench.drawer && <StarInstructions priority="action"><div className={`rounded-xl border-2 px-3 py-2 text-xs ${receiver ? 'border-sky-400 bg-sky-50 text-sky-950' : 'border-emerald-400 bg-emerald-50 text-emerald-950'}`} role="status" aria-label="Барьж буй багажийн үйлдэл">
      <b className="block">{receiver ? `↓ Цутгах / ашиглах сав: ${receiverLabel}` : '▣ Тавих: хоосон гадаргуу руу чиглүүл'}</b>
      <p className="mt-1">{receiver ? `${held} → ${receiverLabel} · ${r} дарж барьж ашиглана. Дарах нь зөвхөн савыг сонгоно.` : `Барьж буй: ${held} · Ногоон дүрс дээр дарж эсвэл ${q} дарж тавина.`}</p>
      {!receiver && <p className="mt-1">Цутгахдаа өөр сав руу чиглүүл. Цэнхэр тэмдэг гармагц {r} дарж барь.</p>}
    </div></StarInstructions>}
    {active === 'nacl' && (state.near || closeup) && !workbench.drawer && <WorldLabels />}
    {closeup && !workbench.drawer && <div className="fixed left-3 top-3 z-30 flex max-w-[calc(100vw-3rem)] flex-wrap gap-2 text-xs text-lab-ink">
      <button className="rounded-full bg-white/95 px-3 py-2 shadow" onClick={exitBench}>Ширээнээс гарах</button>
      {isTouchDevice() && view.inspecting && <button className="rounded-full bg-white/95 px-3 py-2 shadow" onClick={benchView.back}>Esc · Ширээнд буцах</button>}
    </div>}
    {closeup && !workbench.drawer && cohesiveGuide && active && <StarInstructions><div hidden={clean && !preparing}>{(preparing
      ? <PreparationChecklist />
      : <MeasurementGuide experiment={active} target={receiver??view.selected} step={lesson?.steps[selectedStep]?.id}/>)}</div></StarInstructions>}
    {closeup && !workbench.drawer && !cohesiveGuide && (!clean || preparing || textbookPrep) && <StarInstructions><aside className="space-y-2 text-lab-ink" aria-label="Туршилтын заавар">
      <div className="text-xs font-bold leading-snug">{topic ?? lesson?.title ?? 'Туршилт сонгоогүй байна'}{preparing || textbookPrep ? ' · Бэлтгэл' : ''}</div>
      {session?.teacher && !cohesiveGuide && <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700">👩‍🏫 Багшийн горим</span>}
      {preparing ? <PreparationChecklist /> : textbookPrep ? <TextbookPreparation /> : <>
        {/* Сурах бичгийн алхмууд баруун доод булангийн «Туршилтын заавар» (StepGuide) дээр нэг нэгээр гарна — энд давхар жагсаахгүй */}
        {lesson && <>
        {!cohesiveGuide&&!clean&&<p className="mt-1 text-xs font-semibold">{active === 'nacl' ? (isTouchDevice() ? mobileizeControlHint(guide.current.hint) : guide.current.hint) : lesson.steps[selectedStep]?.text ?? 'Туршилт дууслаа.'}</p>}
        {!cohesiveGuide && !clean && active === 'elephant' && selectedStep < lesson.steps.length && <p className="mt-1 rounded bg-sky-50 p-2 text-sm font-bold text-sky-950">{selectedStep === 0 ? 'H₂O₂: 20–30 мл → цилиндр' : selectedStep === 1 ? 'Саван: бага хэмжээ · нэмсэн мл-ээ тэмдэглэ' : `KI (0.5 М): ≈${KI_DOSE_ML?.toFixed(1) ?? '—'} мл → цилиндр`}</p>}
        {!cohesiveGuide && !clean && active !== 'nacl' && lesson.steps[selectedStep] && <details key={lesson.steps[selectedStep].id} className="mt-1 text-[11px]"><summary className="cursor-pointer text-sky-800">Тусламж хэрэгтэй юу?</summary><p className="mt-1">{lesson.steps[selectedStep].hint}</p></details>}
        {!cohesiveGuide && active && <MeasurementGuide experiment={active} target={receiver ?? view.selected} step={lesson.steps[selectedStep]?.id}/>}
        </>}
      </>}
      {!cohesiveGuide && !clean && lesson && <details className="mt-1 text-[11px]"><summary className="cursor-pointer text-slate-500">Алхмууд</summary><div className="mt-1 flex flex-wrap gap-1">{lesson.steps.map((step, i) => <button key={step.id} className="rounded bg-slate-100 px-2 py-1" onClick={() => jumpToStep(i)}>{(active === 'nacl' && guide.steps[i]?.done) || done.includes(step.id) ? '✓ ' : ''}{i + 1}. {step.text}</button>)}</div></details>}
      {!cohesiveGuide && lesson && <p className="mt-1 text-[11px] text-slate-600" role="status">{active === 'nacl' && !preparing ? guide.warning : state.warning}</p>}
    </aside></StarInstructions>}
    {closeup && !workbench.drawer && isTouchDevice() && <CameraControls />}
    {(closeup || !!portable) && !workbench.drawer && <BenchControls />}
    {active === 'nacl' && <Microscope />}
  </>;
}
