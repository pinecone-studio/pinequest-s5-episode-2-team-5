/** Actual transferred volume, separate from completion and chemical consumption. */
import { create } from 'zustand';
export interface TransferMeasure { source: string; target: string; label: string; ml: number }
export const useMeasurements = create<{ transfers: TransferMeasure[] }>(() => ({ transfers: [] }));
export function recordTransfer(source: string, target: string, label: string, ml: number) {
  if (!Number.isFinite(ml) || ml <= 0) return;
  useMeasurements.setState((s) => {
    const previous = s.transfers.find((r) => r.source === source && r.target === target);
    return { transfers: [...s.transfers.filter((r) => r !== previous), { source, target, label, ml: (previous?.ml ?? 0) + ml }] };
  });
}
export function clearMeasurements(ids?: string[]) {
  useMeasurements.setState((s) => ({ transfers: ids ? s.transfers.filter((r) => !ids.includes(r.source) && !ids.includes(r.target)) : [] }));
}
