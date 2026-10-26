import { Redirect } from 'expo-router';

import { useSession } from '@/context/session';
import { rootDestination } from '@/lib/auth-profile-fallback';

export default function RootIndex() {
  const { user } = useSession();

  return <Redirect href={rootDestination(Boolean(user), user?.locationStatus ?? null)} />;
}
