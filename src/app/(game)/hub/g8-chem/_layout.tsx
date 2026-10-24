import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { RevisionProvider } from '@/context/revision';
import { useSession } from '@/context/session';

export default function RevisionLayout() {
  const { user } = useSession();
  return user ? <RevisionProvider key={user.id} userId={user.id}>
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.night }, animation: 'fade' }}/>
  </RevisionProvider> : null;
}
