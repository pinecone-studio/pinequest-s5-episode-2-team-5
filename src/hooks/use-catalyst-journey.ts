import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { newJourney, restoreJourney, type JourneyProgress } from '@/lib/catalyst-journey';

// Shared across mounts so returning from the lab cannot read ahead of pending writes.
const queues = new Map<string, Promise<void>>();
export function useCatalystJourney(userId: string) {
  const key = `chemquest.revision.catalyst.v1.${userId}`;
  const [progress, setProgress] = useState(newJourney);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const revision = useRef(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    let active = true;
    void (async () => {
      try {
        await queues.get(key)?.catch(() => undefined);
        const raw = await AsyncStorage.getItem(key);
        if (active) {
          setProgress(restoreJourney(raw ? JSON.parse(raw) : null));
          setLoadError(false);
          setReady(true);
        }
      } catch {
        if (active) setLoadError(true);
      }
    })();
    return () => { active = false; alive.current = false; };
  }, [key, loadAttempt]);

  const persist = (next: JourneyProgress) => {
    setProgress(next);
    setSaveStatus('saving');
    const current = ++revision.current;
    const write = (queues.get(key) ?? Promise.resolve()).catch(() => undefined)
      .then(() => AsyncStorage.setItem(key, JSON.stringify(next)));
    queues.set(key, write);
    void write.then(() => {
      if (alive.current && current === revision.current) setSaveStatus('saved');
    }, () => {
      if (alive.current && current === revision.current) setSaveStatus('error');
    }).finally(() => {
      if (queues.get(key) === write) queues.delete(key);
    });
  };
  return { progress, ready, loadError, saveStatus, update: persist,
    retrySave: () => persist(progress), retryLoad: () => setLoadAttempt((attempt) => attempt + 1) };
}
