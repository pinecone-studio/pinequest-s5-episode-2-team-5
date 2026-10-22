/** One room, one set of equipment. Guidance never locks an object or a step. */
import { useEffect, useRef } from 'react';
import { bench, enterBench, exitBench } from './bench';
import { drawScopeImage } from './engine';
import { NAMES, USES, LABEL_KEYS } from './data';
import { contentsLabel, crystalMass, describe, labSpace, labUse, mixture, partId, partKey, useSandbox } from './sandbox';
import { useGameStore } from '../../store/useGameStore';
import { usePortableStore } from '../../interaction/portable';
import { useInventoryStore } from '../../store/useInventoryStore';
import { requestLock } from '../../controls/usePointerLock';
import { interactables } from '../../interaction/registry';
import { tablePointer } from '../../interaction/heldApi';
import { dropHeld } from '../../controls/useGameKeys';
import { benchView, useBenchView } from './view';
import { experimentGuide } from './guidance';
import { promptKey } from '../../controls/keyMap';
import { useSettingsStore } from '../../store/useSettingsStore';

function readItem(id: string) {
  mixture(id);
  useSandbox.setState({ inspected: id });
  useBenchView.setState({ selected: id, level: 'detail' });
  if (useGameStore.getState().mode === 'walk') enterBench(id);
  else benchView.focus(id);
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
        const selected = game.mode === 'bench' ? view.level !== 'detail' || view.selected === id : game.focus?.id === id;
        el.style.display = spot.visible && selected && usePortableStore.getState().held?.id !== id ? 'block' : 'none';
        el.style.transform = `translate(${spot.x}px,${spot.y}px) translate(-50%,-100%)`;
        const m = mixture(id);
        el.textContent = `${NAMES[spot.key]}${m.ml > 0 ? ` · ${m.ml.toFixed(1)} см³` : ''}`;
      });
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
    {LABEL_KEYS.map((key, i) => <button key={key} ref={(el) => { refs.current[i] = el; }}
      className="pointer-events-auto absolute left-0 top-0 max-w-[180px] rounded-md bg-white/90 px-2 py-1 text-[10px] text-lab-ink shadow"
      onClick={() => { if (usePortableStore.getState().held || useInventoryStore.getState().held) useSandbox.setState({ inspected: partId(key) }); else readItem(partId(key)); }} />)}
  </div>;
}

function SubstanceCard() {
  const id = useSandbox((s) => s.inspected);
  const contents = useSandbox((s) => s.contents);
  const portable = usePortableStore((s) => s.held);
  const normal = useInventoryStore((s) => s.held);
  const mode = useGameStore((s) => s.mode);
  if (!id) return null;
  const heldId = portable?.id ?? normal?.id;
  const item = describe(id); const m = contents[id] ?? mixture(id); const key = partKey(id);
  const close = () => {
    useSandbox.setState({ inspected: null }); useBenchView.setState({ selected: null });
    if (mode === 'walk') requestLock(); else benchView.table();
  };
  const tool = heldId ? describe(heldId) : null;
  const canPour = !!tool && tool.capacity > 0 && item.capacity > 0 && heldId !== id;
  const action = () => { if (heldId !== id) labUse.start(id); };
  return <section className="fixed inset-x-4 bottom-28 z-40 max-h-[24vh] overflow-auto rounded-2xl bg-white/95 p-3 text-sm text-lab-ink shadow-hud sm:inset-x-auto sm:right-4 sm:top-32 sm:bottom-auto sm:max-h-[53vh] sm:w-[270px] sm:p-4" aria-label="Багаж ба хэмжилт">
    <div className="flex justify-between gap-2"><h2 className="font-bold">{item.label}</h2><button aria-label="Хэмжилтийг хаах" onClick={close}>✕</button></div>
    {item.capacity > 0 && <div className="my-2 rounded-xl bg-sky-50 px-3 py-2"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Одоогийн эзэлхүүн</span><output className="font-mono text-2xl font-bold tabular-nums sm:text-3xl text-sky-900" aria-label="Одоогийн эзэлхүүн">{m.ml.toFixed(1)} <small className="text-sm">см³</small></output>{key === 'cyl' && <div className="text-xs text-sky-800">Зорилго: 50.0 см³ · 1 см³ хуваарь<br />Менискийн доод ирмэгийг урдаас унш.</div>}</div>}
    <p className="text-xs font-semibold text-teal-700">{contentsLabel(m)} · {m.temp.toFixed(0)} °C</p>
    <div className="mt-3 flex flex-wrap gap-2">
      {((interactables.get(id)?.onGrab && interactables.get(id)?.onGrab !== interactables.get(id)?.onInteract) || key === 'lamp' || key === 'scope') && <button className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold" onClick={() => { const entry = interactables.get(id); if (entry?.onGrab) entry.onInteract?.(); else labUse.start(id); }}>Ашиглах</button>}
      <button className="rounded-lg bg-sky-100 px-3 py-2 text-xs font-semibold text-sky-900" onClick={() => readItem(id)}>⌕ Хуваарийг ойроос харах</button>
      {!heldId && <button className="btn-yellow px-3 py-2 text-xs" onClick={() => { const entry = interactables.get(id); (entry?.onGrab ?? entry?.onInteract)?.(); }}>Авах / зөөх</button>}
      {heldId === id && <button className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-semibold" onClick={() => { tablePointer.angle += Math.PI / 4; }}>Эргүүлэх 45°</button>}
    </div>
    {heldId && heldId !== id && <div className="mt-3 border-t border-slate-200 pt-3">
      <p className="mb-2 text-[11px] text-slate-600">{tool?.label} → {item.label}</p>
      <button className="touch-none rounded-lg bg-amber-300 px-3 py-2 text-xs font-bold" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); action(); }} onPointerUp={() => labUse.end()} onPointerCancel={() => labUse.end()} onBlur={() => labUse.end()}
        onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); action(); } }} onKeyUp={() => labUse.end()}>Дарж барьж {canPour ? 'цутгах' : 'ашиглах'}</button>
      {canPour && <div className="mt-2 flex gap-2"><button className="rounded-lg bg-sky-100 px-3 py-2 text-xs font-bold" onClick={() => labUse.dose(id, 1)}>1 см³ цутгах</button><button className="rounded-lg bg-sky-100 px-3 py-2 text-xs font-bold" onClick={() => labUse.dose(id, 5)}>5 см³ цутгах</button></div>}
    </div>}
    <details className="mt-3 text-xs"><summary className="cursor-pointer font-semibold text-slate-600">Бодис, зориулалт, аюул</summary>
      {key && <p className="mt-2">{USES[key]}</p>}
      <p className="mt-2">HCl {m.acid.toFixed(2)} ммоль · Na₂CO₃ {m.carbonate.toFixed(2)} г · NaCl {m.salt.toFixed(3)} г · Талст {crystalMass(m).toFixed(3)} г</p>
      <p className="mt-2 text-amber-900">{m.acid > 0 ? 'Хүчил: нүд, арьс цочрооно. ' : ''}{m.temp > 50 ? 'Халуун: түлэгдэх аюултай. ' : ''}{m.other ? 'Энэ хольцын урвалыг загварчлаагүй. ' : ''}Зааврыг дага; бодисыг амсахгүй.</p>
    </details>
  </section>;
}

function Molecules() {
  const rx = useSandbox((s) => s.rx);
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { bench.engine?.attachRx(ref.current); return () => bench.engine?.attachRx(null); }, [rx]);
  if (!rx) return null;
  return <aside className="mt-3 rounded-xl bg-white/95 p-2 text-center text-xs text-lab-ink">
    <b>Молекулын түвшинд</b><canvas ref={ref} width={300} height={300} className="mx-auto my-1 h-28 w-28 rounded-full sm:h-36 sm:w-36" />
    {rx === 'acid' ? 'CO₃²⁻ + 2H⁺ → H₂O + CO₂↑' : 'H₂O ↑ · Na⁺ + Cl⁻ → NaCl талст'}
  </aside>;
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

function panButtons() {
  return <><button aria-label="Камерыг зүүн тийш" className="rounded bg-slate-100 px-2 py-1 sm:px-3" onClick={() => benchView.pan(-1, 0)}>←</button><button aria-label="Камерыг урагш" className="rounded bg-slate-100 px-2 py-1 sm:px-3" onClick={() => benchView.pan(0, 1)}>↑</button><button aria-label="Камерыг хойш" className="rounded bg-slate-100 px-2 py-1 sm:px-3" onClick={() => benchView.pan(0, -1)}>↓</button><button aria-label="Камерыг баруун тийш" className="rounded bg-slate-100 px-2 py-1 sm:px-3" onClick={() => benchView.pan(1, 0)}>→</button></>;
}

function CameraControls() {
  const view = useBenchView();
  return <section className="fixed inset-x-4 bottom-3 z-30 rounded-2xl bg-white/95 p-2 text-lab-ink shadow-hud sm:inset-x-auto sm:bottom-20 sm:right-4 sm:w-[270px] sm:p-3" aria-label="Ширээний камер">
    <div className="mb-2 hidden items-center justify-between text-xs font-bold sm:flex"><span>Ойртуулах / холдуулах</span><span className="font-mono text-[10px] text-slate-500">{Math.round(view.distance * 100)} см</span></div>
    <div className="flex items-center gap-2"><button className="rounded-lg bg-slate-100 px-3 py-2 text-lg font-bold" aria-label="Холдуулах" onClick={() => benchView.zoom(1.3)}>−</button><input aria-label="Камерын зай" type="range" min={0} max={100} value={(Math.log(Math.max(.018, view.distance)) - Math.log(.018)) / (Math.log(3.5) - Math.log(.018)) * 100} className="min-w-0 flex-1 accent-amber-500" onChange={(e) => benchView.setDistance(Math.exp(Math.log(.018) + +e.target.value / 100 * (Math.log(3.5) - Math.log(.018))))} /><button className="rounded-lg bg-slate-100 px-3 py-2 text-lg font-bold" aria-label="Ойртуулах" onClick={() => benchView.zoom(1 / 1.3)}>+</button></div>
    <div className="mt-1 flex gap-1 sm:mt-2 sm:flex-wrap"><button className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold sm:py-2 sm:text-[11px]" onClick={benchView.table}>Ажлын харагдац</button><button className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold sm:py-2 sm:text-[11px]" onClick={benchView.overview}>Бүтэн ширээ</button><div className="ml-auto flex items-center justify-center gap-1 sm:hidden">{panButtons()}</div></div>
    <div className="mt-2 hidden items-center justify-center gap-1 sm:flex">{panButtons()}</div>
  </section>;
}

export function NaClHUD() {
  const mode = useGameStore((s) => s.mode);
  const focusedId = useGameStore((s) => s.focus?.id ?? null);
  const toast = useGameStore((s) => s.toast);
  useEffect(() => {
    if (mode === 'bench' && toast) useSandbox.setState({ warning: [toast.title, toast.subtitle].filter(Boolean).join(' · ') });
  }, [mode, toast]);
  const state = useSandbox();
  const portable = usePortableStore((s) => s.held);
  const normal = useInventoryStore((s) => s.held);
  const settings = useSettingsStore();
  const held = portable?.label ?? (normal ? describe(normal.id).label : null);
  const heldId = portable?.id ?? normal?.id;
  const closeup = mode === 'bench';
  const relevant = state.near || closeup || !!heldId?.startsWith('nacl-') || state.participants.includes(heldId ?? '') || !!state.rx;
  const guide = experimentGuide();
  const q = promptKey('drop', settings.bindings, settings.lookMode);
  const recommended = guide.index === 0 ? partId('cyl') : guide.recommended[0];
  return <>
    {(state.near || closeup) && <WorldLabels />}
    <div className={`fixed left-4 z-30 flex max-w-[calc(100vw-2rem)] flex-wrap gap-2 ${closeup ? 'top-4 sm:top-20' : 'top-20'}`}>
      {(state.near || closeup) && <button className="rounded-full bg-amber-300 px-4 py-2 text-xs font-bold text-lab-ink shadow" onClick={closeup ? exitBench : () => { useBenchView.setState({ level: 'table' }); enterBench(); }}>V · {closeup ? 'Өрөөнд алхах' : 'Ширээн дээр ажиллах'}</button>}
      {closeup && <button className="rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-lab-ink shadow" onClick={benchView.overview}>Бүтэн ширээ</button>}
    </div>
    {relevant && <aside className={`fixed left-4 z-20 max-h-[28vh] w-[calc(100vw-2rem)] overflow-auto rounded-2xl bg-slate-900/95 p-3 text-white shadow-hud sm:max-h-[65vh] sm:w-[290px] ${closeup ? 'top-16 sm:top-32' : 'top-32'}`} aria-label="Туршилтын заавар">
      <div className="text-[10px] font-bold uppercase tracking-wide text-amber-300">Зөв дараалал · {guide.finished ? 'Дууссан' : `${guide.index + 1} / 8`}</div>
      <h2 className="mt-1 text-sm font-bold">{guide.current.letter}. {guide.current.title}</h2>
      <p className="mt-2 hidden text-xs leading-relaxed sm:block">{guide.current.hint}</p>
      <details className="mt-2 text-xs leading-relaxed sm:hidden"><summary className="cursor-pointer">{guide.current.hint.split('. ')[0]}.</summary><p className="mt-2">{guide.current.hint}</p></details>
      <button className="mt-2 rounded-lg bg-amber-300 px-3 py-2 text-xs font-bold text-slate-900" onClick={() => readItem(recommended)}>⌕ Заасан багажийг ойроос харах</button>
      <div className="mt-3 rounded-lg border border-amber-400/70 bg-amber-100 p-2 text-amber-950" role="status"><strong className="block text-[11px]">⚠ Анхааруулга / зөвлөгөө</strong><p className="mt-1 text-[11px] leading-relaxed">{guide.warning}</p></div>
      <button className="mt-2 text-[11px] text-white/80 underline" onClick={() => useSandbox.setState({ guide: !state.guide })}>{state.guide ? 'Алхмуудыг хураах' : 'Бүх 8 алхмыг харах'}</button>
      {state.guide && <ol className="mt-2 space-y-1 text-[11px]">{guide.steps.map((step, i) => <li key={step.letter} className={i === guide.index ? 'font-bold text-amber-300' : 'text-white/70'}>{step.done ? '✓' : `${step.letter}.`} {step.title}</li>)}</ol>}
      <Molecules /><p className="mt-2 hidden text-[10px] text-white/60 sm:block">Багажийг хүссэнээрээ зөөж болно. Заавар нь чиглүүлнэ; алхам түгжихгүй.</p>
    </aside>}
    {closeup && <CameraControls />}
    {closeup && <div className="pointer-events-none fixed inset-x-4 bottom-4 z-20 hidden rounded-xl sm:block bg-slate-900/90 px-3 py-2 text-center text-[11px] text-white shadow sm:inset-x-auto sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2">
      {held ? <><b>{held}</b> · Хулганаа ширээний хоосон хэсэг рүү зөө. Ногоон хүрээ гарсан газарт дарж тавь ({q}).<button className="pointer-events-auto ml-2 rounded bg-white/20 px-2 py-1" onClick={() => { tablePointer.angle += Math.PI / 4; }}>Эргүүлэх 45°</button><button className="pointer-events-auto ml-1 rounded bg-white/20 px-2 py-1" onClick={dropHeld}>Тавих</button></> : <>Багаж дээр дарах: хэмжээс · Зүүн чирэх: ширээгээр шилжих · Баруун чирэх: эргүүлэх · Дугуй / хоёр хуруу: ойр, хол</>}
    </div>}
    {!closeup && (held || focusedId) && relevant && <div className="pointer-events-none fixed bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full bg-amber-300 px-4 py-3 text-xs font-bold text-lab-ink">{heldId ? `${q}: тавих · R: ашиглах · V: ширээний нарийн байршуулалт` : 'E: авах · V: ширээн дээр ажиллах'}</div>}
    <SubstanceCard /><Microscope />
  </>;
}
