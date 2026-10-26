/**
 * Цэсний зургууд (SVG). Колбоны шингэний өнгө нь сонгосон өнгөний сэдвээс (--t-liquid) авна.
 */
import { useId } from 'react';

/** Нүүр дэлгэцийн том колбо: цагаан хүрээ, дотор нь сэдвийн "шингэн" өнгө, бөмбөлөг */
export function FlaskArt({ className }: { className?: string }) {
  // Нэг хуудсанд хэд ч колбо гарч болох тул clipPath-ийн id давхцахгүй байх ёстой
  const clip = `flask-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const body = 'M104 36 V112 L40 246 Q30 276 58 280 H202 Q230 276 220 246 L156 112 V36';
  return (
    <svg viewBox="0 0 260 300" className={className} aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <path d={body} />
        </clipPath>
      </defs>
      <path d={body} fill="rgba(255,255,255,0.28)" />
      <g clipPath={`url(#${clip})`}>
        <path d="M20 198 H240 V292 H20 Z" style={{ fill: 'var(--t-liquid)' }} />
        <circle cx="104" cy="228" r="11" fill="rgba(255,255,255,0.6)" />
        <circle cx="148" cy="250" r="6" fill="rgba(255,255,255,0.6)" />
      </g>
      <path d={body} fill="none" stroke="#fff" strokeWidth="13" strokeLinejoin="round" strokeLinecap="round" />
      <rect x="92" y="14" width="76" height="24" rx="9" fill="#fff" />
    </svg>
  );
}

/** "Хичээлийн туршилт" карт: ном + колбо */
export function BookFlaskArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden="true">
      <path d="M8 22 Q42 12 78 24 V108 Q42 98 8 108 Z" fill="#fff" />
      <path d="M82 24 Q118 12 152 22 V108 Q118 98 82 108 Z" fill="#e3e9ff" />
      <rect x="110" y="30" width="16" height="6" rx="2" style={{ fill: 'var(--t-liquid)' }} />
      <path d="M113 36 H123 V58 L137 92 Q140 100 132 100 H104 Q96 100 99 92 L113 58 Z" style={{ fill: 'var(--t-liquid)' }} />
    </svg>
  );
}

/** "Чөлөөт лаборатори" карт: тавиур дээрх өнгөт шил */
export function TubesArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 110" className={className} aria-hidden="true">
      <rect x="22" y="40" width="20" height="54" rx="7" fill="#d9488f" />
      <rect x="52" y="14" width="22" height="80" rx="8" fill="#3b33b8" />
      <rect x="84" y="56" width="20" height="38" rx="7" fill="#5bc8e0" />
      <rect x="114" y="30" width="20" height="64" rx="7" fill="#2f6b63" />
      <rect x="6" y="92" width="148" height="12" rx="6" fill="#7a4f23" />
    </svg>
  );
}
