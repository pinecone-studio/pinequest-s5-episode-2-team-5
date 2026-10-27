import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { Colors } from '@/constants/theme';
import { useRevision } from '@/context/revision';
import { fetchStudyAdvice, type StudyAdvice } from '@/services/advisor';
import { StudyCard, openTopic } from './study-ui';

type Status = 'idle' | 'loading' | 'ready' | 'error';

/**
 * "What should I study next": Pip reads this grade's synced progress (wrong answers, red
 * objectives, unfinished notes and cards) and suggests up to three topics. Only on request,
 * since each new suggestion uses the student's daily AI limit.
 */
export function StudyAdvisor() {
  const { packId } = useRevision();
  const [status, setStatus] = useState<Status>('idle');
  const [advice, setAdvice] = useState<StudyAdvice[]>([]);

  const load = async (refresh: boolean) => {
    setStatus('loading');
    try {
      setAdvice(await fetchStudyAdvice(packId, refresh));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  return <StudyCard>
    <AppText variant="label" color={Colors.lime}>Pip-ийн зөвлөгөө</AppText>
    <AppText variant="heading">Дараа нь юуг давтах вэ?</AppText>
    {status === 'idle' && <>
      <AppText>Pip таны алдсан асуулт, үнэлгээ, явцыг харж давтах сэдвийг санал болгоно.</AppText>
      <GameButton title="Зөвлөгөө авах" size="md" onPress={() => void load(false)}/>
    </>}
    {status === 'loading' && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <ActivityIndicator color={Colors.lime}/><AppText>Зөвлөгөө бэлдэж байна…</AppText>
    </View>}
    {status === 'error' && <>
      <AppText>Одоогоор зөвлөгөө авч чадсангүй. Интернэтээ шалгаад дахин оролдоно уу.</AppText>
      <GameButton title="Дахин оролдох" size="sm" variant="secondary" onPress={() => void load(false)}/>
    </>}
    {status === 'ready' && !advice.length && <AppText>Энэ ангийн бүх сэдвийг сайн давтсан байна. Холимог тестээр өөрийгөө шалгаарай!</AppText>}
    {status === 'ready' && advice.map((item) => <StudyCard key={item.topicId}>
      <AppText variant="bodyStrong">{item.title}</AppText>
      {!!item.why && <AppText variant="caption">{item.why}</AppText>}
      <AppText>{item.action}</AppText>
      <GameButton title="Нээх" size="sm" onPress={() => openTopic(item.topicId, item.tab, packId)}/>
    </StudyCard>)}
    {status === 'ready' && advice.length > 0 && <GameButton title="Шинэ зөвлөгөө" size="sm" variant="secondary" onPress={() => void load(true)}/>}
  </StudyCard>;
}
