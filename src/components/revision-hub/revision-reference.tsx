import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Colors, Fonts } from '@/constants/theme';
import { useRevision } from '@/context/revision';
import { getGlossary, getPack } from '@/data/revision-hub';
import { shuffled, topicStats } from '@/lib/revision-progress';
import { ReferenceTable } from './note-block';
import { PeriodicStudy } from './periodic-study';
import { RichText } from './rich-text';
import { AtomBuilder, Displacer } from './study-figures';
import { Flashcards, Quiz } from './study-modes';
import { StudyCard, StudyLink, StudyPage, openTopic, ui } from './study-ui';

const titles: Record<string, string> = {
  review: 'Давтах карт, алдсан тест', mixed: 'Холимог тест', tables: 'Лавлах хүснэгтүүд', glossary: 'Нэр томьёо',
  periodic: 'Үелэх хүснэгт', checklist: 'Суралцах зорилтууд', search: 'Агуулгаас хайх', errata: 'Сурах бичгийн засвар', progress: 'Миний явц', tools: 'Сургалтын хэрэгслүүд',
};
export function RevisionReference({ reference }: { reference: string }) {
  const pack = getPack('g8-chem');
  const { progress, update } = useRevision();
  const [query, setQuery] = useState('');
  // Freeze review decks for the session so marking a card/answer does not remove the active item.
  const [reviewCards] = useState(() => pack.topics.flatMap((t) => t.flashcards).filter((c) => progress.cards[c.id] !== 'known'));
  const [wrongQuestions] = useState(() => pack.topics.flatMap((t) => t.quiz).filter((q) => progress.wrong.includes(q.id)));
  const [mixed] = useState(() => shuffled(pack.topics.flatMap((t) => t.quiz)).slice(0, 10));
  const search = query.trim().toLocaleLowerCase('mn');
  return <StudyPage title={titles[reference] ?? 'Хуудас олдсонгүй'}>
    {reference === 'tables' && pack.tables.map((table) => <StudyCard key={table.id}><AppText variant="heading">{table.title}</AppText><ReferenceTable head={table.head} rows={table.rows}/><StudyLink title={`Сэдэв ${table.topicId}`} onPress={() => openTopic(table.topicId)}/></StudyCard>)}
    {reference === 'glossary' && getGlossary().map((entry) => <StudyCard key={entry.term}><AppText variant="heading">{entry.term}</AppText><RichText>{entry.definition}</RichText><StudyLink title={`Сэдэв ${entry.topicId}`} onPress={() => openTopic(entry.topicId)}/></StudyCard>)}
    {reference === 'errata' && pack.errata.map((entry, i) => <StudyCard key={i}><RichText>{entry.text}</RichText><AppText variant="caption">Сурах бичиг х. {pack.topics.find((t) => t.id === entry.topicId)?.bookPages} · Тэмдэглэл {entry.noteId}</AppText><StudyLink title={`Сэдэв ${entry.topicId}`} onPress={() => openTopic(entry.topicId)}/></StudyCard>)}
    {reference === 'checklist' && pack.topics.map((topic) => <StudyCard key={topic.id}><AppText variant="heading">{topic.id} {topic.title}</AppText>{topic.objectives.map((objective) => <View key={objective.id} style={{ gap: 10 }}><RichText>{objective.text}</RichText><View style={ui.row}>{([['red', 'Чадахгүй'], ['amber', 'Давтана'], ['green', 'Чадна']] as const).map(([rating, label]) => <GameButton key={rating} title={`${progress.ratings[objective.id] === rating ? '✓ ' : ''}${label}`} size="sm" variant={progress.ratings[objective.id] === rating ? 'primary' : 'secondary'} onPress={() => update((p) => ({ ...p, ratings: { ...p.ratings, [objective.id]: rating } }))}/>)}</View></View>)}</StudyCard>)}
    {reference === 'progress' && <><StudyCard><AppText>Тест, асуултын шилдэг дүн хадгалагдана. Картын «Мэднэ / Дахин» үнэлгээ хамгийн сүүлийн сонголтыг дагана. Практикийн үзүүлэлт нь зааврыг давтсан эсэхийг заана.</AppText></StudyCard>{pack.topics.map((topic) => {
      const s = topicStats(topic, progress);
      return <StudyCard key={topic.id}><StudyLink title={`${topic.id} ${topic.title}`} onPress={() => openTopic(topic.id)}/><ProgressBar progress={s.completion}/><AppText>Тэмдэглэл {s.notes}/{topic.notes.length} · Карт {s.cards}/{topic.flashcards.length} · Тест {s.quiz}% · Асуулт {s.marks}/{s.totalMarks} · Практик {s.practicals}/{topic.practicals.length}</AppText></StudyCard>;
    })}</>}
    {reference === 'review' && <><Flashcards cards={reviewCards}/><Quiz questions={wrongQuestions}/></>}
    {reference === 'mixed' && <Quiz questions={mixed}/>}
    {reference === 'periodic' && <PeriodicStudy/>}
    {reference === 'tools' && <><StudyCard><AppText variant="heading">Атом байгуулах</AppText><AtomBuilder/></StudyCard><StudyCard><AppText variant="heading">Халах урвалыг таамаглах</AppText><Displacer/></StudyCard></>}
    {reference === 'search' && <>
      <TextInput accessibilityLabel="Агуулгаас хайх" placeholder="Сэдэв, нэр томьёо, элемент…" placeholderTextColor={Colors.textDim} value={query} onChangeText={setQuery} style={{ padding: 16, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, color: Colors.text, fontFamily: Fonts.regular, fontSize: 16 }}/>
      {search.length < 2 ? <AppText>Дор хаяж 2 тэмдэгт бичнэ үү.</AppText> : <>
        {pack.topics.flatMap((topic) => [
          ...topic.notes.map((n) => ({ id: n.id, title: n.title, text: JSON.stringify(n), topicId: topic.id, tab: 'notes' as const })),
          ...topic.flashcards.map((c) => ({ id: c.id, title: c.front, text: JSON.stringify(c), topicId: topic.id, tab: 'cards' as const })),
          ...topic.questions.map((q) => ({ id: q.id, title: q.stem, text: JSON.stringify(q), topicId: topic.id, tab: 'questions' as const })),
          ...topic.quiz.map((q) => ({ id: q.id, title: q.question, text: JSON.stringify(q), topicId: topic.id, tab: 'quiz' as const })),
        ]).filter((item) => item.text.toLocaleLowerCase('mn').includes(search)).map((item) => <StudyLink key={item.id} title={item.title} detail={`Сэдэв ${item.topicId}`} onPress={() => openTopic(item.topicId, item.tab)}/>)}
        {getGlossary().filter((entry) => `${entry.term} ${entry.definition}`.toLocaleLowerCase('mn').includes(search)).map((entry) => <StudyCard key={entry.term}><AppText variant="heading">{entry.term}</AppText><RichText>{entry.definition}</RichText></StudyCard>)}
        {pack.elements.filter((e) => `${e.z} ${e.symbol} ${e.name}`.toLocaleLowerCase('mn').includes(search)).map((element) => <StudyCard key={element.z}><AppText>{element.z}. {element.symbol} · {element.name} · {element.mass}</AppText><AppText>{element.use}</AppText></StudyCard>)}
      </>}
    </>}
    {!titles[reference] && <AppText>Сэдвийн цэс эсвэл буцах товчоор давтлагын нүүрийг нээнэ үү.</AppText>}
  </StudyPage>;
}
