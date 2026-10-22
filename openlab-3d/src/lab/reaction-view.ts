import { create } from 'zustand';
import type { ReactionObservation } from '../chemistry/reaction-view';
export interface VesselReaction extends ReactionObservation { vesselId: string; until: number; episode: number }
export const useReactionView = create<{ vessels: Record<string, VesselReaction> }>()(() => ({ vessels: {} }));
let episode = 0;
export function publishReaction(vesselId: string, observation: ReactionObservation, duration = 650) {
  if (!(observation.rate > 0) || !Number.isFinite(observation.rate)) return;
  const now = performance.now(), current = useReactionView.getState().vessels;
  const prior = current[vesselId];
  const same = prior?.key === observation.key && prior.until > now;
  const vessels = Object.fromEntries(Object.entries(current).filter(([, r]) => r.until > now - 15000));
  vessels[vesselId] = { ...observation, vesselId, until: now + duration, episode: same ? prior.episode : ++episode };
  useReactionView.setState({ vessels });
}
export function clearReactionViews() { useReactionView.setState({ vessels: {} }); }
