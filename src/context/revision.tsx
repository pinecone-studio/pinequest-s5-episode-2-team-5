import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { Colors } from '@/constants/theme';
import { emptyRevision, type RevisionProgress } from '@/lib/revision-progress';
import { applyRemoteRevision, changedRevision, outgoingRevision, restoreSnapshot } from '@/lib/revision-sync';
import { applyRemotePack } from '@/data/revision-hub';
import { supabase } from '@/lib/supabase';
import { syncRevision } from '@/services/learning';

interface RevisionContext {
  packId: 'g7-chem' | 'g8-chem' | 'g9-chem' | 'g10-chem';
  progress: RevisionProgress;
  update: (change: (current: RevisionProgress) => RevisionProgress) => void;
  saved: boolean;
  error: boolean;
  retry: () => void;
  contentSource: 'bundled' | 'supabase';
  /** Supabase copy: 'local' until a sync succeeds or after one fails; the device copy is always kept. */
  cloud: 'local' | 'syncing' | 'synced';
}
const Context = createContext<RevisionContext | null>(null);
const queues = new Map<string, Promise<void>>();
/** Quick flashcard taps reach Supabase as one sync. */
const SYNC_DELAY_MS = 1500;

export function RevisionProvider({ userId, children, packId = 'g8-chem' }: { userId: string; children: ReactNode; packId?: 'g7-chem' | 'g8-chem' | 'g9-chem' | 'g10-chem' }) {
  const key = `chemquest.revision.${packId.slice(0, -5)}.v1.${userId}`;
  // Change times for cards and ratings, so the newest choice wins across devices.
  const clockKey = `${key}.clocks`;
  const current = useRef(emptyRevision());
  const clocks = useRef<Record<string, number>>({});
  const [progress, setProgress] = useState(emptyRevision);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState(false);
  const [contentSource, setContentSource] = useState<'bundled' | 'supabase'>('bundled');
  const [cloud, setCloud] = useState<RevisionContext['cloud']>('local');
  const revision = useRef(0);
  const mounted = useRef(true);
  const syncing = useRef(false), syncAgain = useRef(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  const persist = (state: RevisionProgress) => {
    setSaved(false); setError(false);
    const id = ++revision.current, stamps = clocks.current;
    const task = (queues.get(key) ?? Promise.resolve()).catch(() => undefined)
      .then(() => AsyncStorage.multiSet([[key, JSON.stringify(state)], [clockKey, JSON.stringify(stamps)]]));
    queues.set(key, task);
    void task.then(() => {
      if (mounted.current && revision.current === id) setSaved(true);
    }, () => {
      if (mounted.current && revision.current === id) setError(true);
    }).finally(() => { if (queues.get(key) === task) queues.delete(key); });
  };
  /** Sends this device's progress and keeps the server's merge (best scores, every read, newest ratings). */
  const sync = async () => {
    clearTimeout(syncTimer.current); syncTimer.current = undefined;
    if (syncing.current) { syncAgain.current = true; return; }
    syncing.current = true; setCloud('syncing');
    try {
      const remote = await syncRevision(userId, packId, outgoingRevision({ state: current.current, clocks: clocks.current }));
      if (!mounted.current) return;
      // Merge into the latest local state: changes made while the request was out are kept and sent next.
      const local = { state: current.current, clocks: clocks.current }, merged = applyRemoteRevision(local, remote);
      clocks.current = merged.clocks;
      if (JSON.stringify(merged) !== JSON.stringify(local)) { current.current = merged.state; setProgress(merged.state); persist(merged.state); }
      setCloud('synced');
    } catch {
      if (mounted.current) setCloud('local');
    } finally {
      syncing.current = false;
      if (syncAgain.current) { syncAgain.current = false; void sync(); }
    }
  };
  const scheduleSync = () => {
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => void sync(), SYNC_DELAY_MS);
  };
  const update = (change: (state: RevisionProgress) => RevisionProgress) => {
    const before = { state: current.current, clocks: clocks.current };
    const next = change(before.state);
    clocks.current = changedRevision(before, next).clocks;
    current.current = next; setProgress(next); persist(next); scheduleSync();
  };
  const retry = () => { persist(current.current); scheduleSync(); };
  const syncOnLoad = useEffectEvent(() => { void sync(); });
  // Changes made just before leaving the hub are still sent.
  const flushOnLeave = useEffectEvent(() => { if (syncTimer.current !== undefined) void sync(); });
  useEffect(() => {
    mounted.current = true;
    let active = true;
    void (async () => {
      try {
        await queues.get(key)?.catch(() => undefined);
        const [raw, rawClocks] = await Promise.all([AsyncStorage.getItem(key), AsyncStorage.getItem(clockKey)]);
        const local = restoreSnapshot({ state: raw ? JSON.parse(raw) : null, clocks: rawClocks ? JSON.parse(rawClocks) : {} });
        if (active) { current.current = local.state; clocks.current = local.clocks; setProgress(local.state); setReady(true); setLoadError(false); syncOnLoad(); }
      } catch { if (active) setLoadError(true); }
    })();
    return () => { active = false; mounted.current = false; };
  }, [key, clockKey, attempt]);
  useEffect(() => () => flushOnLeave(), []);
  if (!ready) return <View style={{ padding: 24, gap: 16 }}>{loadError ? <><AppText>Явцыг ачаалж чадсангүй.</AppText><GameButton title="Дахин оролдох" onPress={() => setAttempt(attempt + 1)}/></> : <ActivityIndicator color={Colors.lime}/>}</View>;
  return <Context value={{ packId, progress, update, saved, error, contentSource, cloud, retry }}>{children}</Context>;
}
export function useRevision() {
  const value = use(Context);
  if (!value) throw new Error('RevisionProvider is required');
  return value;
}
