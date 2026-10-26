import type { User } from '@/types';

export function fallbackUser(
  id: string,
  email: string,
  metadata: Record<string, unknown>,
  createdAt?: string,
): User {
  const nickname = typeof metadata.nickname === 'string' && metadata.nickname.trim()
    ? metadata.nickname.trim()
    : email.split('@')[0] || 'Scientist';
  return {
    id,
    email,
    nickname,
    classId: 'beginner',
    xp: 0,
    completed: {},
    createdAt: createdAt ?? new Date().toISOString(),
    location: null,
    locationStatus: 'unavailable',
  };
}

export function rootDestination(
  signedIn: boolean,
  locationStatus: User['locationStatus'] | null,
): '/welcome' | '/onboarding' | '/home' {
  if (!signedIn) return '/welcome';
  return locationStatus === 'incomplete' ? '/onboarding' : '/home';
}
