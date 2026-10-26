import { useGameStore } from '../store/useGameStore';
import { isTouchDevice } from '../utils/device';

/** Center arrow (a ring on touch devices); it marks the aim point and grows while something is in focus. */
export function Crosshair() {
  const focused = useGameStore((s) => !!s.focus);
  const dragging = useGameStore((s) => !!s.dragging);
  // Phones and tablets have no mouse: a small aiming ring instead of an arrow pointer.
  if (isTouchDevice()) {
    return (
      <div className="pointer-events-none fixed left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2" aria-hidden>
        <div className={`rounded-full border-2 border-white shadow-[0_0_2px_rgba(0,0,0,0.6)] transition-all duration-150 ${focused ? 'h-6 w-6 bg-white/25' : 'h-3 w-3'} ${dragging ? 'border-lab-yellow' : ''}`} />
      </div>
    );
  }
  return (
    <div className="pointer-events-none fixed left-1/2 top-1/2 z-20" aria-hidden>
      <svg
        viewBox="0 0 14 20"
        className={`origin-top-left transition-all duration-150 drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)] ${
          focused ? 'h-7 w-5' : 'h-5 w-3.5'
        } ${dragging ? 'fill-lab-yellow' : 'fill-white'} stroke-black/70`}
        strokeWidth="1"
        strokeLinejoin="round"
      >
        <path d="M0.5 0.5 V16.5 L4.7 12.7 L7.5 19 L10.1 17.9 L7.4 11.7 H13 Z" />
      </svg>
    </div>
  );
}
