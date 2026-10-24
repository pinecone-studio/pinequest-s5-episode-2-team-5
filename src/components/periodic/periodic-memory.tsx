import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Colors } from '@/constants/theme';
import { getPack } from '@/data/revision-hub';
import type { Element } from '@/data/revision-hub/types';
import { useElementMemory } from '@/hooks/use-element-memory';
import { makeElementQuiz } from '@/lib/periodic-learning';
import { shuffled } from '@/lib/revision-progress';
import { FlippingCard } from '@/components/revision-hub/study-modes';
import { StudyCard, StudyChoice, ui } from '@/components/revision-hub/study-ui';
import { ElementSample, ShellDiagram } from './element-visuals';
import { PeriodicGrid } from './periodic-grid';

type Memory = ReturnType<typeof useElementMemory>;
export function PeriodicMemory({ userId }: { userId: string }) {
  const saved = useElementMemory(userId);
  const [scope, setScope] = useState<'first20' | 'all' | 'group'>('first20');
  const [group, setGroup] = useState(1);
  const [activity, setActivity] = useState<'cards' | 'quiz'>('cards');
  const [weak, setWeak] = useState(false);
  const all = getPack('g8-chem').elements;
  const pool = all.filter((e) => scope === 'all' || scope === 'first20' && e.z <= 20 || scope === 'group' && e.group === group);
  const deck = weak ? pool.filter((e) => !saved.memory.known.includes(e.z)) : pool;
  const known = pool.filter((e) => saved.memory.known.includes(e.z)).length;
  return <>
    <StudyCard><AppText variant="title">Бага багаар, эргэн санаж тогтооё</AppText><AppText>Эхний 20 элементийг нэр, тэмдэг, байрлал, электронтой нь холбоорой. Дараа нь бүлэг эсвэл бүх хүснэгт рүү тэлж болно.</AppText>
      <View style={ui.row}>{([['first20', 'Эхний 20'], ['group', 'Нэг бүлэг'], ['all', 'Бүх 118']] as const).map(([id, label]) => <GameButton key={id} title={label} size="sm" variant={scope === id ? 'primary' : 'secondary'} onPress={() => setScope(id)}/>)}</View>
      {scope === 'group' && <View style={ui.row}>{Array.from({ length: 18 }, (_, i) => <GameButton key={i} title={`${i + 1}`} size="sm" variant={group === i + 1 ? 'primary' : 'secondary'} onPress={() => setGroup(i + 1)}/>)}</View>}
      <View style={ui.row}><GameButton title="Цээжлэх карт" size="md" variant={activity === 'cards' ? 'primary' : 'secondary'} onPress={() => setActivity('cards')}/><GameButton title="Өөрийгөө шалгах" size="md" variant={activity === 'quiz' ? 'primary' : 'secondary'} onPress={() => setActivity('quiz')}/></View>
      <GameButton title={weak ? 'Бүх сонгосон элементийг харах' : 'Зөвхөн давтах элементүүд'} size="sm" variant="secondary" onPress={() => setWeak(!weak)}/>
      {saved.ready && <><AppText>Цээжилсэн: {known} / {pool.length}</AppText><ProgressBar progress={known / pool.length}/></>}
      <AppText variant="caption">Өөрийн үнэлгээ болон тестийн оролдлого таны бүртгэлээр энэ төхөөрөмжид хадгалагдана.</AppText>
    </StudyCard>
    {saved.error && <StudyCard><AppText>Явцыг {saved.error === 'load' ? 'уншиж' : 'хадгалж'} чадсангүй.</AppText><GameButton title="Дахин оролдох" size="sm" onPress={saved.retry}/></StudyCard>}
    {!saved.ready ? !saved.error && <ActivityIndicator color={Colors.lime}/> : !deck.length ? <StudyCard><AppText>Энэ багцын бүх элементийг «Мэднэ» гэж үнэлсэн байна. Бүх элементийг сонгоод өөрийгөө шалгаарай.</AppText></StudyCard> : activity === 'cards' ?
      <MemoryCards key={`${scope}:${group}:${weak}`} elements={deck} saved={saved}/> :
      <MemoryQuiz key={`${scope}:${group}:${weak}`} elements={deck} saved={saved}/>}
  </>;
}
function MemoryCards({ elements, saved }: { elements: Element[]; saved: Memory }) {
  const [deck, setDeck] = useState(elements);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const element = deck[index];
  const go = (next: number) => { setIndex(next); setFlipped(false); };
  return <>
    <View style={ui.row}><AppText variant="heading">Элемент {index + 1} / {deck.length}</AppText><GameButton title="Картуудыг холих" size="sm" variant="secondary" onPress={() => { setDeck(shuffled(deck)); go(0); }}/></View>
    <FlippingCard key={element.z} flipped={flipped} onFlip={() => setFlipped(!flipped)} card={{ id: `element:${element.z}`, front: `${element.symbol}\n\nНэр, дэс дугаар, бүлгийг санаж байна уу?`, back: `${element.name} · Z = ${element.z}\n${element.group === null ? 'f-блок' : `${element.group}-р бүлэг`} · ${element.period}-р үе\nЭлектрон: ${element.shells.join(', ')}` }}/>
    {flipped ? <>
      <View style={ui.row}><GameButton title="Дахин давтана" variant="secondary" size="md" onPress={() => { saved.rate(element.z, false); go((index + 1) % deck.length); }}/><GameButton title="Элементийг мэднэ" size="md" onPress={() => { saved.rate(element.z, true); go((index + 1) % deck.length); }}/></View>
      <StudyCard><ShellDiagram key={element.z} element={element}/><ElementSample element={element}/></StudyCard>
    </> : <StudyCard><AppText variant="caption">Хариултаа бодсоны дараа картаа эргүүлээрэй. Ар талд нь атомын зураг, хэрэглээний холбоос гарна.</AppText></StudyCard>}
    <View style={ui.row}><GameButton title="Өмнөх элемент" size="sm" variant="secondary" disabled={index === 0} onPress={() => go(index - 1)}/><GameButton title="Дараах элемент" size="sm" variant="secondary" disabled={index === deck.length - 1} onPress={() => go(index + 1)}/></View>
  </>;
}
function MemoryQuiz({ elements, saved }: { elements: Element[]; saved: Memory }) {
  const universe = getPack('g8-chem').elements;
  const [questions, setQuestions] = useState(() => makeElementQuiz(elements, universe));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const question = questions[index];
  const chosen = answers[question.id];
  const element = universe[question.z - 1];
  const missed = questions.filter((q) => answers[q.id] !== q.answer);
  const submit = (answer: string) => {
    if (chosen !== undefined) return;
    setAnswers({ ...answers, [question.id]: answer }); saved.record(question.z, answer === question.answer);
  };
  const restart = (pool: Element[]) => { setQuestions(makeElementQuiz(pool, universe)); setIndex(0); setAnswers({}); setDone(false); };
  if (done) return <StudyCard><AppText variant="title">Тестийн дүн: {questions.length - missed.length} / {questions.length}</AppText><AppText>Нэр, Z, бүлэг, давхраа, хүснэгтийн байрлалыг холбож давтлаа.</AppText>
    {missed.map((q) => <View key={q.id} style={{ gap: 6 }}><AppText variant="bodyStrong">{q.prompt}</AppText><AppText>{q.explanation}</AppText></View>)}
    {missed.length > 0 && <GameButton title="Алдсан элементүүдээ давтах" size="md" onPress={() => restart(missed.map((q) => universe[q.z - 1]))}/>}
    <GameButton title="Шинэ тест эхлэх" size="md" variant="secondary" onPress={() => restart(elements)}/>
  </StudyCard>;
  return <StudyCard><AppText variant="label" color={Colors.lime}>Санах дасгал · {index + 1} / {questions.length}</AppText><AppText variant="heading">{question.prompt}</AppText>
    {chosen === undefined ? question.kind === 'position' ? <><AppText variant="caption">Нэрийг нуусан хүснэгтээс зөв нүдийг дарна уу.</AppText><PeriodicGrid blank eligible={universe.map((e) => e.z)} onSelect={(z) => submit(String(z))}/></> :
      question.options.map((option) => <StudyChoice key={option} text={option} selected={false} onPress={() => submit(option)}/>) : <>
      <AppText color={chosen === question.answer ? Colors.success : Colors.gold}>{chosen === question.answer ? 'Зөв!' : 'Энэ элементийг дахин холбоод санаарай.'}</AppText>
      <AppText>{question.explanation}</AppText><PeriodicGrid mini selected={element}/><ShellDiagram key={element.z} element={element}/><ElementSample element={element}/>
      <GameButton title={index === questions.length - 1 ? 'Дүнгээ харах' : 'Дараагийн даалгавар'} size="md" onPress={() => index === questions.length - 1 ? setDone(true) : setIndex(index + 1)}/>
    </>}
  </StudyCard>;
}
