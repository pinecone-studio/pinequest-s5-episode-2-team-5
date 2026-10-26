import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { RevisionProvider } from '@/context/revision';
import { useSession } from '@/context/session';

export default function RevisionLayout() {
  const { user } = useSession();
  return user ? <RevisionProvider key={`g7:${user.id}`} userId={user.id} packId="g7-chem">
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.night }, animation: 'fade' }}/>
  </RevisionProvider> : null;
}
