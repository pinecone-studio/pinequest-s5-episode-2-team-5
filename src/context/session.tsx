import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { applyLessonResult, type CompletionResult } from '@/lib/progress';
import * as auth from '@/services/auth';
import type { RegionType, Stars, User } from '@/types';

interface SessionContextValue {
  user: User | null;
  isLoading: boolean;
  signUp: (input: auth.SignUpInput) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeLesson: (lessonId: string, stars: Stars) => Promise<CompletionResult>;
  updateRegion: (regionType: RegionType, regionName: string, subregionName: string) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    auth
      .restoreSession()
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

  const value: SessionContextValue = {
    user,
    isLoading,
    signUp: async (input) => setUser(await auth.signUp(input)),
    signIn: async (email, password) => setUser(await auth.signIn(email, password)),
    signOut: async () => {
      await auth.signOut();
      setUser(null);
    },
    completeLesson: async (lessonId, stars) => {
      if (!user) throw new Error('Not signed in');
      const next = applyLessonResult(user, lessonId, stars);
      setUser(await auth.saveUser(next.user));
      return next.result;
    },
    updateRegion: async (regionType, regionName, subregionName) => {
      if (!user) throw new Error('Not signed in');
      setUser(await auth.updateUserRegion(user, regionType, regionName, subregionName));
    },
  };

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
