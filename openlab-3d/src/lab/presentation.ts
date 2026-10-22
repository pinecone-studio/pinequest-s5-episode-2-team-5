/** Transient overlays; do not extend the shared Mode / Panel contract. */
import { create } from 'zustand';
import type { ReactionObservation } from '../chemistry/reaction-view';
export const usePresentation = create<{
    modal: 'molecules' | 'success' | null;
    reaction: ReactionObservation | null;
    experiment: string | null;
    celebrated: string[];
}>()(() => ({ modal: null, reaction: null, experiment: null, celebrated: [] }));
export function closePresentation() { usePresentation.setState({ modal: null }); }
export function resetPresentation(id?: string) {
    usePresentation.setState((s) => ({ modal: null, reaction: null, experiment: null, celebrated: id ? s.celebrated.filter((x) => x !== id) : [] }));
}
