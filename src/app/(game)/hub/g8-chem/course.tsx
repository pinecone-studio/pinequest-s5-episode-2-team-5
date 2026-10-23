import { router } from 'expo-router';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { StudyCard, StudyPage, openTopic } from '@/components/revision-hub/study-ui';
import { getPack } from '@/data/revision-hub';
import { useRevision } from '@/context/revision';
import { topicStats } from '@/lib/revision-progress';
export default function CourseScreen(){
  const {progress}=useRevision();
  return <StudyPage title="Хими 8 · Сурах бичгийн зам" subtitle="11 сэдэв · өөрийн хэмнэлээр">
    <StudyCard><AppText>Ойлголтоо сур → таамагла → туршиж хэмж → нотолгоогоор тайлбарла. Сэдвүүдийг түгжихгүй; өмнөх XP хичээлүүд тусдаа хэвээр.</AppText><GameButton title="Судалгааны бүх багаж" size="md" variant="secondary" onPress={()=>router.push('/hub/g8-chem/investigations')}/></StudyCard>
    {getPack('g8-chem').topics.map((topic)=>{const stats=topicStats(topic,progress);return <StudyCard key={topic.id}><AppText variant="heading">{topic.id}. {topic.title}</AppText><AppText variant="caption">х.{topic.bookPages} · {stats.notes}/{topic.notes.length} тэмдэглэл · {stats.practicals}/{topic.practicals.length} судалгаа тэмдэглэсэн</AppText>{topic.objectives.map((o)=><AppText key={o.id}>• {o.text}</AppText>)}<GameButton title="Ойлголтоо сур" size="md" onPress={()=>openTopic(topic.id,'notes')}/><GameButton title="Таамаглаад турш" size="md" variant="secondary" onPress={()=>openTopic(topic.id,'prac')}/></StudyCard>;})}
  </StudyPage>;
}
