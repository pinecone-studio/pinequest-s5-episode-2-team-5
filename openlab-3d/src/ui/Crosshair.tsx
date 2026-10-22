import { useGameStore } from '../store/useGameStore';

/** Small center dot; it grows into a ring while something is in focus. */
export function Crosshair() {
  const focused = useGameStore((s) => !!s.focus);
  const dragging = useGameStore((s) => !!s.dragging);
  return (
    <div className="pointer-events-none fixed left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2" aria-hidden>
      <div
        className={`rounded-full border-white transition-all duration-150 ${
          focused ? 'h-5 w-5 border-2 bg-white/15 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]' : 'h-[7px] w-[7px] border bg-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.45)]'
        } ${dragging ? 'scale-125 border-lab-yellow' : ''}`}
      />
    </div>
  );
}
