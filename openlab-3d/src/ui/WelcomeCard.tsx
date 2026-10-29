/**
 * Шинэ нээлтийн дэлгэц: Star туслах, 3 алхам, үндсэн удирдлага.
 * LoadingScreen-ийн хуучин картыг устгаагүй — LoadingScreen дотор NEW_START_DESIGN-ээр сольж харуулна.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { keyLabel, promptKey } from '../controls/keyMap';
import { isTouchDevice } from '../utils/device';
import { StarFace } from './StarFace';

// Өнгөнүүд (зурагнаас авсан)
const INK = '#1b1640'; // хар хөх бичиг
const PURPLE = '#6b4eff'; // үндсэн нил ягаан
const LINE = '#e9e4fb'; // зөөлөн хүрээ

interface WelcomeCardProps {
  onEnter: () => void;
  onShowKeys: () => void;
  onOpenSettings: () => void;
  /** 0..1 — 3D лаборатори ард ачаалагдаж буй хувь */
  progress: number;
  label: string;
  complete: boolean;
}

/* ---------- Жижиг зургууд (SVG) ---------- */

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const ShieldIcon = () => (
  <Icon>
    <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </Icon>
);
const SearchIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.5-4.5" />
  </Icon>
);
const FlaskIcon = () => (
  <Icon>
    <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M8 15h8" />
  </Icon>
);
const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const MouseIcon = () => (
  <svg viewBox="0 0 32 40" width="34" height="42" fill="none" stroke={PURPLE} strokeWidth="3" strokeLinecap="round" aria-hidden="true">
    <rect x="6" y="5" width="20" height="30" rx="10" />
    <path d="M16 11v7" />
    <path d="M1 14c-1 5 0 10 2 14M31 14c1 5 0 10-2 14" />
  </svg>
);
const JoystickIcon = () => (
  <svg viewBox="0 0 40 40" width="42" height="42" fill="none" stroke={PURPLE} strokeWidth="3" aria-hidden="true">
    <circle cx="20" cy="20" r="16" />
    <circle cx="20" cy="20" r="6" fill={PURPLE} />
  </svg>
);
const DragIcon = () => (
  <svg viewBox="0 0 40 40" width="42" height="42" fill="none" stroke={PURPLE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 20h28M12 13l-6 7 6 7M28 13l6 7-6 7" />
  </svg>
);
const TapIcon = ({ fill = false }: { fill?: boolean }) => (
  <svg viewBox="0 0 40 40" width="42" height="42" fill="none" stroke={PURPLE} strokeWidth="3" aria-hidden="true">
    <circle cx="20" cy="20" r="15" strokeDasharray="4 5" />
    <circle cx="20" cy="20" r="6" fill={fill ? PURPLE : 'none'} />
  </svg>
);

/* ---------- Алхам, товчны картууд ---------- */

function StepCard({ n, title, text, bg, tile, tileText, numColor, icon }: { n: number; title: string; text: string; bg: string; tile: string; tileText: string; numColor: string; icon: ReactNode }) {
  return (
    <li className="rounded-2xl p-4" style={{ background: bg }}>
      <div className="flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: tile, color: tileText }}>
          {icon}
        </span>
        <span className="font-display text-2xl font-extrabold" style={{ color: numColor }}>
          {n}
        </span>
      </div>
      <div className="mt-3 font-display text-base font-bold" style={{ color: INK }}>
        {title}
      </div>
      <p className="mt-1 text-xs leading-snug text-slate-500">{text}</p>
    </li>
  );
}

/** Гарын товч (товчлуурын хэлбэртэй) */
function Cap({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return (
    <span
      className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg border-2 px-2 font-display text-sm font-bold"
      style={accent ? { background: '#f7c357', borderColor: '#d9a03b', color: INK, boxShadow: '0 2px 0 #d9a03b' } : { background: '#fff', borderColor: '#ddd6f6', color: INK, boxShadow: '0 2px 0 #ddd6f6' }}
    >
      {children}
    </span>
  );
}

function KeyCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <li className="flex flex-col items-center justify-between gap-2 rounded-2xl border-2 bg-white px-2 pb-3 pt-3" style={{ borderColor: LINE }}>
      <div className="flex min-h-[5rem] flex-col items-center justify-center gap-1">{children}</div>
      <span className="font-display text-sm font-bold" style={{ color: INK }}>
        {label}
      </span>
    </li>
  );
}

/** Дэвсгэрийн чимэглэл (молекул, колбо) — зөвхөн өргөн дэлгэцэн дээр харагдана */
function Decor() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden="true">
      <svg className="absolute -left-44 top-24" viewBox="0 0 150 170" width="150" height="170">
        <path d="M28 28L104 74L76 138" stroke="#d3c9fb" strokeWidth="7" strokeLinecap="round" fill="none" />
        <circle cx="28" cy="28" r="28" fill="#f29ca8" />
        <circle cx="104" cy="74" r="38" fill="#8e7bfa" />
        <circle cx="76" cy="138" r="22" fill="#93e7d6" />
      </svg>
      <svg className="absolute -right-32 bottom-28" viewBox="0 0 170 160" width="150" height="141">
        <path d="M30 50L115 40L125 125" stroke="#d3c9fb" strokeWidth="7" strokeLinecap="round" fill="none" />
        <circle cx="30" cy="50" r="26" fill="#f7c95f" />
        <circle cx="115" cy="40" r="36" fill="#5fbaab" />
        <circle cx="125" cy="125" r="28" fill="#f29ca8" />
      </svg>
      <svg className="absolute -right-14 top-2" viewBox="0 0 90 120" width="86" height="115">
        <path d="M20 90H70L77 100Q80 106 72 106H18Q10 106 13 100Z" fill="#a8e4e0" />
        <path d="M30 14V46L10 98Q6 108 18 108H72Q84 108 80 98L60 46V14M24 14H66" fill="none" stroke="#b9aaf9" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ---------- Үндсэн карт ---------- */

export function WelcomeCard({ onEnter, onShowKeys, onOpenSettings, progress, label, complete }: WelcomeCardProps) {
  const bindings = useSettingsStore((s) => s.bindings);
  const lookMode = useSettingsStore((s) => s.lookMode);
  // Утас/таблет дээр "Мэдрэгч дэлгэц" автоматаар сонгогдоно
  const [input, setInput] = useState<'keyboard' | 'touch'>(isTouchDevice() ? 'touch' : 'keyboard');
  const touch = input === 'touch';
  // "Лабораторид орох" товч дээр фокус тавина (Enter дарахад орно), гэхдээ дэлгэцийг доош гүйлгэхгүй —
  // утсан дээр Star-ын толгой хэсэг эхэндээ харагдах ёстой
  const enterRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    enterRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="relative my-auto w-full max-w-3xl self-start">
      <Decor />
      <section
        className="relative rounded-[28px] bg-white p-5 sm:p-10"
        style={{ boxShadow: '0 28px 70px -24px rgba(76,52,190,0.4)', color: INK }}
        aria-labelledby="welcome-title"
      >
        {/* Толгой хэсэг */}
        <header className="flex items-center gap-4 sm:gap-5">
          <div className="shrink-0">
            <StarFace />
          </div>
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider" style={{ color: PURPLE }}>
              OpenLab 3D · Анхан шат
            </div>
            <h1 id="welcome-title" className="font-display text-2xl font-extrabold leading-tight sm:text-[2rem]">
              Химийн лабораторид тавтай морил!
            </h1>
          </div>
        </header>
        <p className="mt-2 text-sm text-slate-500 sm:ml-[6.1rem]">Би Star байна ⭐ Багаж олж, бодис холиод, урвалыг өөрийн нүдээр харцгаая. Би чамтай хамт байж, туслана!</p>

        {/* 3 алхам */}
        <ol className="mt-6 grid gap-3 sm:grid-cols-3">
          <StepCard n={1} title="Хамгаалалт өмс" text="Нүдний шил, бээлийгээ хамгийн түрүүнд" bg="#fef3d6" tile="#f7c357" tileText="#6b4a00" numColor="#a77a12" icon={<ShieldIcon />} />
          <StepCard n={2} title="Багаж ол" text="Шар өнгөөр гэрэлтэж буй зүйлийг дага" bg="#dff4f1" tile="#5bb8a8" tileText="#164a41" numColor="#2f7f72" icon={<SearchIcon />} />
          <StepCard n={3} title="Туршилт хий" text="Холи, халаа, өнгө ба хийг ажигла" bg="#ebe6fd" tile={PURPLE} tileText="#ffffff" numColor={PURPLE} icon={<FlaskIcon />} />
        </ol>

        {/* Үндсэн удирдлага */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-extrabold">Үндсэн удирдлага</h2>
          <div className="flex rounded-full p-1" style={{ background: '#f1eefd' }} role="group" aria-label="Удирдлагын төрөл">
            {(
              [
                ['keyboard', 'Гар, хулгана'],
                ['touch', 'Мэдрэгч дэлгэц'],
              ] as const
            ).map(([key, text]) => (
              <button
                key={key}
                type="button"
                aria-pressed={input === key}
                onClick={() => setInput(key)}
                className="focus-ring rounded-full px-4 py-2 font-display text-xs font-bold transition"
                style={input === key ? { background: PURPLE, color: '#fff', boxShadow: '0 4px 12px -2px rgba(107,78,255,0.5)' } : { color: '#5b557d' }}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {touch ? (
            <>
              <KeyCard label="Алхах">
                <JoystickIcon />
              </KeyCard>
              <KeyCard label="Эргэн харах">
                <DragIcon />
              </KeyCard>
              <KeyCard label="Авах / тавих">
                <TapIcon />
              </KeyCard>
              <KeyCard label="Ашиглах">
                <TapIcon fill />
              </KeyCard>
            </>
          ) : (
            <>
              <KeyCard label="Алхах">
                <Cap>{keyLabel(bindings.forward[0])}</Cap>
                <div className="flex gap-1">
                  <Cap>{keyLabel(bindings.left[0])}</Cap>
                  <Cap>{keyLabel(bindings.backward[0])}</Cap>
                  <Cap>{keyLabel(bindings.right[0])}</Cap>
                </div>
              </KeyCard>
              <KeyCard label="Эргэн харах">
                {lookMode === 'mouse' ? (
                  <MouseIcon />
                ) : (
                  <div className="flex gap-1">
                    <Cap>{keyLabel(bindings.turnLeft[0])}</Cap>
                    <Cap>{keyLabel(bindings.turnRight[0])}</Cap>
                  </div>
                )}
              </KeyCard>
              <KeyCard label="Авах / тавих">
                <Cap>{promptKey('interact', bindings, lookMode)}</Cap>
              </KeyCard>
              <KeyCard label="Ашиглах">
                <Cap accent>{keyLabel(bindings.pour[0])}</Cap>
              </KeyCard>
            </>
          )}
        </ul>
        <p className="mt-3 text-xs text-slate-500">Бусад товчийг лабораторид хэрэгтэй үед нь Star зааж өгнө.</p>

        {/* Орох товч */}
        <button
          type="button"
          className="focus-ring mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-display text-lg font-extrabold transition hover:brightness-105 active:translate-y-[3px]"
          style={{ background: '#f7c357', color: INK, boxShadow: '0 5px 0 #d9a03b' }}
          onClick={onEnter}
          ref={enterRef}
        >
          Лабораторид орох
          <ArrowIcon />
        </button>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button type="button" className="focus-ring rounded-xl border-2 bg-white py-3 font-display text-sm font-bold transition hover:bg-[#f7f5ff]" style={{ borderColor: LINE }} onClick={onShowKeys}>
            Бүх товчлуур харах
          </button>
          <button type="button" className="focus-ring rounded-xl border-2 bg-white py-3 font-display text-sm font-bold transition hover:bg-[#f7f5ff]" style={{ borderColor: LINE }} onClick={onOpenSettings}>
            Тохиргоо
          </button>
        </div>

        {/* 3D лаборатори ард ачаалагдаж буй явц (хуучин картад байсан) */}
        <div className="mt-4 flex items-center gap-3 text-xs text-slate-400" aria-live="polite">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#eeeaf9' }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="3D лабораторийг ард ачаалж байна">
            <div className="h-full rounded-full transition-[width] duration-300 ease-out" style={{ background: '#f7c357', width: `${Math.max(4, progress * 100)}%` }} />
          </div>
          <span>{complete ? 'Бэлэн' : `${label}…`}</span>
        </div>
        <p className="mt-2 text-center text-xs text-slate-400">{isTouchDevice() ? 'Зүүн доод талын joystick-оор алхаж, баруун талд чирж эргэн харна.' : 'Эргэн харахад хулгана түгжигдэнэ — хүссэн үедээ Esc дарж чөлөөлнө.'}</p>
      </section>
    </div>
  );
}
