import { create } from 'zustand';
import type { ReactionObservation } from '../chemistry/reaction-view';
export interface VesselReaction extends ReactionObservation { vesselId: string; until: number; episode: number }
export const useReactionView = create<{ vessels: Record<string, VesselReaction> }>()(() => ({ vessels: {} }));
let episode = 0;
export function publishReaction(vesselId: string, observation: ReactionObservation, duration = 650) {
  if ((!observation.info && !(observation.rate > 0)) || observation.rate < 0 || !Number.isFinite(observation.rate)) return;
  const now = performance.now(), current = useReactionView.getState().vessels;
  const prior = current[vesselId];
  if (observation.info && !observation.key.startsWith('mixing:') && prior?.key.startsWith('mixing:') && prior.until > now) return;
  const same = prior?.key === observation.key && prior.until > now;
  const vessels = Object.fromEntries(Object.entries(current).filter(([, r]) => r.until > now - 15000));
  vessels[vesselId] = { ...observation, vesselId, until: now + duration, episode: same ? prior.episode : ++episode };
  useReactionView.setState({ vessels });
}
export function clearReactionViews(ids?: string[]) { useReactionView.setState((s) => ({ vessels: ids ? Object.fromEntries(Object.entries(s.vessels).filter(([id]) => !ids.includes(id))) : {} })); }

/** Auto lenses explain only ongoing chemistry; contents inspection remains explicit. */
export function automaticReaction(vessels: Record<string, VesselReaction>, now: number, dismissed: number | null, eligible: (id: string) => boolean): VesselReaction | null {
  return Object.values(vessels)
    .filter((r) => ((!r.info && r.rate > 0) || r.info && r.key.startsWith('mixing:')) && r.until > now && r.episode !== dismissed && eligible(r.vesselId))
    .sort((a, b) => b.until - a.until)[0] ?? null;
}
