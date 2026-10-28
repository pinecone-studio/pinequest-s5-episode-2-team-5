/**
 * "Хичээлийн туршилт" сонголт (нээлтийн дэлгэц дээр): Анги → Бүлэг → Сэдэв → Туршилт.
 * Өгөгдөл нь лабын доторх цэстэй ижил: menu/catalogCount.ts → src/data/textbook-experiments/*.json.
 * Хөдөлгөөний class-ууд (wc-pop, wc-lift) WelcomeCard.tsx-ийн CSS дотор тодорхойлогдсон.
 */
import { GRADE_SUMMARIES, chaptersForGrade } from '../menu/catalogCount';
import type { TextbookExperiment } from '../menu/chapterBuild';

const INK = '#1C1A3A';
const MUTED = '#6E6A88';

interface Palette {
  main: string;
  shade: string;
  soft: string;
  dark: string;
  text: string;
}

// Анги бүрийн өнгө (дизайны самбараас)
const GRADE_COLORS: Record<number, Palette> = {
  7: { main: '#FF5C8A', shade: '#D93A68', soft: '#FFE6EE', dark: '#B0204F', text: '#3A0B1C' },
  8: { main: '#FF8A3D', shade: '#D9661C', soft: '#FFEEDF', dark: '#A64D0E', text: '#3A1A05' },
  9: { main: '#FFC93C', shade: '#D9A21C', soft: '#FFF6D8', dark: '#8A6400', text: '#3A2A00' },
  10: { main: '#2BC6A0', shade: '#14907A', soft: '#DDF7EF', dark: '#0E6F5D', text: '#06302A' },
  11: { main: '#3D8BFF', shade: '#1F66D6', soft: '#E1EDFF', dark: '#1B55B5', text: '#0A1F45' },
};

const paletteFor = (grade: number | null): Palette => GRADE_COLORS[grade ?? 7] ?? GRADE_COLORS[7];

/** "I. Бодисын төлөв" → "Бодисын төлөв" (дугаарыг тусад нь шошгонд харуулна) */
const chapterTitle = (name: string): string => name.replace(/^[IVXLC]+\.\s*/, '');

interface LessonPickerProps {
  grade: number | null;
  /** Сонгосон бүлгийн дугаар (0-ээс эхэлнэ) */
  chapter: number | null;
  experiment: TextbookExperiment | null;
  onBack: () => void;
  onGrade: (grade: number) => void;
  onChapter: (index: number) => void;
  onExperiment: (experiment: TextbookExperiment) => void;
}

export function LessonPicker({ grade, chapter, experiment, onBack, onGrade, onChapter, onExperiment }: LessonPickerProps) {
  const palette = paletteFor(grade);
  const chapters = grade !== null ? chaptersForGrade(grade) : [];
  const current = chapter !== null ? chapters[chapter] : undefined;

  return (
    <section className="wc-pop" aria-labelledby="grade-h" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          className="wc-lift focus-ring"
          aria-label="Буцах"
          onClick={onBack}
          style={{ width: 48, height: 48, borderRadius: 16, border: 'none', background: '#F1EDFF', boxShadow: '0 4px 0 #DCD3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3F22D6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 id="grade-h" style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>
          Анги
        </h2>
      </div>

      {/* Анги: 7–11. JSON байхгүй анги "Удахгүй" гэж идэвхгүй харагдана */}
      <div role="group" aria-labelledby="grade-h" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))', gap: 12 }}>
        {GRADE_SUMMARIES.map(({ grade: n, available }) => {
          const p = paletteFor(n);
          const on = n === grade;
          return (
            <button
              key={n}
              type="button"
              className="wc-lift focus-ring"
              aria-pressed={available ? on : undefined}
              aria-disabled={!available || undefined}
              onClick={available ? () => onGrade(n) : undefined}
              style={{
                height: 100,
                borderRadius: 22,
                border: 'none',
                fontFamily: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                ...(!available
                  ? { background: '#F1EEF8', color: MUTED, boxShadow: '0 5px 0 #E2DEEE', cursor: 'not-allowed' }
                  : on
                    ? { background: p.main, color: p.text, boxShadow: `0 7px 0 ${p.shade}`, transform: 'translateY(-4px)', cursor: 'pointer' }
                    : { background: p.soft, color: p.dark, boxShadow: `0 5px 0 ${p.main}`, cursor: 'pointer' }),
              }}
            >
              <span style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 900, lineHeight: 1 }}>{n}</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>анги</span>
              {!available && <span style={{ fontSize: 12, fontWeight: 700 }}>Удахгүй</span>}
            </button>
          );
        })}
      </div>

      {/* Бүлэг */}
      {grade !== null && (
        <div className="wc-pop" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: palette.dark }}>Бүлэг</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
            {chapters.map((node, index) => {
              const on = index === chapter;
              return (
                <button
                  key={node.name}
                  type="button"
                  className="wc-lift focus-ring"
                  aria-pressed={on}
                  onClick={() => onChapter(index)}
                  style={{
                    minHeight: 72,
                    padding: '14px 16px',
                    borderRadius: 20,
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: INK,
                    ...(on
                      ? { background: palette.soft, border: `3px solid ${palette.main}`, boxShadow: `0 5px 0 ${palette.main}` }
                      : { background: '#FFFFFF', border: '3px solid #EDE8FF', boxShadow: '0 5px 0 #EDE8FF' }),
                  }}
                >
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 13,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 900,
                      ...(on ? { background: palette.main, color: palette.text } : { background: palette.soft, color: palette.dark }),
                    }}
                  >
                    {index + 1}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{chapterTitle(node.name)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Сэдэв → Туршилт */}
      {current && (
        <div className="wc-pop" style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 22, borderRadius: 24, background: '#1F1B4D', boxShadow: '0 6px 0 #110E30' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#FFC93C' }}>Туршилт</h3>
          {current.sections.map((section) => (
            <div key={section.name} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#E6E0FF' }}>{section.name}</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {section.experiments.map((item) => {
                  const on = experiment?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="wc-lift focus-ring"
                      aria-pressed={on}
                      onClick={() => onExperiment(item)}
                      style={{
                        minHeight: 52,
                        padding: '10px 20px 10px 16px',
                        borderRadius: 26,
                        border: 'none',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        textAlign: 'left',
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: 'pointer',
                        ...(on
                          ? { background: palette.main, color: palette.text, boxShadow: `0 5px 0 ${palette.shade}` }
                          : { background: '#FFFFFF', color: palette.dark, boxShadow: `0 5px 0 ${palette.main}55` }),
                      }}
                    >
                      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M9 3h6" />
                        <path d="M10 3v6.5L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9.5V3" />
                      </svg>
                      <span>{item.title}</span>
                      {item.page && (
                        <span
                          title="Сурах бичгийн хуудас"
                          style={{
                            flexShrink: 0,
                            borderRadius: 999,
                            padding: '2px 9px',
                            fontSize: 13,
                            fontWeight: 800,
                            ...(on ? { background: 'rgba(255,255,255,0.55)', color: palette.text } : { background: palette.soft, color: palette.dark }),
                          }}
                        >
                          х.{item.page}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
