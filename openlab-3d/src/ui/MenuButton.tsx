import { openPanelFromGame } from '../controls/useGameKeys';
import { useGameStore } from '../store/useGameStore';

/** Yellow (#F5B800) round hamburger button, top left. */
export function MenuButton() {
  const open = useGameStore((s) => s.panel === 'menu');
  return (
    <button
      type="button"
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      onClick={() => (open ? useGameStore.getState().closePanel() : openPanelFromGame('menu'))}
      className="focus-ring pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-lab-yellow shadow-hud transition hover:scale-105 hover:bg-lab-yellowDark active:scale-95"
    >
      <span className="flex w-6 flex-col gap-[5px]" aria-hidden>
        <span className="h-[3px] rounded-full bg-white" />
        <span className="h-[3px] rounded-full bg-white" />
        <span className="h-[3px] rounded-full bg-white" />
      </span>
    </button>
  );
}
