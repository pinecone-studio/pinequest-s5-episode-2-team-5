import { useLocalSearchParams } from 'expo-router';
import { RevisionReference } from '@/components/revision-hub/revision-reference';
export default function ReferenceScreen() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  return <RevisionReference key={reference} reference={reference}/>;
}
