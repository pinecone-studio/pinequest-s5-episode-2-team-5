import { useState } from 'react';
import { getPack } from '@/data/revision-hub';
import { useRevision } from '@/context/revision';
import { router, useLocalSearchParams } from 'expo-router';
import { GameButton } from '@/components/ui/game-button';
import { AppText } from '@/components/ui/app-text';
import { PracticalInvestigation } from '@/components/revision-hub/practical-investigation';
import { StudyCard, StudyPage } from '@/components/revision-hub/study-ui';
import { INVESTIGATIONS, investigationById } from '@/lib/textbook-investigations';
export default function InvestigationsScreen(){
  const {packId}=useRevision();
  const [showEquipment, setShowEquipment] = useState(false);
  const grade=packId==='g7-chem'?7:packId==='g10-chem'?10:packId==='g9-chem'?9:8;
  const {id}=useLocalSearchParams<{id?:string}>();
  const selected=typeof id==='string'&&investigationById(id)?.grade===grade?investigationById(id):undefined;
  return <StudyPage title={selected?.title??'Сурах бичгийн судалгаанууд'} subtitle="Таамагла · хэмж · харьцуул · тайлбарла">
    {selected?<StudyCard><AppText variant="caption">Хими {grade} · х.{selected.bookPages}</AppText><AppText>{selected.method?.map((step,i)=>`${i+1}. ${step}`).join('\n')}</AppText><PracticalInvestigation key={selected.id} id={selected.id}/><GameButton title="Бүх судалгааг харах" size="md" variant="secondary" onPress={()=>router.setParams({id:''})}/></StudyCard>:<>
      <StudyCard><AppText>Ширээний туршилтууд өмнөх багаж, цутгах удирдлагатай. Виртуал багажууд хялбаршуулсан загварын харьцуулалт өгнө; бодит хэмжилт гэж үзэхгүй.</AppText><GameButton title={showEquipment ? 'Судалгааны жагсаалт' : 'Багажийн лавлах'} size="md" variant="secondary" onPress={()=>setShowEquipment(!showEquipment)}/></StudyCard>
      {showEquipment ? getPack(packId).lab.apparatus.map((item)=><StudyCard key={item.id}><AppText variant="heading">{item.name}</AppText><AppText>{item.use}</AppText><AppText variant="caption">Сэдэв {item.topic}</AppText></StudyCard>) : INVESTIGATIONS.filter((x)=>x.grade===grade).map((x)=><StudyCard key={x.id}><AppText variant="heading">{x.title}</AppText><AppText variant="caption">х.{x.bookPages} · {x.mode==='model'?'Виртуал судалгааны багаж':'OpenLab ширээний туршилт'}</AppText><AppText>{x.prompt}</AppText><GameButton title="Таамаглаж эхлэх" size="md" onPress={()=>router.setParams({id:x.id})}/></StudyCard>)}
    </>}
  </StudyPage>;
}
