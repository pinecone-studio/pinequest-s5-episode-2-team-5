import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { emptyElementMemory, restoreElementMemory, type ElementMemory } from '@/lib/periodic-learning';

const pending = new Map<string, Promise<void>>();
export function useElementMemory(userId: string) {
  const key = `chemquest.periodic.memory.v1.${userId}`;
  const [memory, setMemory] = useState(emptyElementMemory);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<'load' | 'save' | null>(null);
  const [attempt, setAttempt] = useState(0);
  const current = useRef(emptyElementMemory());
  const generation = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    void (async () => {
      try {
        await pending.get(key)?.catch(() => undefined);
        const raw = await AsyncStorage.getItem(key);
        const data = restoreElementMemory(raw ? JSON.parse(raw) : null);
        if (active) { current.current = data; setMemory(data); setReady(true); setError(null); }
      } catch { if (active) setError('load'); }
    })();
    return () => { active = false; mounted.current = false; };
  }, [key, attempt]);
  const persist = (data: ElementMemory) => {
    const id = ++generation.current;
    setError(null);
    const task = (pending.get(key) ?? Promise.resolve()).catch(() => undefined).then(() => AsyncStorage.setItem(key, JSON.stringify(data)));
    pending.set(key, task);
    void task.then(() => { if (mounted.current && generation.current === id) setError(null); }, () => {
      if (mounted.current && generation.current === id) setError('save');
    }).finally(() => { if (pending.get(key) === task) pending.delete(key); });
  };
  const update = (fn: (p: ElementMemory) => ElementMemory) => {
    if (!ready) return;
    const next = fn(current.current); current.current = next; setMemory(next); persist(next);
  };
  return { memory, ready, error,
    retry: () => error === 'load' ? setAttempt((n) => n + 1) : persist(current.current),
    rate: (z: number, known: boolean) => update((p) => ({ ...p, known: known ? [...new Set([...p.known, z])] : p.known.filter((n) => n !== z) })),
    record: (z: number, correct: boolean) => update((p) => ({ ...p, attempts: { ...p.attempts, [z]: { correct: (p.attempts[z]?.correct ?? 0) + Number(correct), total: (p.attempts[z]?.total ?? 0) + 1 } } })),
  };
}
