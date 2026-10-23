import { useLocalSearchParams } from 'expo-router';
import { TopicStudy } from '@/components/revision-hub/topic-study';

export default function TopicScreen() {
  const { topicId, tab } = useLocalSearchParams<{ topicId: string; tab: string }>();
  return <TopicStudy key={`${topicId}:${tab}`} topicId={topicId} tab={tab}/>;
}
