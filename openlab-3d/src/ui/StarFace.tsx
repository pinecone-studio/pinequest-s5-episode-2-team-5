/** Star drawn flat: the welcome card, and the phone button when 3D quality is set to low. */
import { useId } from 'react';

const OUTLINE = 'M50 10 L64.1 34.6 L91.8 40.4 L72.8 61.4 L75.9 89.6 L50 78 L24.1 89.6 L27.2 61.4 L8.2 40.4 L35.9 34.6 Z';

export function StarFace({ size = 78 }: { size?: number }) {
  const glow = useId();
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id={glow}>
          <stop offset="0%" stopColor="#ffd66e" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ff9628" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="54" r="48" fill={`url(#${glow})`} />
      <path d={OUTLINE} fill="#ffd23f" stroke="#ffc533" strokeWidth="10" strokeLinejoin="round" />
      {[41, 59].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="52" rx="5" ry="6.5" fill="#3a2314" />
          <circle cx={x + 1.6} cy="49.3" r="1.9" fill="#fff" />
        </g>
      ))}
      {[33, 67].map((x) => <ellipse key={x} cx={x} cy="60" rx="5" ry="3.4" fill="#ff7f9b" opacity="0.6" />)}
      <path d="M44.5 61.5 Q50 67 55.5 61.5" fill="none" stroke="#3a2314" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
