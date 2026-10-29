/**
 * Лаборатори доторх цэс — ☰ товчоор нээгдэх самбарын ДОТОРХ хэсэг (шинэ загвар).
 * Самбарын гадна хүрээ (зүүнээс гулсаж орох, хаах) MenuPanel.tsx-д хэвээр үлдсэн.
 *
 * Дэлгэцүүд: Нүүр → Горим сонгох → Анги сонгох → Бүлэг сонгох → Туршилтын карт.
 * ⚙ товч ямар ч дэлгэцээс Тохиргоо/Удирдлага дэлгэцийг нээнэ, "← Буцах" нь өмнө байсан дэлгэц рүү буцаана.
 */
import { useState } from 'react';
import { sounds } from '../utils/sounds';
import { themeStyle } from '../theme/themes';
import { GRADE_SUMMARIES, chaptersForGrade } from './catalogCount';
import type { TextbookExperiment } from './chapterBuild';
import { ChapterScreen } from './ChapterScreen';
import { ExperimentScreen } from './ExperimentScreen';
import { GradeScreen } from './GradeScreen';
import { HomeScreen } from './HomeScreen';
import { ModeScreen } from './ModeScreen';
import { SettingsScreen } from './SettingsScreen';
import { guideFor, hasDemo, startTextbookExperiment, watchTextbookDemo } from './startExperiment';
import { useTheme } from './useTheme';

/** Хуучин цэсний таб (шинэ цэсэнд бүх дэлгэц бэлэн болсон тул одоо ашиглагдахгүй; MenuPanel-ийн хуучин цэсэнд үлдсэн) */
export type LegacyTab = 'experiments' | 'settings' | 'controls';

type Screen = 'home' | 'mode' | 'grade' | 'chapter' | 'experiment' | 'settings';

/** Дээд мөрийн голд харуулах жижиг бичиг (одоо хаана байгааг заана) */
function screenTitle(screen: Screen, grade: number): string {
  switch (screen) {
    case 'home':
      return 'Нүүр';
    case 'mode':
      return 'Горим сонгох';
    case 'grade':
      return 'Хичээлийн туршилт · Анги';
    case 'chapter':
      return `${grade}-р анги · Бүлэг`;
    case 'experiment':
      return 'Туршилт';
    case 'settings':
      return 'Тохиргоо';
  }
}

/** "Буцах" товчны очих дэлгэц */
const PREVIOUS: Partial<Record<Screen, Screen>> = {
  mode: 'home',
  grade: 'mode',
  chapter: 'grade',
  experiment: 'chapter',
};

interface LabMenuProps {
  /** Цэсийг хааж лаборатори руу буцна */
  onClose: () => void;
  /** Хуучин цэсийг тухайн таб дээр нээнэ. Шинэ цэсэнд бүх дэлгэц бэлэн болсон тул одоо дуудагдахгүй */
  onLegacy?: (tab: LegacyTab) => void;
}

/** Дээд мөрийн товч (хуруугаар дарахад ≥44px өндөртэй) */
const BAR_BUTTON =
  'inline-flex h-11 items-center justify-center rounded-2xl bg-t-card text-lg font-bold transition active:bg-t-card-active focus-visible:outline focus-visible:outline-4 focus-visible:outline-[color:var(--t-accent)]';

export function LabMenu({ onClose }: LabMenuProps) {
  const [screen, setScreen] = useState<Screen>('home');
  // ⚙ дарахад аль дэлгэцээс орсныг хадгална — "Буцах" тэр дэлгэц рүү буцаана
  const [settingsFrom, setSettingsFrom] = useState<Screen>('home');
  const theme = useTheme();
  // Сонгосон анги, мөн нээлттэй бүлэг (Буцахад хэвээр байхын тулд энд хадгална). Анх нээхэд эхний бүлэг нээлттэй.
  const [grade, setGrade] = useState(7);
  const [openChapter, setOpenChapter] = useState<number | null>(0);
  // Бүлгээс сонгосон туршилт (Туршилтын картад)
  const [experiment, setExperiment] = useState<TextbookExperiment | null>(null);
  const previous = screen === 'settings' ? settingsFrom : PREVIOUS[screen];

  const go = (next: Screen) => {
    sounds.play('ui');
    setScreen(next);
  };

  return (
    <div className="theme-screen flex min-h-0 flex-1 flex-col font-body" style={themeStyle(theme)}>
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-1 pt-4">
        {/* Нүүр дэлгэцэд "Буцах" байхгүй — оронд нь цэсийг хаах товч */}
        {previous ? (
          <button type="button" onClick={() => go(previous)} className={`${BAR_BUTTON} gap-1 justify-self-start px-3 text-base`}>
            <span aria-hidden="true">←</span> Буцах
          </button>
        ) : (
          <button type="button" aria-label="Цэсийг хаах" onClick={onClose} className={`${BAR_BUTTON} w-11 justify-self-start`}>
            ✕
          </button>
        )}
        <span className="text-sm text-t-ink-soft">{screenTitle(screen, grade)}</span>
        <button
          type="button"
          aria-label="Тохиргоо"
          aria-current={screen === 'settings' ? 'page' : undefined}
          onClick={() => {
            if (screen === 'settings') return;
            setSettingsFrom(screen);
            go('settings');
          }}
          className={`${BAR_BUTTON} w-11 justify-self-end`}
        >
          ⚙︎
        </button>
      </header>

      {screen === 'home' && <HomeScreen onStart={() => setScreen('mode')} />}
      {screen === 'mode' && (
        <ModeScreen
          onLessons={() => go('grade')}
          // Чөлөөт лаборатори: лаб дотор байгаа тул цэсийг хаагаад чөлөөтэй үргэлжлүүлнэ
          onFree={onClose}
        />
      )}
      {screen === 'grade' && (
        <GradeScreen
          grades={GRADE_SUMMARIES}
          onPick={(picked) => {
            setGrade(picked);
            setOpenChapter(0);
            go('chapter');
          }}
        />
      )}
      {screen === 'chapter' && (
        <ChapterScreen
          grade={grade}
          chapters={chaptersForGrade(grade)}
          openIndex={openChapter}
          // Нэг удаад нэг бүлэг: нээлттэй бүлгийг дахин дарвал хаагдана, өөрийг дарвал өмнөх нь хаагдана
          onToggle={(index) => setOpenChapter((current) => (current === index ? null : index))}
          onPick={(picked) => {
            setExperiment(picked);
            go('experiment');
          }}
        />
      )}
      {screen === 'settings' && <SettingsScreen />}
      {screen === 'experiment' && experiment && (
        <ExperimentScreen
          experiment={experiment}
          guided={guideFor(experiment) !== undefined}
          onStart={() => startTextbookExperiment(experiment)}
          onDemo={hasDemo(experiment) ? () => watchTextbookDemo(experiment) : undefined}
        />
      )}
    </div>
  );
}
