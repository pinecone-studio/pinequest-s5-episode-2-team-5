import { CatalystJourney } from '@/components/revision-hub/catalyst-journey';
import { useSession } from '@/context/session';

export default function CatalystLessonScreen() {
  const { user } = useSession();
  return user ? <CatalystJourney key={user.id} userId={user.id} /> : null;
}
