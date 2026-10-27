import { openPanelFromGame } from '../controls/useGameKeys';
import { useGameStore } from '../store/useGameStore';
import { themeStyle } from '../theme/themes';
import { useTheme } from '../menu/useTheme';
import { NEW_LAB_MENU } from './MenuPanel';

/** Шинэ цэс асаалттай үед товч нь цэсний өнгөтэй (Тэнгис цэнхэр) адилхан, унтраалттай үед хуучин шар */
const BUTTON_COLOR = NEW_LAB_MENU ? 'bg-[color:var(--t-screen-mid)] hover:bg-[color:var(--t-screen-bottom)]' : 'bg-lab-yellow hover:bg-lab-yellowDark';

/** Зураасны өнгө: шинэ цэстэй үед сонгосон өнгөний бичгийн өнгө (Цайвар өнгөнд бараан), хуучинд цагаан */
const LINE_COLOR = NEW_LAB_MENU ? 'bg-[color:var(--t-ink)]' : 'bg-white';

/** Round hamburger button, top left (хуучин: шар #F5B800, шинэ цэстэй үед: цэсний өнгө). */
export function MenuButton() {
  const open = useGameStore((s) => s.panel === 'menu');
  const theme = useTheme();
  return (
    <button
      type="button"
      aria-label={open ? 'Цэсийг хаах' : 'Цэсийг нээх'}
      aria-expanded={open}
      onClick={() => (open ? useGameStore.getState().closePanel() : openPanelFromGame('menu'))}
      // Өнгөний хувьсагчийг (--t-*) товч өөрт нь өгнө: товч самбараас гадна байдаг тул
      style={NEW_LAB_MENU ? themeStyle(theme) : undefined}
      className={`focus-ring pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full ${BUTTON_COLOR} shadow-hud transition hover:scale-105 active:scale-95`}
    >
      <span className="flex w-6 flex-col gap-[5px]" aria-hidden>
        <span className={`h-[3px] rounded-full ${LINE_COLOR}`} />
        <span className={`h-[3px] rounded-full ${LINE_COLOR}`} />
        <span className={`h-[3px] rounded-full ${LINE_COLOR}`} />
      </span>
    </button>
  );
}
