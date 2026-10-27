import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Colors } from '@/constants/theme';
import { useRevision } from '@/context/revision';
import { getPack } from '@/data/revision-hub';
import { nextRevisionStep, topicStats } from '@/lib/revision-progress';
import { StudyAdvisor } from './study-advisor';
import { StudyCard, StudyLink, StudyPage, openReference, openTopic } from './study-ui';

export function RevisionHome() {
  const pack = getPack('g8-chem');
  const { progress } = useRevision();
  const next = pack.topics.find((topic) => nextRevisionStep(topic, progress));
  return <StudyPage title="Давтлагын төв" subtitle="Хими 8 • Бүлэг, сэдвээр суралцах" home>
    <StudyCard>
      <AppText variant="label" color={Colors.lime}>Тэмдэглэл • Карт • Тест • Асуулт</AppText>
      <AppText variant="title">Өөрийн хурдаар, сэдэв бүрээр</AppText>
      <AppText>11 сэдэв · 40 тэмдэглэл · 106 флэшкарт · 79 тест · 33 асуулт</AppText>
      <AppText>Эхлээд тэмдэглэлээ уншаад, картаар давтаж, тест болон онооны схемээр мэдлэгээ шалгаарай.</AppText>
    </StudyCard>
    {next && <StudyCard><AppText variant="heading">Дараагийн алхам</AppText><AppText>{next.id} · {next.title}</AppText><GameButton title="Давтлагаа үргэлжлүүлэх" size="md" onPress={() => openTopic(next.id, nextRevisionStep(next, progress) ?? 'notes')}/></StudyCard>}
    <StudyAdvisor/>
    <StudyCard>
      <AppText variant="heading">Давтах ба лавлах</AppText>
      {[
        ['review', 'Давтах карт, алдсан тест'], ['mixed', 'Холимог тест'], ['tables', 'Лавлах хүснэгтүүд'],
        ['glossary', 'Нэр томьёо'], ['periodic', 'Үелэх хүснэгт'], ['tools', 'Сургалтын хэрэгслүүд'], ['checklist', 'Суралцах зорилтууд'],
        ['search', 'Агуулгаас хайх'], ['errata', 'Сурах бичгийн засвар'], ['progress', 'Миний явц'],
      ].map(([id, title]) => <StudyLink key={id} title={title} onPress={() => openReference(id)}/>)}
    </StudyCard>
    {pack.chapters.map((chapter) => <StudyCard key={chapter.id}>
      <AppText variant="label" color={Colors.lime}>Бүлэг {chapter.num}</AppText>
      <AppText variant="heading">{chapter.title}</AppText><AppText>{chapter.summary}</AppText>
      {chapter.topicIds.map((id) => {
        const topic = pack.topics.find((t) => t.id === id)!;
        const stats = topicStats(topic, progress);
        return <StudyCard key={id}><StudyLink title={`${id} ${topic.title}`} detail={`${topic.notes.length} тэмдэглэл · ${topic.flashcards.length} карт · ${topic.quiz.length} тест · х. ${topic.bookPages}`} onPress={() => openTopic(id)}/><ProgressBar progress={stats.completion}/><AppText variant="caption">Явц {Math.round(stats.completion * 100)}%</AppText></StudyCard>;
      })}
    </StudyCard>)}
  </StudyPage>;
}
