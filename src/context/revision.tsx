import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { Colors } from '@/constants/theme';
import { emptyRevision, type RevisionProgress } from '@/lib/revision-progress';
import { changedRevision, mergeRevision, restoreStored, sameRevision, snapshot, type RevisionSnapshot } from '@/lib/revision-sync';
import { applyRemotePack } from '@/data/revision-hub';
import { supabase } from '@/lib/supabase';
import { syncRevision } from '@/services/learning';

/** local: not yet synced this session · offline: the last cloud sync failed and will be retried. */
export type CloudStatus = 'local' | 'syncing' | 'synced' | 'offline';
interface RevisionContext {
  packId: 'g7-chem' | 'g8-chem' | 'g9-chem' | 'g10-chem';
  progress: RevisionProgress;
  update: (change: (current: RevisionProgress) => RevisionProgress) => void;
  saved: boolean;
  error: boolean;
  cloud: CloudStatus;
  retry: () => void;
  contentSource: 'bundled' | 'supabase';
}
const Context = createContext<RevisionContext | null>(null);
const queues = new Map<string, Promise<void>>();
const SYNC_DELAY = 1500;

export function RevisionProvider({ userId, children, packId = 'g8-chem' }: { userId: string; children: ReactNode; packId?: 'g7-chem' | 'g8-chem' | 'g9-chem' | 'g10-chem' }) {
  const key = `chemquest.revision.${packId.slice(0, -5)}.v1.${userId}`;
  const current = useRef<RevisionSnapshot>(snapshot());
  const [progress, setProgress] = useState(emptyRevision);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState(false);
  const [cloud, setCloud] = useState<CloudStatus>('local');
  const [contentSource, setContentSource] = useState<'bundled' | 'supabase'>('bundled');
  const revision = useRef(0);
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncing = useRef(false);
  const dirty = useRef(false);

  const persist = (state: RevisionSnapshot) => {
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

  // One request at a time; changes made meanwhile trigger a follow-up sync. The server merge
  // is idempotent, so resending after a failure or from another device never loses work.
  const sync = async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (syncing.current) { dirty.current = true; return; }
    syncing.current = true; dirty.current = false;
    if (mounted.current) setCloud('syncing');
    try {
      const remote = await syncRevision(userId, packId, current.current);
      const merged = mergeRevision(current.current, remote);
      if (!sameRevision(merged, current.current)) {
        current.current = merged;
        if (mounted.current) { setProgress(merged.state); persist(merged); }
      }
      if (mounted.current) setCloud('synced');
    } catch {
      if (mounted.current) setCloud('offline');
    } finally {
      syncing.current = false;
      if (dirty.current) schedule();
    }
  };
  const schedule = (delay = SYNC_DELAY) => {
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void sync(); }, delay);
  };

  useEffect(() => {
    mounted.current = true;
    let active = true;
    void (async () => {
      try {
        await queues.get(key)?.catch(() => undefined);
        const raw = await AsyncStorage.getItem(key);
        const state = restoreStored(raw ? JSON.parse(raw) : null);
        if (active) { current.current = state; setProgress(state.state); setReady(true); setLoadError(false); schedule(0); }
      } catch { if (active) setLoadError(true); }
    })();
    return () => { active = false; mounted.current = false; };
    // The sync helpers only read refs, so re-running on their identity would add nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  // Push pending changes when the app is backgrounded or the hub closes.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active' && dirty.current) void sync();
    });
    return () => {
      subscription.remove();
      if (dirty.current) void sync();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    let active = true;
    if (packId !== 'g8-chem' && packId !== 'g9-chem') {
      void Promise.resolve().then(() => { if (active) setContentSource('bundled'); });
      return () => { active = false; };
    }
    const packKey = packId === 'g9-chem' ? 'g9-chem' : 'mn-g8-chemistry';
    void supabase.rpc('get_revision_content_pack', { requested_pack_id: packKey })
      .then(({ data, error: loadContentError }) => {
        if (!active) return;
        const accepted = !loadContentError && data && applyRemotePack(packId, data);
        setContentSource(accepted ? 'supabase' : 'bundled');
      })
      .then(undefined, () => { if (active) setContentSource('bundled'); });
    return () => { active = false; };
  }, [packId]);

  const update = (change: (state: RevisionProgress) => RevisionProgress) => {
    const next = changedRevision(current.current, change(current.current.state));
    current.current = next; setProgress(next.state); persist(next); schedule();
  };
  const retry = () => { persist(current.current); void sync(); };
  if (!ready) return <View style={{ padding: 24, gap: 16 }}>{loadError ? <><AppText>Явцыг ачаалж чадсангүй.</AppText><GameButton title="Дахин оролдох" onPress={() => setAttempt(attempt + 1)}/></> : <ActivityIndicator color={Colors.lime}/>}</View>;
  return <Context value={{ packId, progress, update, saved, error, cloud, contentSource, retry }}>{children}</Context>;
}
export function useRevision() {
  const value = use(Context);
  if (!value) throw new Error('RevisionProvider is required');
  return value;
}
