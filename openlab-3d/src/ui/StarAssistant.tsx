/**
 * Star's corner of the screen: its speech bubble (styled for "Stop!", comfort or cheering), the
 * button that opens the AI chat, the chat itself, and the screen-edge arrow that points to Star
 * when it flies off to show something. Star itself flies around the room (world/StarCompanion).
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { SKILLS, useExperimentStore, type SkillId } from '../store/useExperimentStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { CATALOG } from '../equipment/equipmentCatalog';
import { useLabStore } from '../store/useLabStore';
import { experimentById, getExperiments, getTextbookLessons } from '../lab/experiments';
import { askHost } from '../lab/starBridge';
import { starCompass } from '../lab/starGuide';
import { sounds } from '../utils/sounds';
import { isTouchDevice } from '../utils/device';
import { mobileizeControlHint } from '../controls/mobileInteraction';
import { StarFace } from './StarFace';

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
}

/** The bubble's look for each kind of moment. */
const BUBBLE = {
  danger: { box: 'bg-red-50 ring-2 ring-red-400', label: 'text-red-600', title: '✋ Star · Зогс!' },
  oops: { box: 'bg-amber-50 ring-2 ring-amber-300', label: 'text-amber-700', title: '⭐ Star · Зүгээр дээ' },
  plain: { box: 'bg-white', label: 'text-amber-600', title: '⭐ Star · Лабораторийн туслах' },
};

export function StarAssistant({ hidden }: { hidden: boolean }) {
  const [chatOpen, setChatOpen] = useState(false);
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
  const greeting = useMemo(() => (chatOpen ? contextualHint() : ''), [chatOpen]);
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
    setOpen(false);
    setChatOpen(true);
  };
  const speaking = robot.open && !!robot.text && !chatOpen;
  const look = danger ? BUBBLE.danger : robot.mood === 'oops' ? BUBBLE.oops : BUBBLE.plain;
  // The button hops when Star speaks, and shakes when it says "Stop!".
  const flight = calm
    ? {}
    : speaking
      ? { y: touch ? 4 : -14, scale: 1.12, x: danger ? [0, -6, 6, -4, 4, 0] : 0 }
      : { y: 0, scale: 1, x: 0 };

  return (
    <div className={`${touch ? 'fixed left-[84px] top-2 z-30' : 'fixed bottom-2 left-2 z-30 flex items-end'} ${hidden ? 'hidden' : ''}`}>
      <motion.button
        type="button"
        aria-label="Star туслахтай чатлах"
        onClick={openChat}
        animate={flight}
        transition={{ type: 'spring', stiffness: 260, damping: 16 }}
        className={touch
          ? 'focus-ring pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full active:scale-95'
          : 'focus-ring pointer-events-auto flex h-[82px] w-[72px] items-center justify-center rounded-3xl'}
      >
        <StarFace size={touch ? 46 : 66} />
      </motion.button>
      {/* Points to Star when it has flown out of view to show something; moved by StarCompanion. */}
      <div
        ref={(el) => { starCompass.el = el; }}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-40 opacity-0 transition-opacity duration-300"
      >
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-amber-100/90 shadow-hud ring-2 ring-amber-400">
          <StarFace size={34} />
          <div ref={(el) => { starCompass.arrow = el; }} className="absolute inset-0">
            <span className="absolute -right-3 top-1/2 -translate-y-1/2 border-y-[9px] border-l-[13px] border-y-transparent border-l-amber-500" />
          </div>
        </div>
      </div>
      <AnimatePresence mode="wait">
        {speaking && (
          <motion.div
            key={robot.id}
            role={danger ? 'alert' : 'status'}
            aria-live={danger ? 'assertive' : 'polite'}
            className={touch
              ? `pointer-events-auto fixed left-[84px] top-[64px] flex max-h-[45dvh] max-w-[min(300px,calc(100vw-180px))] flex-col rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-snug text-lab-ink shadow-hud ${look.box}`
              : `pointer-events-auto fixed bottom-[94px] left-2 max-h-[35dvh] max-w-[min(280px,calc(100vw-24px))] overflow-y-auto rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-snug text-lab-ink shadow-hud sm:relative sm:bottom-auto sm:left-auto sm:mb-[70px] sm:ml-[-4px] sm:max-h-none sm:max-w-[min(300px,calc(100vw-120px))] ${look.box}`}
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ transformOrigin: touch ? 'top left' : 'bottom left' }}
          >
            {/* On touch only the text scrolls, so the ask button below always stays in view. */}
            <div className={touch ? 'min-h-0 overflow-y-auto' : undefined}>
              <div className={`mb-0.5 pr-4 text-[11px] font-bold uppercase tracking-wider ${look.label}`}>{look.title}</div>
              {touch ? mobileizeControlHint(robot.text) : robot.text}
            </div>
            {touch && (
              <button type="button" onClick={openChat} className="focus-ring mt-2 block shrink-0 self-start rounded-full bg-amber-500 px-3 py-1.5 text-xs font-bold text-white">
                Star-аас асуух
              </button>
            )}
            <button type="button" aria-label="Зөвлөгөөг хаах" onClick={() => setOpen(false)} className="focus-ring absolute right-2 top-1.5 rounded px-1 text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {!touch && speaking && (
        <button type="button" onClick={openChat} className="focus-ring pointer-events-auto absolute bottom-2 left-[76px] rounded-full bg-amber-500 px-3 py-2 text-[11px] font-bold text-white shadow-hud sm:text-xs">
          Star-аас асуух
        </button>
      )}
      {!touch && !chatOpen && !hidden && !robot.open && (
        <button type="button" onClick={openChat} className="focus-ring pointer-events-auto fixed bottom-3 left-[88px] z-40 rounded-full border border-amber-200 bg-white px-3 py-2 text-[11px] font-bold text-amber-800 shadow-hud sm:bottom-4 sm:text-xs">💬 Star чат</button>
      )}
      {chatOpen && (
        <section aria-label="Star AI chat" className="pointer-events-auto fixed bottom-3 left-3 z-50 flex h-[min(58dvh,420px)] max-h-[calc(100dvh-24px)] w-[min(330px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-amber-200 bg-white text-lab-ink shadow-2xl sm:bottom-4 sm:left-3 sm:h-[min(62vh,520px)] sm:w-[min(390px,calc(100vw-24px))]">
          <header className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-400 px-3 py-2.5 text-amber-950">
            <StarFace size={34} />
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
  );
}
