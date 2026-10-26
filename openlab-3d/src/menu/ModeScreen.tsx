/**
 * "Горим сонгох" дэлгэц: хоёр том карт.
 *  - Хичээлийн туршилт (нил ягаан, ном + колбо): сурах бичгийн туршилтыг Pip-тэй хамт хийнэ
 *  - Чөлөөт лаборатори (шар, тавиур дээрх өнгөт шил): бодисыг өөрөө холино
 */
import { sounds } from '../utils/sounds';
import { BookFlaskArt, TubesArt } from './art';

interface ModeScreenProps {
  onLessons: () => void;
  onFree: () => void;
}

/** Картын нийтлэг хэлбэр: хуруугаар дарахад том, дарахад бага зэрэг доош шахагдана */
const CARD =
  'flex min-h-[112px] w-full items-center gap-4 rounded-[28px] p-4 text-left shadow-[0_6px_0_rgba(0,0,0,0.2)] transition active:translate-y-[3px] active:shadow-[0_3px_0_rgba(0,0,0,0.2)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white';

export function ModeScreen({ onLessons, onFree }: ModeScreenProps) {
  const choose = (next: () => void) => () => {
    sounds.play('ui');
    next();
  };
  return (
    <div className="scrollbar-thin flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-8 pt-2">
      <h1 className="font-heading text-2xl font-extrabold leading-tight">Юу хийх вэ?</h1>

      <button type="button" onClick={choose(onLessons)} className={`${CARD} bg-t-primary text-t-primary-ink`}>
        <BookFlaskArt className="w-24 shrink-0" />
        <span>
          <span className="block font-heading text-xl font-extrabold leading-tight">Хичээлийн туршилт</span>
          <span className="mt-1 block text-sm leading-snug opacity-90">Сурах бичгийн туршилтыг Pip-тэй хамт алхам алхмаар хий</span>
        </span>
      </button>

      <button type="button" onClick={choose(onFree)} className={`${CARD} bg-t-accent text-t-accent-ink`}>
        <TubesArt className="w-24 shrink-0" />
        <span>
          <span className="block font-heading text-xl font-extrabold leading-tight">Чөлөөт лаборатори</span>
          <span className="mt-1 block text-sm leading-snug opacity-90">Бодисуудыг өөрөө холиж, юу болохыг үз</span>
        </span>
      </button>
    </div>
  );
}
