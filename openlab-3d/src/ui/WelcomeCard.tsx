/**
 * Нээлтийн дэлгэц: "OpenLab — туршилт сонгох" дизайн (Star туслах, Анги / Чөлөөт горим карт, "Лабораторид орох" товч).
 * Алхам 1 — зөвхөн харагдах байдал. "Анги" карт (Анги → Бүлэг → Туршилт сонголт) дараагийн алхамд идэвхжинэ.
 * LoadingScreen-ийн хуучин картыг устгаагүй — LoadingScreen дотор NEW_START_DESIGN-ээр сольж харуулна.
 */
import { useState, type CSSProperties, type ReactNode } from 'react';
import type { TextbookExperiment } from '../menu/chapterBuild';
import { isTouchDevice } from '../utils/device';
import { LessonPicker } from './LessonPicker';
import { StarFace } from './StarFace';

// Өнгөнүүд (дизайны самбараас авсан)
const INK = '#1C1A3A'; // хар хөх бичиг
const NIGHT = '#1F1B4D'; // бараан хөх
const PURPLE = '#5B3DF5'; // үндсэн нил ягаан
const MUTED = '#6E6A88'; // сул бичиг

interface WelcomeCardProps {
  onEnter: () => void;
  /** Шинэ загварт эдгээр товч байхгүй; LoadingScreen-ийн хуучин карт л ашиглана */
  onShowKeys?: () => void;
  onOpenSettings?: () => void;
  /** 0..1 — 3D лаборатори ард ачаалагдаж буй хувь */
  progress: number;
  label: string;
  complete: boolean;
}

// Хөдөлгөөн. "Хөдөлгөөн багасгах" сонгосон үед бүгд зогсоно.
const CSS = `
@keyframes wc-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes wc-glow{0%,100%{box-shadow:0 0 0 0 rgba(255,201,60,.7)}50%{box-shadow:0 0 0 10px rgba(255,201,60,0)}}
@keyframes wc-rise{0%{transform:translateY(0) scale(.5);opacity:0}15%{opacity:1}100%{transform:translateY(-90px) scale(1.1);opacity:0}}
@keyframes wc-float{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-16px) rotate(8deg)}}
@keyframes wc-liquid{0%,100%{transform:translateX(0)}50%{transform:translateX(-6px)}}
@keyframes wc-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}
@keyframes wc-pop{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
.wc-bob{animation:wc-bob 3s ease-in-out infinite}
.wc-glow{animation:wc-glow 1.8s ease-out infinite}
.wc-rise{animation:wc-rise 2.4s ease-in infinite}
.wc-float{animation:wc-float 6s ease-in-out infinite}
.wc-liquid{animation:wc-liquid 2s ease-in-out infinite}
.wc-pulse{animation:wc-pulse 1.6s ease-in-out infinite}
.wc-pop{animation:wc-pop .45s cubic-bezier(.2,.9,.3,1.3) both}
.wc-lift{transition:transform .18s cubic-bezier(.2,.9,.3,1.4),box-shadow .18s}
.wc-lift:hover:not(:disabled):not([aria-disabled='true']){transform:translateY(-4px)}
.wc-lift:active:not(:disabled):not([aria-disabled='true']){transform:translateY(2px)}
@media (prefers-reduced-motion: reduce){.wc-bob,.wc-glow,.wc-rise,.wc-float,.wc-liquid,.wc-pulse,.wc-pop{animation:none}.wc-lift{transition:none}}
`;

/* ---------- Жижиг зургууд (SVG) ---------- */

function Svg({ size, stroke, strokeWidth, children }: { size: number; stroke: string; strokeWidth: number; children: ReactNode }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const BookIcon = () => (
  <Svg size={30} stroke="#D93A68" strokeWidth={2.2}>
    <path d="M2 5.5A2.5 2.5 0 0 1 4.5 3H10a2 2 0 0 1 2 2v15a2 2 0 0 0-2-2H2z" />
    <path d="M22 5.5A2.5 2.5 0 0 0 19.5 3H14a2 2 0 0 0-2 2v15a2 2 0 0 1 2-2h8z" />
  </Svg>
);
const FlaskIcon = () => (
  <Svg size={30} stroke="#14907A" strokeWidth={2.2}>
    <path d="M9 3h6" />
    <path d="M10 3v6.5L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9.5V3" />
    <path d="M7.5 15h9" />
  </Svg>
);
const ChevronIcon = () => (
  <Svg size={20} stroke="#D93A68" strokeWidth={3}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);
const CheckIcon = () => (
  <Svg size={22} stroke="#14907A" strokeWidth={3}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
const ArrowIcon = () => (
  <Svg size={24} stroke="currentColor" strokeWidth={3}>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </Svg>
);

/* ---------- Star туслах, колбо ---------- */

function StarHero() {
  return (
    <div aria-hidden="true" style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 18, flexShrink: 0 }}>
      <div className="wc-bob">
        <StarFace size={112} />
      </div>

      <div style={{ position: 'relative', width: 70, height: 96 }}>
        <div className="wc-rise" style={{ position: 'absolute', left: 22, bottom: 60, width: 12, height: 12, borderRadius: '50%', background: '#5CF2C8' }} />
        <div className="wc-rise" style={{ position: 'absolute', left: 38, bottom: 60, width: 9, height: 9, borderRadius: '50%', background: '#FFC93C', animationDelay: '-.8s' }} />
        <div className="wc-rise" style={{ position: 'absolute', left: 30, bottom: 60, width: 7, height: 7, borderRadius: '50%', background: '#FF8FB0', animationDelay: '-1.6s' }} />
        <svg width="70" height="96" viewBox="0 0 70 96" style={{ position: 'absolute', left: 0, bottom: 0 }}>
          <defs>
            <clipPath id="wc-flask-clip">
              <path d="M25 30h20v18l18 34a8 8 0 0 1-7 12H14a8 8 0 0 1-7-12l18-34z" />
            </clipPath>
          </defs>
          <g clipPath="url(#wc-flask-clip)">
            <g className="wc-liquid">
              <path d="M0 64 Q10 58 20 64 T40 64 T60 64 T80 64 V100 H0z" fill="#2BC6A0" />
            </g>
          </g>
          <path d="M25 30h20v18l18 34a8 8 0 0 1-7 12H14a8 8 0 0 1-7-12l18-34z" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinejoin="round" />
          <path d="M21 30h28" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

/** Дэвсгэрийн чимэглэл (хөвөх дугуй) — зөвхөн өргөн дэлгэцэн дээр харагдана */
function Decor() {
  const dots: { s: CSSProperties; d?: string }[] = [
    { s: { left: -130, top: 60, width: 84, height: 84, borderRadius: '50%', background: '#FF5C8A' } },
    { s: { left: -80, top: 190, width: 44, height: 44, borderRadius: '50%', background: '#FFC93C' }, d: '-2s' },
    { s: { right: -120, top: 380, width: 72, height: 72, borderRadius: '50%', background: '#2BC6A0' }, d: '-3s' },
    { s: { right: -80, top: 500, width: 38, height: 38, borderRadius: 12, background: '#3D8BFF' }, d: '-1s' },
    { s: { left: -110, top: 600, width: 52, height: 52, borderRadius: 16, background: '#FF8A3D' }, d: '-4s' },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden="true">
      {dots.map((x, i) => (
        <div key={i} className="wc-float" style={{ position: 'absolute', ...x.s, animationDelay: x.d }} />
      ))}
    </div>
  );
}

/* ---------- Горимын карт ---------- */

interface ModeCardProps {
  title: string;
  titleColor: string;
  bg: string;
  shade: string;
  blob: string;
  dot: CSSProperties;
  icon: ReactNode;
  trailing?: ReactNode;
  selected?: boolean;
  pressed?: boolean;
  onClick: () => void;
}

function ModeCard({ title, titleColor, bg, shade, blob, dot, icon, trailing, selected = false, pressed, onClick }: ModeCardProps) {
  return (
    <button
      type="button"
      className="wc-lift focus-ring"
      aria-pressed={pressed}
      onClick={onClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        minHeight: 200,
        padding: 26,
        borderRadius: 28,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        textAlign: 'left',
        cursor: 'pointer',
        color: titleColor,
        background: bg,
        border: `4px solid ${selected ? NIGHT : 'transparent'}`,
        boxShadow: `0 8px 0 ${selected ? NIGHT : shade}`,
      }}
    >
      <span aria-hidden="true" style={{ position: 'absolute', right: -30, bottom: -30, width: 130, height: 130, borderRadius: '50%', background: blob }} />
      <span aria-hidden="true" style={{ position: 'absolute', right: 70, top: 22, width: 18, height: 18, ...dot }} />
      <span style={{ position: 'relative', width: 60, height: 60, borderRadius: 20, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <span style={{ position: 'relative', display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.15 }}>{title}</span>
        <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{trailing}</span>
      </span>
    </button>
  );
}

/* ---------- Үндсэн карт ---------- */

export function WelcomeCard({ onEnter, progress, label, complete }: WelcomeCardProps) {
  // mode: null = юу ч сонгоогүй, 'free' = Чөлөөт туршилт, 'grade' = Хичээлийн туршилт (Анги → Бүлэг → Сэдэв → Туршилт)
  const [mode, setMode] = useState<'free' | 'grade' | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [experiment, setExperiment] = useState<TextbookExperiment | null>(null);
  const freeOn = mode === 'free';
  const gradeOpen = mode === 'grade';
  // Хичээлийн туршилтыг эхлүүлэхэд 3D лаборатори бүрэн ачаалагдсан (багажийн хөдөлгүүр бэлэн) байх ёстой
  const canEnter = freeOn || (gradeOpen && experiment !== null && complete);
  const waitingForLab = gradeOpen && experiment !== null && !complete;

  const openGrade = () => {
    setMode('grade');
    setGrade(null);
    setChapter(null);
    setExperiment(null);
  };
  const back = () => {
    setMode(null);
    setGrade(null);
    setChapter(null);
    setExperiment(null);
  };
  const enter = () => {
    onEnter();
    if (gradeOpen && experiment) {
      // Лабын хүнд кодыг (багаж, ширээ) нээлтийн дэлгэцийн үндсэн багцад оруулахгүйн тулд дарсан үед л ачаална
      void Promise.all([import('../menu/startExperiment'), import('../experiments/nacl/bench')]).then(([start, bench]) => {
        start.startTextbookExperiment(experiment);
        // Хичээлийн туршилт: тоглогч ажлын ширээний өмнө гарч ирнэ. Чөлөөт туршилтад ердийн байрлалдаа үлдэнэ.
        bench.openNaClExperiment();
      });
    }
  };

  return (
    <div className="relative my-auto w-full max-w-[920px] self-start font-display" style={{ color: INK }}>
      <style>{CSS}</style>
      <Decor />
      <section
        className="relative flex flex-col"
        style={{ gap: 26, background: '#FFFFFF', borderRadius: 36, boxShadow: '0 12px 0 #DCD3FF, 0 40px 80px rgba(91,61,245,0.16)', padding: 18, boxSizing: 'border-box' }}
        aria-labelledby="welcome-title"
      >
        {/* Толгой хэсэг */}
        <header style={{ position: 'relative', overflow: 'hidden', borderRadius: 28, background: PURPLE, padding: '28px clamp(20px, 4vw, 40px)', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', minHeight: 180, boxSizing: 'border-box' }}>
          <div aria-hidden="true" style={{ position: 'absolute', right: -40, top: -50, width: 200, height: 200, borderRadius: '50%', background: '#7A60FF' }} />
          <div aria-hidden="true" style={{ position: 'absolute', left: '40%', bottom: -60, width: 140, height: 140, borderRadius: '50%', background: '#6C51FB' }} />
          <div aria-hidden="true" className="wc-float" style={{ position: 'absolute', left: '52%', top: 22, width: 14, height: 14, borderRadius: '50%', background: '#FFC93C' }} />
          <div aria-hidden="true" className="wc-float" style={{ position: 'absolute', left: '60%', bottom: 26, width: 10, height: 10, borderRadius: '50%', background: '#FF8FB0', animationDelay: '-2s' }} />
          <h1 id="welcome-title" style={{ position: 'relative', margin: 0, flex: '1 1 300px', fontSize: 'clamp(30px, 5vw, 46px)', lineHeight: 1.08, fontWeight: 900, color: '#FFFFFF' }}>
            Туршилтын төрлөө
            <br />
            сонгоно уу
          </h1>
          <StarHero />
        </header>

        <div style={{ padding: '0 clamp(4px, 2vw, 22px) 22px', display: 'flex', flexDirection: 'column', gap: 26 }}>
          {/* Горим сонгох. "Хичээлийн туршилт" дарахад хоёр карт алга болж, оронд нь Анги сонголт гарна */}
          {!gradeOpen ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
              <ModeCard
                title="Хичээлийн туршилт"
                titleColor="#3A0B1C"
                bg="#FF5C8A"
                shade="#D93A68"
                blob="#FF7FA3"
                dot={{ borderRadius: '50%', background: '#FFC93C' }}
                icon={<BookIcon />}
                trailing={<ChevronIcon />}
                onClick={openGrade}
              />
              <ModeCard
                title="Чөлөөт туршилт"
                titleColor="#06302A"
                bg="#2BC6A0"
                shade="#14907A"
                blob="#5ED8B9"
                dot={{ borderRadius: 6, background: '#FFFFFF' }}
                icon={<FlaskIcon />}
                trailing={freeOn ? <CheckIcon /> : null}
                selected={freeOn}
                pressed={freeOn}
                onClick={() => setMode(freeOn ? null : 'free')}
              />
            </div>
          ) : (
            <LessonPicker
              grade={grade}
              chapter={chapter}
              experiment={experiment}
              onBack={back}
              onGrade={(picked) => {
                setGrade(picked);
                setChapter(null);
                setExperiment(null);
              }}
              onChapter={(index) => {
                setChapter(index);
                setExperiment(null);
              }}
              onExperiment={setExperiment}
            />
          )}

          {/* Орох товч */}
          <button
            type="button"
            disabled={!canEnter}
            onClick={enter}
            className={`focus-ring ${canEnter ? 'wc-lift wc-pulse' : ''}`}
            style={{
              height: 72,
              width: '100%',
              borderRadius: 24,
              border: 'none',
              fontSize: 22,
              fontWeight: 900,
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              ...(canEnter
                ? { background: '#FFC93C', color: INK, boxShadow: '0 8px 0 #D9A21C', cursor: 'pointer' }
                : { background: '#F1EEF8', color: MUTED, boxShadow: '0 8px 0 #E2DEEE', cursor: 'not-allowed' }),
            }}
          >
            {waitingForLab ? 'Лаборатори ачаалж байна…' : 'Лабораторид орох'}
            <ArrowIcon />
          </button>

          {/* 3D лаборатори ард ачаалагдаж буй явц */}
          <div>
            <div className="flex items-center gap-3 text-xs" style={{ color: MUTED }} aria-live="polite">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#EFEAFF' }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="3D лабораторийг ард ачаалж байна">
                <div className="h-full rounded-full transition-[width] duration-300 ease-out" style={{ background: '#FFC93C', width: `${Math.max(4, progress * 100)}%` }} />
              </div>
              <span>{complete ? 'Бэлэн' : `${label}…`}</span>
            </div>
            <p className="mt-2 text-center text-xs" style={{ color: MUTED }}>
              {isTouchDevice() ? 'Зүүн доод талын joystick-оор алхаж, баруун талд чирж эргэн харна.' : 'Эргэн харахад хулгана түгжигдэнэ — хүссэн үедээ Esc дарж чөлөөлнө.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
