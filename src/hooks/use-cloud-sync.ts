import { useEffect, useEffectEvent, useRef, useState } from 'react';

/** Quick taps and typing reach Supabase as one sync. */
const SYNC_DELAY_MS = 1500;
export type CloudStatus = 'local' | 'syncing' | 'synced';

/**
 * Debounced Supabase sync for progress kept on the device. `send` uploads the latest local copy
 * and applies the server's merge. Runs never overlap: a change made during one is sent right after,
 * and a change still waiting when the screen closes is sent anyway. 'local' means not synced
 * yet or offline; the device copy is always kept.
 */
export function useCloudSync(send: () => Promise<void>) {
  const [cloud, setCloud] = useState<CloudStatus>('local');
  const running = useRef(false), again = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sync = async () => {
    clearTimeout(timer.current); timer.current = undefined;
    if (running.current) { again.current = true; return; }
    running.current = true; setCloud('syncing');
    try {
      await send(); setCloud('synced');
    } catch {
      setCloud('local');
    } finally {
      running.current = false;
      if (again.current) { again.current = false; void sync(); }
    }
  };
  const schedule = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void sync(), SYNC_DELAY_MS);
  };
  const flushOnLeave = useEffectEvent(() => { if (timer.current !== undefined) void sync(); });
  useEffect(() => () => flushOnLeave(), []);
  return { cloud, sync, schedule };
}
