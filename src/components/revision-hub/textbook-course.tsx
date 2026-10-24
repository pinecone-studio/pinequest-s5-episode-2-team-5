import { router } from 'expo-router';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { StudyCard, StudyPage, openTopic } from '@/components/revision-hub/study-ui';
import { getPack } from '@/data/revision-hub';
import { useRevision } from '@/context/revision';
import { topicStats } from '@/lib/revision-progress';
export default function CourseScreen(){
  const {progress,packId}=useRevision();
  return <StudyPage title={`Хими ${packId === 'g9-chem' ? 9 : 8} · Сурах бичгийн зам`} subtitle={`${getPack(packId).topics.length} сэдэв · өөрийн хэмнэлээр`}>
    <StudyCard>{packId==='g9-chem' && <AppText variant="caption">Хими IX · 2022 · 29 дугаарласан туршилт + 3 нэмэлт үзүүлэн. 32 OpenLab туршилт · зориулалтын багаж, бодис, хэмжилт.</AppText>}<AppText>Ойлголтоо сур → таамагла → туршиж хэмж → нотолгоогоор тайлбарла. Сэдвүүдийг түгжихгүй; өмнөх XP хичээлүүд тусдаа хэвээр.</AppText><GameButton title="Судалгааны бүх багаж" size="md" variant="secondary" onPress={()=>router.push(packId === 'g9-chem' ? '/hub/g9-chem/investigations' : '/hub/g8-chem/investigations')}/></StudyCard>
    {getPack(packId).topics.map((topic)=>{const stats=topicStats(topic,progress);return <StudyCard key={topic.id}><AppText variant="heading">{topic.id}. {topic.title}</AppText><AppText variant="caption">х.{topic.bookPages} · {stats.notes}/{topic.notes.length} тэмдэглэл · {stats.practicals}/{topic.practicals.length} судалгаа тэмдэглэсэн</AppText>{topic.objectives.map((o)=><AppText key={o.id}>• {o.text}</AppText>)}<GameButton title="Ойлголтоо сур" size="md" onPress={()=>openTopic(topic.id,'notes',packId)}/><GameButton title="Таамаглаад турш" size="md" variant="secondary" onPress={()=>openTopic(topic.id,'prac',packId)}/></StudyCard>;})}
  </StudyPage>;
}
