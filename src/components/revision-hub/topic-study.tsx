import { PracticalInvestigation } from './practical-investigation';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { useRevision } from '@/context/revision';
import { getGlossary, getPack } from '@/data/revision-hub';
import { nextRevisionStep, topicStats } from '@/lib/revision-progress';
import { NoteBlock } from './note-block';
import { RichText } from './rich-text';
import { Flashcards, Quiz, StructuredQuestions } from './study-modes';
import { STUDY_TABS, StudyCard, StudyLink, StudyPage, openTopic, ui } from './study-ui';

export function TopicStudy({ topicId, tab }: { topicId: string; tab: string }) {
  const { progress, update, packId } = useRevision();
  const topic = getPack(packId).topics.find((t) => t.id === topicId);
  if (!topic || !STUDY_TABS.some(([id]) => id === tab)) return <StudyPage title="Сэдэв олдсонгүй"><GameButton title="Давтлагын нүүр" onPress={() => router.replace(packId === 'g7-chem' ? '/hub/g7-chem' : packId === 'g10-chem' ? '/hub/g10-chem' : packId === 'g9-chem' ? '/hub/g9-chem' : '/hub/g8-chem')}/></StudyPage>;
  const stats = topicStats(topic, progress);
  const next = nextRevisionStep(topic, progress);
  return <StudyPage title={`${topic.id} ${topic.title}`} subtitle={`Сурах бичиг х. ${topic.bookPages}`}>
    <View style={ui.row}>{STUDY_TABS.map(([id, label]) => <GameButton key={id} title={label} size="sm" variant={tab === id ? 'primary' : 'secondary'} onPress={() => router.replace({ pathname: packId === 'g7-chem' ? '/hub/g7-chem/topic/[topicId]/[tab]' : packId === 'g10-chem' ? '/hub/g10-chem/topic/[topicId]/[tab]' : packId === 'g9-chem' ? '/hub/g9-chem/topic/[topicId]/[tab]' : '/hub/g8-chem/topic/[topicId]/[tab]', params: { topicId, tab: id } })}/>)}</View>
    <AppText variant="heading">{topic.title}</AppText>
    {tab === 'notes' && <TopicTerms terms={topic.keyTerms} packId={packId}/>}
    {tab === 'notes' && topic.notes.map((note) => <StudyCard key={note.id}><AppText variant="heading">{note.title}</AppText>{note.blocks.map((block, i) => <NoteBlock key={i} block={block} pages={topic.bookPages}/>)}<GameButton title={progress.notes.includes(note.id) ? 'Уншсан ✓' : 'Уншсан гэж тэмдэглэх'} size="md" variant={progress.notes.includes(note.id) ? 'secondary' : 'primary'} disabled={progress.notes.includes(note.id)} onPress={() => update((p) => ({ ...p, notes: [...new Set([...p.notes, note.id])] }))}/></StudyCard>)}
    {tab === 'cards' && <Flashcards key={topic.id} cards={topic.flashcards}/>}
    {tab === 'quiz' && <Quiz key={topic.id} questions={topic.quiz} topicId={topic.id}/>}
    {tab === 'questions' && <StructuredQuestions questions={topic.questions}/>}
    {tab === 'prac' && <>
      <StudyCard><AppText>Эдгээр нь практикийн давтлагын заавар. 3D туршилтын автоматаар баталгаажсан гүйцэтгэл биш.</AppText></StudyCard>
      {topic.practicals.length===0 && <AppText>Энэ сэдэвт дугаарласан туршилт байхгүй. Тэмдэглэл, карт, асуултаар ойлголтоо бататгаарай.</AppText>}
      {topic.practicals.map((practical) => <StudyCard key={practical.id}>
        <AppText variant="heading">{practical.title}</AppText><AppText variant="caption">{practical.ref}</AppText><RichText>{practical.aim}</RichText>
        {practical.steps.map((step, i) => <RichText key={i}>{`${i + 1}. ${step}`}</RichText>)}
        <AppText variant="bodyStrong">Аюулгүй ажиллагаа</AppText><RichText>{practical.safety}</RichText>
        <PracticalInvestigation reviewed={progress.practicals.includes(practical.id)} practicalId={practical.id} expected={practical.result} onReviewed={() => update((p) => ({ ...p, practicals: [...new Set([...p.practicals, practical.id])] }))}/>
        {progress.practicals.includes(practical.id) && <AppText variant="caption">Өөрийн ажиглалт, дүгнэлтээ тэмдэглэсэн ✓</AppText>}
      </StudyCard>)}
    </>}
    <StudyCard><AppText variant="heading">Сэдвийн явц</AppText><AppText>{stats.notes}/{topic.notes.length} тэмдэглэл · {stats.cards}/{topic.flashcards.length} мэддэг карт · Тест {stats.quiz}% · Асуулт {stats.marks}/{stats.totalMarks}</AppText>{next && <GameButton title={`Дараагийн алхам: ${STUDY_TABS.find(([id]) => id === next)![1]}`} size="md" variant="secondary" onPress={() => openTopic(topic.id, next, packId)}/>}</StudyCard>
  </StudyPage>;
}

function TopicTerms({ terms, packId }: { terms: string[]; packId: 'g7-chem' | 'g8-chem' | 'g9-chem' | 'g10-chem' }) {
  const [selected, setSelected] = useState<string | null>(null);
  const normalize = (text: string) => text.normalize('NFC').trim().toLocaleLowerCase('mn');
  const entry = getGlossary(packId).find((item) => selected && normalize(item.term) === normalize(selected));
  return <StudyCard><AppText variant="heading">Түлхүүр нэр томьёо</AppText><View style={ui.row}>{terms.map((term) => <StudyLink key={term} title={term} onPress={() => setSelected(selected === term ? null : term)}/>)}</View>{entry && <RichText>{entry.definition}</RichText>}</StudyCard>;
}
