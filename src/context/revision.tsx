import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { Colors } from '@/constants/theme';
import { emptyRevision, restoreRevision, type RevisionProgress } from '@/lib/revision-progress';

interface RevisionContext {
  packId: 'g8-chem' | 'g9-chem';
  progress: RevisionProgress;
  update: (change: (current: RevisionProgress) => RevisionProgress) => void;
  saved: boolean;
  error: boolean;
  retry: () => void;
}
const Context = createContext<RevisionContext | null>(null);
const queues = new Map<string, Promise<void>>();

export function RevisionProvider({ userId, children, packId = 'g8-chem' }: { userId: string; children: ReactNode; packId?: 'g8-chem' | 'g9-chem' }) {
  const key = `chemquest.revision.${packId === 'g9-chem' ? 'g9' : 'g8'}.v1.${userId}`;
  const current = useRef(emptyRevision());
  const [progress, setProgress] = useState(emptyRevision);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState(false);
  const revision = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    void (async () => {
      try {
        await queues.get(key)?.catch(() => undefined);
        const raw = await AsyncStorage.getItem(key);
        const state = restoreRevision(raw ? JSON.parse(raw) : null);
        if (active) { current.current = state; setProgress(state); setReady(true); setLoadError(false); }
      } catch { if (active) setLoadError(true); }
    })();
    return () => { active = false; mounted.current = false; };
  }, [key, attempt]);

  const persist = (state: RevisionProgress) => {
    setSaved(false); setError(false);
    const id = ++revision.current;
    const task = (queues.get(key) ?? Promise.resolve()).catch(() => undefined)
      .then(() => AsyncStorage.setItem(key, JSON.stringify(state)));
    queues.set(key, task);
    void task.then(() => {
      if (mounted.current && revision.current === id) setSaved(true);
    }, () => {
      if (mounted.current && revision.current === id) setError(true);
    }).finally(() => { if (queues.get(key) === task) queues.delete(key); });
  };
  const update = (change: (state: RevisionProgress) => RevisionProgress) => {
    const next = change(current.current);
    current.current = next; setProgress(next); persist(next);
  };
  if (!ready) return <View style={{ padding: 24, gap: 16 }}>{loadError ? <><AppText>Явцыг ачаалж чадсангүй.</AppText><GameButton title="Дахин оролдох" onPress={() => setAttempt(attempt + 1)}/></> : <ActivityIndicator color={Colors.lime}/>}</View>;
  return <Context value={{ packId, progress, update, saved, error, retry: () => persist(current.current) }}>{children}</Context>;
}
export function useRevision() {
  const value = use(Context);
  if (!value) throw new Error('RevisionProvider is required');
  return value;
}
