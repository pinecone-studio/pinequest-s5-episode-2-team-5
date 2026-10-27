/**
 * "Анги сонгох" дэлгэц: 2 баганатай том картууд (7, 8, 9, 10, 11-р анги). Сүүлийн карт сондгой үед бүтэн өргөнтэй.
 * Картан дээр том тоо, "N бүлэг · N туршилт". JSON байхгүй анги (одоогоор 11) "Удахгүй" гэж харагдаж, дарагдахгүй.
 * Сурагчийн өөрийн анги (myGrade) өгөгдвөл "МИНИЙ" шошготой, шар хүрээтэй болно.
 */
import { sounds } from '../utils/sounds';
import type { GradeSummary } from './gradeSummary';

interface GradeScreenProps {
  grades: GradeSummary[];
  /** Сурагчийн анги. Одоогоор аппаас мэдэгдэхгүй тул өгөхгүй бол шошго гарахгүй */
  myGrade?: number;
  onPick: (grade: number) => void;
}

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white';

export function GradeScreen({ grades, myGrade, onPick }: GradeScreenProps) {
  return (
    <div className="scrollbar-thin flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-8 pt-2">
      <h1 className="font-heading text-2xl font-extrabold leading-tight">Аль ангийн туршилт?</h1>
      <div className="grid grid-cols-2 gap-3">
        {grades.map((g, index) => {
          const mine = g.available && g.grade === myGrade;
          // Сондгой тоотой үед сүүлийн карт бүтэн өргөнтэй
          const wide = index === grades.length - 1 && grades.length % 2 === 1;
          const color = !g.available ? 'bg-t-card opacity-60' : mine ? 'bg-t-card-active ring-[3px] ring-t-accent' : 'bg-t-card active:bg-t-card-active';
          return (
            <button
              key={g.grade}
              type="button"
              disabled={!g.available}
              onClick={() => {
                sounds.play('ui');
                onPick(g.grade);
              }}
              className={`relative flex min-h-[132px] flex-col justify-between rounded-[28px] p-4 text-left transition ${color} ${wide ? 'col-span-2' : ''} ${FOCUS}`}
            >
              {mine && <span className="absolute right-3 top-3 rounded-full bg-t-accent px-2.5 py-1 font-heading text-[11px] font-extrabold text-t-accent-ink">МИНИЙ</span>}
              {!g.available && <span className="absolute right-3 top-3 rounded-full bg-t-card px-2.5 py-1 text-xs font-bold text-t-ink-soft">Удахгүй</span>}
              <span className="flex items-baseline gap-1">
                <span className="font-heading text-[44px] font-extrabold leading-none">{g.grade}</span>
                <span className="text-base font-bold">-р анги</span>
              </span>
              <span className="text-sm text-t-ink-soft">{g.available ? `${g.chapters} бүлэг · ${g.experiments} туршилт` : 'Бэлтгэж байна'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
