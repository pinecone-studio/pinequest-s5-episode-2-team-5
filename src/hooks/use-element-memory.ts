import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { applyRemoteKnown, changedKnown, outgoingKnown, restoreMemorySync, type MemorySync } from '@/lib/element-sync';
import { emptyElementMemory, restoreElementMemory, type ElementMemory } from '@/lib/periodic-learning';
import { syncElementMemory } from '@/services/learning';
import { useCloudSync } from './use-cloud-sync';

const pending = new Map<string, Promise<void>>();
export function useElementMemory(userId: string) {
  const key = `chemquest.periodic.memory.v1.${userId}`;
  // This install's id and when each element was last rated, for merging with other devices.
  const syncKey = `${key}.sync`;
  const [memory, setMemory] = useState(emptyElementMemory);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<'load' | 'save' | null>(null);
  const [attempt, setAttempt] = useState(0);
  const current = useRef(emptyElementMemory());
  const synced = useRef<MemorySync>({ device: '', clocks: {} });
  const generation = useRef(0);
  const mounted = useRef(true);
  const persist = (data: ElementMemory) => {
    const id = ++generation.current, stamps = synced.current;
    setError(null);
    const task = (pending.get(key) ?? Promise.resolve()).catch(() => undefined)
      .then(() => AsyncStorage.multiSet([[key, JSON.stringify(data)], [syncKey, JSON.stringify(stamps)]]));
    pending.set(key, task);
    void task.then(() => { if (mounted.current && generation.current === id) setError(null); }, () => {
      if (mounted.current && generation.current === id) setError('save');
    }).finally(() => { if (pending.get(key) === task) pending.delete(key); });
  };
  const { sync, schedule } = useCloudSync(async () => {
    const { device, clocks } = synced.current;
    const remote = await syncElementMemory(userId, device, outgoingKnown(current.current, clocks), current.current.attempts);
    if (!mounted.current) return;
    // Merge into the latest local copy: ratings made while the request was out are kept and sent next.
    const merged = applyRemoteKnown(current.current, synced.current.clocks, remote);
    if (JSON.stringify(merged) === JSON.stringify({ memory: current.current, clocks: synced.current.clocks })) return;
    current.current = merged.memory; synced.current = { device, clocks: merged.clocks };
    setMemory(merged.memory); persist(merged.memory);
  });
  const syncOnLoad = useEffectEvent(() => { void sync(); });
  useEffect(() => {
    mounted.current = true;
    let active = true;
    void (async () => {
      try {
        await pending.get(key)?.catch(() => undefined);
        const [raw, rawSync] = await Promise.all([AsyncStorage.getItem(key), AsyncStorage.getItem(syncKey)]);
        const data = restoreElementMemory(raw ? JSON.parse(raw) : null);
        const saved = rawSync ? JSON.parse(rawSync) : null, stored = restoreMemorySync(saved);
        // A new install id is stored before its first upload, so its counts never go up under two ids.
        if (saved?.device !== stored.device) await AsyncStorage.setItem(syncKey, JSON.stringify(stored));
        if (active) { current.current = data; synced.current = stored; setMemory(data); setReady(true); setError(null); syncOnLoad(); }
      } catch { if (active) setError('load'); }
    })();
    return () => { active = false; mounted.current = false; };
  }, [key, syncKey, attempt]);
  const update = (fn: (p: ElementMemory) => ElementMemory) => {
    if (!ready) return;
    const before = current.current, next = fn(before);
    synced.current = { ...synced.current, clocks: changedKnown(before, next, synced.current.clocks) };
    current.current = next; setMemory(next); persist(next); schedule();
  };
  return { memory, ready, error,
    retry: () => {
      if (error === 'load') { setAttempt((n) => n + 1); return; }
      persist(current.current); schedule();
    },
    rate: (z: number, known: boolean) => update((p) => ({ ...p, known: known ? [...new Set([...p.known, z])] : p.known.filter((n) => n !== z) })),
    record: (z: number, correct: boolean) => update((p) => ({ ...p, attempts: { ...p.attempts, [z]: { correct: (p.attempts[z]?.correct ?? 0) + Number(correct), total: (p.attempts[z]?.total ?? 0) + 1 } } })),
  };
}
