/**
 * "Нүүр" дэлгэц: ChemQuest лого, колбо, гарчиг, туршилтын тоо, том "Туршилтаа эхлэх" товч.
 * Туршилтын тоо JSON файлуудаас автоматаар тоологдоно (catalogCount.ts).
 */
import { sounds } from '../utils/sounds';
import { FlaskArt } from './art';
import { TEXTBOOK_EXPERIMENT_COUNT } from './catalogCount';

export function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="scrollbar-thin flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-6 pb-8 pt-2 text-center">
      <h1 className="font-heading text-4xl font-extrabold leading-none tracking-tight">
        Chem<span className="text-t-accent">Quest</span>
      </h1>
      {/* Өндрийг дэлгэцийн өндөрт тохируулна: нам дэлгэцтэй утсан дээр колбо багасна */}
      <FlaskArt className="aspect-[260/300] h-[min(30dvh,230px)] w-auto" />
      <h2 className="font-heading text-2xl font-extrabold leading-tight">Виртуал химийн лаборатори</h2>
      <p className="rounded-full bg-t-card px-4 py-2 text-sm">7–11-р ангийн сурах бичгийн {TEXTBOOK_EXPERIMENT_COUNT} туршилт</p>
      <button
        type="button"
        onClick={() => {
          sounds.play('ui');
          onStart();
        }}
        className="mt-2 min-h-14 rounded-2xl bg-t-accent px-8 font-heading text-lg font-extrabold text-t-accent-ink shadow-[0_6px_0_rgba(0,0,0,0.22)] transition active:translate-y-[3px] active:shadow-[0_3px_0_rgba(0,0,0,0.22)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        ▶ Туршилтаа эхлэх
      </button>
    </div>
  );
}
