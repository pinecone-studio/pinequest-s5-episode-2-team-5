import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { newJourney, type JourneyProgress } from '@/lib/catalyst-journey';
import { changedJourney, mergeJourney, restoreJourneySnapshot } from '@/lib/catalyst-sync';
import type { Clocks } from '@/lib/field-clocks';
import { syncJourney } from '@/services/learning';
import { useCloudSync } from './use-cloud-sync';

// Shared across mounts so returning from the lab cannot read ahead of pending writes.
const queues = new Map<string, Promise<void>>();
export function useCatalystJourney(userId: string) {
  const key = `chemquest.revision.catalyst.v1.${userId}`;
  // Change times per field, so the newest edit wins across devices.
  const clockKey = `${key}.clocks`;
  const [progress, setProgress] = useState(newJourney);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const latest = useRef(newJourney());
  const clocks = useRef<Clocks>({});
  const revision = useRef(0);
  const alive = useRef(true);

  const save = (next: JourneyProgress) => {
    setProgress(next);
    setSaveStatus('saving');
    const current = ++revision.current, stamps = clocks.current;
    const write = (queues.get(key) ?? Promise.resolve()).catch(() => undefined)
      .then(() => AsyncStorage.multiSet([[key, JSON.stringify(next)], [clockKey, JSON.stringify(stamps)]]));
    queues.set(key, write);
    void write.then(() => {
      if (alive.current && current === revision.current) setSaveStatus('saved');
    }, () => {
      if (alive.current && current === revision.current) setSaveStatus('error');
    }).finally(() => {
      if (queues.get(key) === write) queues.delete(key);
    });
  };
  const { cloud, sync, schedule } = useCloudSync(async () => {
    const remote = await syncJourney(userId, 'catalyst', { state: latest.current, clocks: clocks.current });
    if (!alive.current) return;
    // Merge into the latest local copy: edits made while the request was out are kept and sent next.
    const local = { state: latest.current, clocks: clocks.current }, merged = mergeJourney(local, remote);
    if (JSON.stringify(merged) === JSON.stringify(local)) return;
    latest.current = merged.state; clocks.current = merged.clocks; save(merged.state);
  });
  const syncOnLoad = useEffectEvent(() => { void sync(); });

  useEffect(() => {
    alive.current = true;
    let active = true;
    void (async () => {
      try {
        await queues.get(key)?.catch(() => undefined);
        const [raw, rawClocks] = await Promise.all([AsyncStorage.getItem(key), AsyncStorage.getItem(clockKey)]);
        const local = restoreJourneySnapshot({ state: raw ? JSON.parse(raw) : null, clocks: rawClocks ? JSON.parse(rawClocks) : {} });
        if (active) {
          latest.current = local.state; clocks.current = local.clocks;
          setProgress(local.state);
          setLoadError(false);
          setReady(true);
          syncOnLoad();
        }
      } catch {
        if (active) setLoadError(true);
      }
    })();
    return () => { active = false; alive.current = false; };
  }, [key, clockKey, loadAttempt]);

  const persist = (next: JourneyProgress) => {
    clocks.current = changedJourney({ state: latest.current, clocks: clocks.current }, next).clocks;
    latest.current = next; save(next); schedule();
  };
  return { progress, ready, loadError, saveStatus, cloud, update: persist,
    retrySave: () => persist(progress), retryLoad: () => setLoadAttempt((attempt) => attempt + 1) };
}
