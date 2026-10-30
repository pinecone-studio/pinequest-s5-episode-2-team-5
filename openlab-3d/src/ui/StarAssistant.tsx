/**
 * Star's world-anchored speech bubble (styled for "Stop!", comfort or cheering), the
 * current procedure, clickable help button and optional AI chat. Instructions stay visible
 * until the learner collapses them; the procedure continues running while collapsed.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { useReducedMotion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { clampStarPosition, starSpeech, useStarSpeech } from '../lab/starSpeech';
import { useSettingsStore } from '../store/useSettingsStore';
import { useGameStore } from '../store/useGameStore';
import { SKILLS, useExperimentStore, type SkillId } from '../store/useExperimentStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { CATALOG } from '../equipment/equipmentCatalog';
import { useLabStore } from '../store/useLabStore';
import { experimentById, getExperiments, getTextbookLessons } from '../lab/experiments';
import { askHost } from '../lab/starBridge';
import { benchReadings, textbookLesson } from '../lab/starContext';
import { starSay } from '../lab/starCoach';
import { starCompass } from '../lab/starGuide';
import { benchTipLine } from '../lab/starLines';
import { StarFace } from './StarFace';
import { StarInstructionHost } from './StarGuidance';
import { releaseLock } from '../controls/pointerLock';
import { sounds } from '../utils/sounds';
import { isTouchDevice } from '../utils/device';
import { mobileizeControlHint } from '../controls/mobileInteraction';

const SKILL_HINTS: Record<SkillId, string> = {
  burner: 'Голын ширээнүүд дээрх Бунзены горелк руу ойртоод R дарж асаагаарай. E дарвал авч зөөж болно.',
  tare: 'Аналитик жин баруун хананы ширээн дээр байна. R дарж тэглээд, дараа нь тавган дээр нь шилэн сав тавиарай. E дарвал жинг өөрийг нь авна.',
  hood: 'Татах шүүгээ хойд хананд байна. Утаа гардаг ажил хийхээсээ өмнө хаалтан дээр нь E дарж өргөөрэй.',
  mix: 'Шүүгээ (E дарж нээ) эсвэл ширээн дээрээс урвалжийн лонх аваад, хоосон аяга руу хараад R-ийг дарсаар асга. Дараа нь өөр бодис нэмж урвалыг ажигла.',
};

const SKILL_PRAISE: Record<SkillId, string> = {
  burner: 'Сайхан дөл байна! Хамгийн халуун цэг нь дотоод цэнхэр конусын оройн яг дээр байдаг. Унтраахдаа дахин R дараарай.',
  tare: 'Жин тэглэгдлээ! Одоо тавган дээр нь химийн аяга тавиад (Q), дэлгэц дээрх массыг уншаарай.',
  hood: 'Хаалт өргөгдлөө! Шүүгээний дотор дор хаяж 15 см гүнд ажиллаж, дуусаад хаалтаа буулгаарай.',
  mix: 'Сайн байна! Хоёр бодис урвалд орлоо. Аяган дээрх шингэний өнгө, pH-ийг F дарж ойроос шалгаарай.',
};

function contextualHint(): string {
  const skills = useExperimentStore.getState().skills;
  const held = useInventoryStore.getState().held;
  const lab = useLabStore.getState();
  const x = lab.active ? experimentById(lab.active) : undefined;
  const step = x?.steps.find((s) => !(lab.progress[x.id] ?? []).includes(s.id));
  if (held) return `Гартаа: ${CATALOG[held.kind].name}. Q — тавих (нээлттэй шургуулга руу хараад Q — хадгалах), T — шидэх, F — ойроос харах${CATALOG[held.kind].capacityMl ? ', сав руу хараад R-ийг дарсаар — асгах' : ', ямар нэг зүйл рүү хараад R — ашиглах'}.${step ? ` Одоогийн алхам: ${step.hint}` : ''}`;
  if (x && step) return `«${x.title}»: ${step.text}. ${step.hint}`;
  const next = SKILLS.find((s) => !skills[s.id]);
  if (next) return SKILL_HINTS[next.id];
  const tips = [
    'Ямар ч зүйл дээр F дарж ойроос харж болно.',
    'Tab дарахад багаж, бодисын жагсаалт нээгдэнэ — дарвал хамгийн ойрын ширээн дээр гарч ирнэ.',
    'Ширээний шургуулга, шүүгээ бүр шошготой. E дарж нээгээд доторх зүйлийг аваарай.',
    'Шил унавал хагарна! Асгарсан уусмалыг E дарж арчаарай.',
    `Цэс → Туршилт хэсэгт ${getExperiments().length} туршилтын алхам алхмаар заавар бий.`,
    'Хамгаалалтын нүдний шил баруун хананы ширээн дээр байна. Аюулгүй байдал хамгийн түрүүнд!',
    'Аюулгүйн шүршүүр зүүн өмнөд буланд, гал унтраагуур өмнөд цонхны дэргэд өлгөөтэй байна.',
    'Ажигласан зүйлээ лабораторийн тэмдэглэлд (N) бичээрэй.',
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}

/** Star praises each bench skill the first time it is done. */
function useStarDirector(): void {
  useEffect(() => {
    let prev = useExperimentStore.getState().skills;
    return useExperimentStore.subscribe((s) => {
      if (s.skills === prev) return;
      const newly = SKILLS.find((o) => s.skills[o.id] && !prev[o.id]);
      prev = s.skills;
      if (newly) {
        useGameStore.getState().say(SKILL_PRAISE[newly.id], 'happy');
        sounds.play('success', 0.6);
      }
    });
  }, []);
  // Sitting down at the worktop: a tip for the next step, worded by the AI when its budget allows.
  useEffect(() => useGameStore.subscribe((s, prev) => {
    if (s.mode === 'bench' && prev.mode !== 'bench') starSay(benchTipLine(contextualHint(), benchAbout()));
  }), []);
}

/** What the AI is told when the student sits down at the worktop. */
function benchAbout(): string {
  const lab = useLabStore.getState();
  const x = lab.active ? experimentById(lab.active) : undefined;
  if (!x) return 'Хүүхэд ажлын ширээнд суулаа. Туршилт сонгоогүй, чөлөөт лаборатори.';
  const step = x.steps.find((s) => !(lab.progress[x.id] ?? []).includes(s.id));
  return step
    ? `Хүүхэд «${x.title}» туршилтын ажлын ширээнд суулаа. Дараагийн алхам: ${step.text}. ${step.hint}`
    : `Хүүхэд «${x.title}» туршилтын ажлын ширээнд суулаа. Бүх алхмаа хийсэн.`;
}

/**
 * Points to Star when it has flown out of view to show something (goggles, tongs, a spill);
 * StarCompanion moves it. Fixed to the screen, so it lives outside Star's world-anchored bubble.
 */
export function StarCompass() {
  return (
    <div ref={(el) => { starCompass.el = el; }} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-40 opacity-0 transition-opacity duration-300">
      <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-amber-100/90 shadow-hud ring-2 ring-amber-400">
        <StarFace size={34} />
        <div ref={(el) => { starCompass.arrow = el; }} className="absolute inset-0">
          <span className="absolute -right-3 top-1/2 -translate-y-1/2 border-y-[9px] border-l-[13px] border-y-transparent border-l-amber-500" />
        </div>
      </div>
    </div>
  );
}

/** The bubble's look for each kind of moment. */
const BUBBLE = {
  danger: { box: 'bg-red-50 ring-2 ring-red-400', label: 'text-red-600', title: '✋ Star · Зогс!' },
  oops: { box: 'bg-amber-50 ring-2 ring-amber-300', label: 'text-amber-700', title: '⭐ Star · Зүгээр дээ' },
  plain: { box: 'bg-white', label: 'text-amber-600', title: '⭐ Star · Лабораторийн туслах' },
};

export function StarAssistant({ hidden }: { hidden: boolean }) {
  const host = useStarSpeech((s) => s.host);
  useEffect(() => () => { starSpeech.interacting = false; starSpeech.dragging = false; starSpeech.position = null; }, []);
  const savedPosition = useSettingsStore((s) => s.starPosition);
  // Star can be dragged into place only at the worktop; walking, it follows the player.
  const seated = useGameStore((s) => s.mode === 'bench');
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ pointer: number; x: number; y: number; offsetX: number; offsetY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const active = useLabStore((s) => s.active);
  const progress = useLabStore((s) => s.progress);
  const held = useInventoryStore((s) => s.held);
  const skills = useExperimentStore((s) => s.skills);
  useEffect(() => { setCollapsed(false); }, [active]);
  const [draft, setDraft] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const touch = isTouchDevice();
  const calm = useReducedMotion() ?? false;
  useStarDirector();
  const robot = useGameStore((s) => s.robot);
  const setOpen = useGameStore((s) => s.setRobotOpen);
  const danger = robot.mood === 'danger';
  useEffect(() => {
    if (!robot.open) return;
    const id = window.setTimeout(() => setOpen(false), danger ? 14000 : 11000);
    return () => window.clearTimeout(id);
  }, [robot.open, robot.id, danger, setOpen]);
  useEffect(() => {
    if (robot.open && danger) sounds.play('beep', 0.7);
  }, [robot.id, robot.open, danger]);
  // The chat opens with a tip for what the student is doing right now.
  const greeting = useMemo(() => contextualHint(), [active, progress, held, skills]);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: calm ? 'auto' : 'smooth' });
  }, [messages, waiting, calm]);

  const askStar = async (event: FormEvent) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question || waiting) return;
    setDraft('');
    setMessages((items) => [...items, { role: 'user', text: question }]);
    setWaiting(true);
    const lab = useLabStore.getState();
    const context = JSON.stringify({
      app: 'ChemQuest: chemistry lessons, quiz explanations, and Open Lab virtual chemistry laboratory.',
      lessons: getTextbookLessons(),
      experiments: getExperiments(),
      mode: lab.active ? 'experiment' : 'free lab',
      currentExperiment: lab.active ? experimentById(lab.active) : null,
      textbookLesson: textbookLesson(),
      bench: benchReadings(),
      currentInstruction: document.querySelector('.star-guidance')?.textContent?.slice(0, 6000),
      completedSteps: lab.progress,
      recent: useGameStore.getState().log.slice(-10).map((entry) => entry.text),
      controls: touch
        ? 'Touch: tap the highlighted object to interact, tap a valid target to use or store a held item, tap empty space to place it, and long-press empty space to throw; F inspect; joystick move; drag right side to look; use Settings for controls.'
        : 'E interact/pick up; F inspect; Q drop/place; R use held item; T throw; Tab tools; N notes; V worktop view; wear safety goggles and gloves; use fume hood for fumes.',
    });
    const answer = await askHost({ type: 'openlab:ask-pip', question, history: messages.slice(-8), context }, 45000);
    setMessages((items) => [...items, { role: 'model', text: answer ?? 'Star-тай холбогдож чадсангүй. Нэвтэрсэн эсэхээ шалгаад дахин асуугаарай.' }]);
    setWaiting(false);
  };

  const openChat = () => {
    sounds.play('ui');
    releaseLock();
    setOpen(false);
    setChatOpen(true);
  };
  const speaking = robot.open && !!robot.text;
  const urgent = speaking && danger;
  const look = danger ? BUBBLE.danger : robot.mood === 'oops' ? BUBBLE.oops : BUBBLE.plain;
  const expanded = !collapsed || urgent;
  const toggleGuide = () => {
    releaseLock();
    starSpeech.interacting = false;
    setCollapsed((value) => chatOpen ? false : !value);
    setChatOpen(false);
    sounds.play('ui');
  };

  const grabStar = (event: PointerEvent<HTMLButtonElement>) => {
    if (!seated || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    event.stopPropagation();
    releaseLock();
    starSpeech.interacting = true;
    const bounds = event.currentTarget.getBoundingClientRect();
    drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY,
      offsetX: bounds.left + bounds.width / 2 - event.clientX,
      offsetY: bounds.top + bounds.height / 2 - event.clientY, moved: false };
    suppressClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveStar = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = drag.current;
    if (!gesture || gesture.pointer !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (!gesture.moved && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 6) return;
    if (!gesture.moved) { gesture.moved = true; setDragging(true); }
    starSpeech.dragging = true;
    starSpeech.interacting = false;
    starSpeech.position = clampStarPosition((event.clientX + gesture.offsetX) / window.innerWidth,
      (event.clientY + gesture.offsetY) / window.innerHeight, window.innerWidth, window.innerHeight);
  };
  const dropStar = (event: PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const gesture = drag.current;
    if (!gesture || gesture.pointer !== event.pointerId) return;
    event.stopPropagation();
    drag.current = null;
    if (gesture.moved && !cancelled && starSpeech.position) useSettingsStore.getState().set({ starPosition: starSpeech.position });
    starSpeech.dragging = false;
    starSpeech.position = null;
    starSpeech.interacting = false;
    setDragging(false);
    // A drag must not also trigger the click that collapses the instructions.
    suppressClick.current = gesture.moved || cancelled;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const followAgain = () => {
    starSpeech.position = null;
    starSpeech.interacting = false;
    useSettingsStore.getState().set({ starPosition: null });
  };

  if (!host) return null;
  return createPortal(
    <div
      hidden={hidden}
      className="star-world-assistant pointer-events-none"
      data-dragging={dragging || undefined}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label={expanded && !chatOpen ? 'Star-ийн зааврыг хураах' : 'Star-ийн зааврыг нээх'}
        aria-controls="star-instructions"
        aria-expanded={expanded && !chatOpen}
        onPointerDown={grabStar}
        onPointerEnter={() => { starSpeech.interacting = true; }}
        onPointerLeave={() => { if (!starSpeech.dragging) starSpeech.interacting = false; }}
        onPointerMove={moveStar}
        onPointerUp={(event) => dropStar(event)}
        onPointerCancel={(event) => dropStar(event, true)}
        onLostPointerCapture={(event) => dropStar(event, true)}
        onClick={(event) => { if (suppressClick.current) event.preventDefault(); else toggleGuide(); }}
        className="star-world-hit focus-ring pointer-events-auto"
        title={seated ? 'Star · Чирж байрлуулна, дарж зааврыг нээнэ' : 'Star · Дарж зааврыг нээнэ'}
      />
      <div
        ref={(element) => { starSpeech.panel = element; }}
        className="star-world-speech pointer-events-auto"
        hidden={!expanded && !chatOpen}
        onPointerEnter={() => { starSpeech.interacting = true; }}
        onPointerLeave={() => { starSpeech.interacting = false; }}
      >
      <section
        id="star-instructions"
        aria-label="Star-ийн заавар"
        hidden={chatOpen || !expanded}
        className="star-speech-card overflow-hidden rounded-3xl border border-emerald-100 text-lab-ink"
      >
        <header className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50 px-3 py-2">
          <span className="flex-1 text-xs font-extrabold text-emerald-900">⭐ Star · Хамтдаа хийе<span className="block text-[10px] font-medium text-emerald-700">{seated ? 'Ширээнд Star-ийг чирж байрлуулж болно' : 'Star чамайг дагаж нисэнэ'}</span></span>
          {seated && savedPosition && <button type="button" aria-label="Star-ийг дагуулж нисгэх" title="Star-ийн байрлалыг анхны болгох" onClick={followAgain} className="focus-ring min-h-9 min-w-9 rounded-lg text-emerald-800">↺</button>}
          <button type="button" aria-label="Star-ийн яриаг хураах" onClick={() => { starSpeech.interacting = false; setCollapsed(true); if (urgent) setOpen(false); }} className="focus-ring min-h-9 min-w-9 rounded-lg text-emerald-800">−</button>
        </header>
        <div className="space-y-3 overflow-y-auto overscroll-contain p-3" style={{ maxHeight: touch ? 'max(80px, calc(100dvh - 235px))' : 'min(42dvh, 350px)' }}>
          {/* Shown over the desk instructions: warnings, comfort, and the tip given on sitting down. */}
          <StarInstructionHost urgent={danger || robot.mood === 'oops' || robot.mood === 'tip'} notice={speaking && <div role={danger ? 'alert' : 'status'} aria-live={danger ? 'assertive' : 'polite'} className={`relative rounded-xl p-3 pr-7 text-sm leading-relaxed ${look.box}`}>
            <div className={`mb-1 text-[11px] font-bold ${look.label}`}>{look.title}</div>
            {touch ? mobileizeControlHint(robot.text) : robot.text}
            <button type="button" aria-label="Зөвлөгөөг хаах" onClick={() => setOpen(false)} className="focus-ring absolute right-1 top-1 min-h-7 min-w-7 rounded">✕</button>
          </div>} fallback={<p className="text-sm leading-relaxed">{touch ? mobileizeControlHint(greeting) : greeting}</p>} />
        </div>
        <footer className="border-t border-emerald-100 px-3 py-2">
          <button type="button" onClick={openChat} className="focus-ring min-h-10 w-full rounded-xl bg-emerald-100 px-3 text-xs font-bold text-emerald-900">💬 Star-аас асуух</button>
        </footer>
      </section>
      {chatOpen && (
        <section aria-label="Star AI chat" className="star-speech-card flex h-[min(420px,calc(100dvh-100px))] flex-col overflow-hidden rounded-3xl border border-amber-100 text-lab-ink">
          <header className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-400 px-3 py-2.5 text-amber-950">
            <div className="flex-1"><div className="text-sm font-bold">Star · AI туслах</div><div className="text-[11px] opacity-80">Туршилт, бодис, аюулгүй байдлын талаар асуугаарай</div></div>
            <button type="button" aria-label="Чатыг хаах" onClick={() => setChatOpen(false)} className="focus-ring rounded px-2 text-lg">✕</button>
          </header>
          {/* A "Stop!" never waits behind the chat. */}
          {danger && robot.open && (
            <div role="alert" className="border-b border-red-200 bg-red-50 px-3 py-2 text-sm leading-snug text-red-800">
              {touch ? mobileizeControlHint(robot.text) : robot.text}
            </div>
          )}
          <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto p-3" aria-live="polite">
            <p className="max-w-[90%] rounded-xl rounded-tl-md bg-amber-50 p-3 text-sm">
              Сайн уу! Би Star байна ⭐ Юу ч асууж болно.{' '}
              {touch ? mobileizeControlHint(greeting) : greeting}
            </p>
            {messages.map((message, i) => <div key={i} className={`max-w-[90%] whitespace-pre-wrap rounded-xl p-3 text-sm ${message.role === 'user' ? 'ml-auto bg-indigo-100' : 'bg-amber-50'}`}>{message.text}</div>)}
            {waiting && <div className="text-xs text-slate-500">Star бодож байна…</div>}
          </div>
          <form onSubmit={askStar} className="flex gap-2 border-t border-slate-200 p-3">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1200} placeholder="Асуултаа бичээрэй…" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500" />
            <button disabled={waiting || !draft.trim()} className="rounded-xl bg-amber-500 px-4 text-sm font-bold text-white disabled:opacity-50">Илгээх</button>
          </form>
        </section>
      )}
      </div>
    </div>,
    host,
  );
}
