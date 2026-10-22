import { openPanelFromGame, resumeWalk } from '../controls/useGameKeys';
import { useGameStore } from '../store/useGameStore';
import { useExperimentStore } from '../store/useExperimentStore';

/** Dark translucent square button with a notebook icon (top right). */
export function NotesButton() {
  const open = useGameStore((s) => s.panel === 'notes');
  const count = useExperimentStore((s) => s.measurements.length);
  return (
    <button
      type="button"
      aria-label="Open lab notes"
      aria-expanded={open}
      onClick={() => (open ? resumeWalk() : openPanelFromGame('notes'))}
      className="hud-square focus-ring pointer-events-auto relative w-11 !px-0"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6z" />
        <path d="M6 3v18M4 7h4M4 12h4M4 17h4M10 8h6M10 12h6" />
      </svg>
      {count > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-lab-yellow px-1 text-[11px] font-bold text-white">{count}</span>}
    </button>
  );
}
