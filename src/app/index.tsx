import { Redirect } from 'expo-router';

import { useSession } from '@/context/session';

export default function RootIndex() {
  const { user } = useSession();

  if (!user) return <Redirect href="/welcome" />;
  if (!user.location) return <Redirect href="/onboarding" />;
  return <Redirect href="/home" />;
}
