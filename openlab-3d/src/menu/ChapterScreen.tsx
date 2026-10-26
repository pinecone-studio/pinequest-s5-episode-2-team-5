/**
 * "Бүлэг сонгох" дэлгэц: тухайн ангийн бүлгүүд эвхэгддэг жагсаалтаар. Бүлэг дээр дарахад доор нь сэдвүүд,
 * сэдэв бүрийн доор туршилтууд гарна. Туршилт бүрт сурах бичгийн хуудас ("х.62"), онцлох бол ★.
 * Нэг удаад ЗӨВХӨН нэг бүлэг нээлттэй байна — аль нь нээлттэй гэдгийг LabMenu хадгална (Буцахад хэвээр байхын тулд).
 */
import { sounds } from '../utils/sounds';
import type { ChapterNode, TextbookExperiment } from './chapterBuild';

interface ChapterScreenProps {
  grade: number;
  chapters: ChapterNode[];
  /** Нээлттэй бүлгийн дугаар (0-ээс эхэлнэ), бүгд хаалттай бол null */
  openIndex: number | null;
  onToggle: (index: number) => void;
  onPick: (experiment: TextbookExperiment) => void;
}

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white';

export function ChapterScreen({ grade, chapters, openIndex, onToggle, onPick }: ChapterScreenProps) {
  return (
    <div className="scrollbar-thin flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-8 pt-2">
      <h1 className="font-heading text-2xl font-extrabold leading-tight">{grade}-р анги</h1>
      {chapters.map((chapter, index) => {
        const open = openIndex === index;
        const panelId = `chapter-panel-${index}`;
        return (
          <section key={chapter.name} className="rounded-3xl bg-t-card">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => {
                sounds.play('ui');
                onToggle(index);
              }}
              className={`flex min-h-[60px] w-full items-center gap-3 rounded-3xl p-4 text-left ${FOCUS}`}
            >
              <span aria-hidden="true" className={`text-lg font-bold transition-transform ${open ? 'rotate-90' : ''}`}>
                ›
              </span>
              <span className="flex-1 font-heading text-base font-bold leading-snug">{chapter.name}</span>
              <span className="shrink-0 text-sm text-t-ink-soft">{chapter.experimentCount} туршилт</span>
            </button>
            {open && (
              <div id={panelId} className="grid gap-2 px-3 pb-4">
                {chapter.sections.map((section) => (
                  <div key={section.name} className="grid gap-2">
                    <h2 className="mt-2 px-1 text-sm font-bold">{section.name}</h2>
                    {section.experiments.map((experiment) => (
                      <button
                        key={experiment.id}
                        type="button"
                        onClick={() => {
                          sounds.play('ui');
                          onPick(experiment);
                        }}
                        className={`flex min-h-[52px] w-full items-center gap-2 rounded-2xl bg-t-card-active px-4 py-3 text-left transition active:brightness-110 ${FOCUS}`}
                      >
                        {experiment.showcase && (
                          <span className="text-t-accent" role="img" aria-label="Онцлох туршилт">
                            ★
                          </span>
                        )}
                        <span className="flex-1 text-base leading-snug">{experiment.title}</span>
                        {experiment.page && <span className="shrink-0 text-sm text-t-ink-soft">х.{experiment.page}</span>}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
