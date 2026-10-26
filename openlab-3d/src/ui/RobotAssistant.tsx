/**
 * "Pip", the lab assistant robot (an original design): rounded white body, round head
 * with a dark glossy visor, glowing cyan curved "smiling" eyes, side ear-pods and stubby
 * arms. Rendered in its own small transparent canvas with idle bob, blinking and a wave.
 * Clicking it opens a speech bubble with a contextual hint; it reacts to bench skills.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { AnimatePresence, motion } from 'framer-motion';
import { CapsuleGeometry, MeshPhysicalMaterial, MeshStandardMaterial, SphereGeometry, TorusGeometry, type Group } from 'three';
import { useGameStore } from '../store/useGameStore';
import { SKILLS, useExperimentStore, type SkillId } from '../store/useExperimentStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { CATALOG } from '../equipment/equipmentCatalog';
import { useLabStore } from '../store/useLabStore';
import { experimentById, getExperiments, getTextbookLessons } from '../lab/experiments';
import { sounds } from '../utils/sounds';
import { isTouchDevice } from '../utils/device';
import { mobileizeControlHint } from '../controls/mobileInteraction';

const shell = new MeshPhysicalMaterial({ color: '#f7f8fa', roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2 });
const trim = new MeshStandardMaterial({ color: '#c9d1da', roughness: 0.45 });
const visor = new MeshPhysicalMaterial({ color: '#0b1220', roughness: 0.08, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03 });
const glow = new MeshStandardMaterial({ color: '#000', emissive: '#38e1ff', emissiveIntensity: 2.6, toneMapped: false });

const headGeo = new SphereGeometry(0.42, 40, 28);
// Front-facing cap of the head (phi = π/2 points toward +z).
const visorGeo = new SphereGeometry(0.405, 40, 24, Math.PI * 0.14, Math.PI * 0.72, Math.PI * 0.27, Math.PI * 0.42);
const bodyGeo = new CapsuleGeometry(0.3, 0.22, 10, 28);
const armGeo = new CapsuleGeometry(0.075, 0.16, 6, 16);
const eyeGeo = new TorusGeometry(0.07, 0.018, 10, 28, Math.PI);

function RobotModel() {
  const root = useRef<Group>(null);
  const head = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  const arm = useRef<Group>(null);
  const robot = useGameStore((s) => s.robot);
  const anim = useRef({ waveUntil: 0, hopUntil: 0, nextBlink: 2, blink: 0 });

  useEffect(() => {
    if (robot.id === 0) return;
    const now = performance.now() / 1000;
    if (robot.mood === 'wave') anim.current.waveUntil = now + 2.4;
    if (robot.mood === 'happy') anim.current.hopUntil = now + 1.2;
  }, [robot.id, robot.mood]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const now = performance.now() / 1000;
    const a = anim.current;
    if (root.current) {
      const hop = now < a.hopUntil ? Math.abs(Math.sin((a.hopUntil - now) * 9)) * 0.12 : 0;
      root.current.position.y = Math.sin(t * 2.1) * 0.035 + hop;
      root.current.rotation.y = Math.sin(t * 0.6) * 0.16 + 0.25;
    }
    if (head.current) head.current.rotation.z = Math.sin(t * 1.3) * 0.05;
    // Blink.
    a.nextBlink -= dt;
    if (a.nextBlink <= 0) {
      a.blink = 0.14;
      a.nextBlink = 2.2 + Math.random() * 3;
    }
    a.blink = Math.max(0, a.blink - dt);
    if (eyes.current) eyes.current.scale.y = a.blink > 0 ? 0.15 : 1;
    // Wave the right arm.
    if (arm.current) {
      const waving = now < a.waveUntil;
      const target = waving ? 2.5 + Math.sin(now * 14) * 0.35 : 0.25;
      arm.current.rotation.z += (target - arm.current.rotation.z) * (1 - Math.exp(-10 * dt));
    }
  });

  return (
    <group ref={root}>
      {/* Body. */}
      <mesh geometry={bodyGeo} material={shell} position={[0, -0.55, 0]} />
      <mesh material={trim} position={[0, -0.5, 0.27]} scale={[1, 1, 0.4]}>
        <sphereGeometry args={[0.16, 24, 16]} />
      </mesh>
      <mesh material={glow} position={[0, -0.47, 0.335]}>
        <circleGeometry args={[0.035, 20]} />
      </mesh>
      {/* Arms (left static, right waves). */}
      <group position={[-0.34, -0.42, 0]} rotation={[0, 0, -0.25]}>
        <mesh geometry={armGeo} material={shell} position={[0, -0.12, 0]} />
      </group>
      <group ref={arm} position={[0.34, -0.42, 0]} rotation={[0, 0, 0.25]}>
        <mesh geometry={armGeo} material={shell} position={[0, -0.12, 0]} />
      </group>
      {/* Head. */}
      <group ref={head} position={[0, 0.12, 0]}>
        <mesh geometry={headGeo} material={shell} />
        <mesh geometry={visorGeo} material={visor} />
        <group ref={eyes} position={[0, 0.04, 0.398]}>
          {[-0.12, 0.12].map((x) => (
            <mesh key={x} geometry={eyeGeo} material={glow} position={[x, -0.02, 0]} rotation={[0, 0, 0]} />
          ))}
        </group>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.42, 0, 0]} rotation={[0, 0, (s * Math.PI) / 2]}>
            <mesh material={trim}>
              <cylinderGeometry args={[0.1, 0.11, 0.09, 24]} />
            </mesh>
            <mesh material={glow} position={[0, s * -0.047, 0]} rotation={[s > 0 ? Math.PI : 0, 0, 0]}>
              <torusGeometry args={[0.06, 0.01, 8, 24]} />
            </mesh>
          </group>
        ))}
        <mesh material={trim} position={[0, 0.44, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.1, 8]} />
        </mesh>
        <mesh material={glow} position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.03, 12, 10]} />
        </mesh>
      </group>
    </group>
  );
}

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

/** Robot praises each bench skill the first time it is done. */
function useRobotDirector(): void {
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

export function RobotAssistant({ hidden }: { hidden: boolean }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const pending = useRef(new Map<string, (answer: string | null) => void>());
  useRobotDirector();
  const robot = useGameStore((s) => s.robot);
  const setOpen = useGameStore((s) => s.setRobotOpen);
  useEffect(() => {
    if (!robot.open) return;
    const id = window.setTimeout(() => setOpen(false), 11000);
    return () => window.clearTimeout(id);
  }, [robot.open, robot.id, setOpen]);
  useEffect(() => {
    const standalone = window.parent === window;
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== (standalone ? window : window.parent) || !event.data || typeof event.data !== 'object') return;
      const data = event.data as { type?: unknown; version?: unknown; id?: unknown; answer?: unknown };
      if (data.type !== 'chemquest:pip-answer' || data.version !== 1 || typeof data.id !== 'string') return;
      const resolve = pending.current.get(data.id);
      if (!resolve) return;
      pending.current.delete(data.id);
      resolve(typeof data.answer === 'string' ? data.answer : null);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  const askPip = async (event: FormEvent) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question || waiting) return;
    setDraft('');
    setMessages((items) => [...items, { role: 'user', text: question }]);
    setWaiting(true);
    const id = crypto.randomUUID();
    const lab = useLabStore.getState();
    const context = JSON.stringify({
      app: 'ChemQuest: chemistry lessons, quiz explanations, and Open Lab virtual chemistry laboratory.',
      lessons: getTextbookLessons(),
      experiments: getExperiments(),
      currentExperiment: lab.active ? experimentById(lab.active) : null,
      completedSteps: lab.progress,
      controls: isTouchDevice()
        ? 'Touch: tap the highlighted object to interact, tap a valid target to use or store a held item, tap empty space to place it, and long-press empty space to throw; F inspect; joystick move; drag right side to look; use Settings for controls.'
        : 'E interact/pick up; F inspect; Q drop/place; R use held item; T throw; Tab tools; N notes; V worktop view; wear safety goggles and gloves; use fume hood for fumes.',
    });
    const response = new Promise<string | null>((resolve) => {
      pending.current.set(id, resolve);
      const message = {
        type: 'openlab:ask-pip', version: 1, id, question,
        history: messages.slice(-8), context,
      };
      if (window.parent === window) {
        (window as Window & { ReactNativeWebView?: { postMessage: (value: string) => void } }).ReactNativeWebView?.postMessage(JSON.stringify(message));
      } else window.parent.postMessage(message, window.location.origin);
    });
    const answer = await Promise.race([
      response,
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 45000)),
    ]);
    pending.current.delete(id);
    setMessages((items) => [...items, { role: 'model', text: answer ?? 'Pip-тэй холбогдож чадсангүй. Нэвтэрсэн эсэх болон Gemini тохиргоогоо шалгаарай.' }]);
    setWaiting(false);
  };
  const glPixel = useMemo(() => Math.min(2, window.devicePixelRatio || 1), []);
  const onClick = () => {
    if (robot.open) {
      setOpen(false);
      return;
    }
    sounds.play('ui');
    useGameStore.getState().say(contextualHint(), 'wave');
  };
  return (
    <div className={`fixed bottom-2 left-2 z-30 flex items-end ${hidden ? 'hidden' : ''}`}>
      <button type="button" aria-label="Лабораторийн туслах роботоос зөвлөгөө авах" onClick={onClick} className="focus-ring pointer-events-auto h-[82px] w-[72px] rounded-3xl sm:h-[150px] sm:w-[130px]">
        <Canvas frameloop={hidden ? 'never' : 'always'} dpr={glPixel} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 0.05, 3.6], fov: 30 }} style={{ pointerEvents: 'none' }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 3, 3]} intensity={1.8} />
          <Environment resolution={32} frames={1}>
            <Lightformer form="rect" intensity={2.5} position={[0, 3, 2]} rotation={[-Math.PI / 3, 0, 0]} scale={[4, 2, 1]} />
            <Lightformer form="rect" intensity={1} color="#bde9ff" position={[-3, 0, 1]} rotation={[0, Math.PI / 2, 0]} scale={[3, 3, 1]} />
          </Environment>
          <RobotModel />
          <mesh position={[0, -1.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.36, 32]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.12} />
          </mesh>
        </Canvas>
      </button>
      <AnimatePresence mode="wait">
        {robot.open && robot.text && (
          <motion.div
            key={robot.id}
            role="status"
            aria-live="polite"
            className="pointer-events-auto fixed bottom-[94px] left-2 max-h-[35dvh] max-w-[min(280px,calc(100vw-24px))] overflow-y-auto rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm leading-snug text-lab-ink shadow-hud sm:relative sm:bottom-auto sm:left-auto sm:mb-[86px] sm:ml-[-8px] sm:max-h-none sm:max-w-[min(300px,calc(100vw-160px))]"
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ transformOrigin: 'bottom left' }}
          >
            <div className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-cyan-600">Пип · Лабораторийн туслах</div>
            {isTouchDevice() ? mobileizeControlHint(robot.text) : robot.text}
            <button type="button" aria-label="Зөвлөгөөг хаах" onClick={() => setOpen(false)} className="focus-ring absolute right-2 top-1.5 rounded px-1 text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {robot.open && !chatOpen && (
        <button type="button" onClick={() => { setChatOpen(true); setOpen(false); }} className="focus-ring pointer-events-auto absolute bottom-2 left-[76px] rounded-full bg-cyan-600 px-3 py-2 text-[11px] font-bold text-white shadow-hud sm:left-[148px] sm:text-xs">
          Pip-ээс асуух
        </button>
      )}
      {!chatOpen && !hidden && !robot.open && (
        <button type="button" onClick={() => setChatOpen(true)} className="focus-ring pointer-events-auto fixed bottom-3 left-[88px] z-40 rounded-full border border-cyan-200 bg-white px-3 py-2 text-[11px] font-bold text-cyan-800 shadow-hud sm:bottom-4 sm:left-[166px] sm:text-xs">💬 Pip чат</button>
      )}
      {chatOpen && (
        <section aria-label="Pip AI chat" className="pointer-events-auto fixed bottom-3 left-3 z-50 flex h-[min(58dvh,420px)] max-h-[calc(100dvh-24px)] w-[min(330px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-cyan-200 bg-white text-lab-ink shadow-2xl sm:bottom-4 sm:left-3 sm:h-[min(62vh,520px)] sm:w-[min(390px,calc(100vw-24px))]">
          <header className="flex items-center justify-between bg-cyan-700 px-4 py-3 text-white">
            <div><div className="text-sm font-bold">Pip · AI туслах</div><div className="text-[11px] opacity-80">Хичээл ба лабораторийн тухай асуугаарай</div></div>
            <button type="button" aria-label="Чатыг хаах" onClick={() => setChatOpen(false)} className="focus-ring rounded px-2 text-lg">✕</button>
          </header>
          <div className="flex-1 space-y-2 overflow-y-auto p-3" aria-live="polite">
            {messages.length === 0 && <p className="rounded-xl bg-cyan-50 p-3 text-sm">Сайн уу! ChemQuest-ийн хичээл, туршилт, аюулгүй ажиллагааны талаар асуугаарай.</p>}
            {messages.map((message, i) => <div key={i} className={`max-w-[90%] whitespace-pre-wrap rounded-xl p-3 text-sm ${message.role === 'user' ? 'ml-auto bg-indigo-100' : 'bg-slate-100'}`}>{message.text}</div>)}
            {waiting && <div className="text-xs text-slate-500">Pip бодож байна…</div>}
          </div>
          <form onSubmit={askPip} className="flex gap-2 border-t border-slate-200 p-3">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1200} placeholder="Асуултаа бичээрэй…" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600" />
            <button disabled={waiting || !draft.trim()} className="rounded-xl bg-cyan-700 px-4 text-sm font-bold text-white disabled:opacity-50">Илгээх</button>
          </form>
        </section>
      )}
    </div>
  );
}
