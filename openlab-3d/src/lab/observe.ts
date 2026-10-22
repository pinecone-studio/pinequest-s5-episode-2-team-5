/**
 * Watches what each vessel looks like and turns changes into lab events: a precipitate
 * appearing, an indicator flipping color, permanganate losing its color … A vessel is
 * "primed" with its state before the first change, so seeded contents are not announced.
 */
import { eventText, observationFlags } from '../chemistry/describe';
import { liquidMl, type Mixture } from '../chemistry/mixture';
import { emitLab } from './events';

const flagsById = new Map<string, Set<string>>();
const lastEmit = new Map<string, number>();

function emitOnce(itemId: string, key: string, cooldownMs = 6000, extra?: { value?: number }): void {
  const k = `${itemId}|${key}`;
  const now = performance.now();
  if (now - (lastEmit.get(k) ?? -1e9) < cooldownMs) return;
  lastEmit.set(k, now);
  const text = eventText(key);
  emitLab({ key, itemId, title: text?.title, detail: text?.detail, quiet: !text, value: extra?.value });
}

/** Remember a vessel's current state without announcing anything. */
export function prime(itemId: string, m: Mixture): void {
  if (!flagsById.has(itemId)) flagsById.set(itemId, observationFlags(m));
}

/** Compare with the last seen state and announce what is new. */
export function observe(itemId: string, m: Mixture): void {
  const prev = flagsById.get(itemId) ?? new Set<string>();
  const next = observationFlags(m);
  for (const f of next) if (!prev.has(f)) emitOnce(itemId, f);
  if (prev.has('color:MnO4') && !next.has('color:MnO4') && liquidMl(m) > 0.1) emitOnce(itemId, 'decolorize:MnO4');
  flagsById.set(itemId, next);
}

/** One-off notes from the simulation (gas, crystals, ignition …). */
export function note(itemId: string, key: string, cooldownMs = 8000, value?: number): void {
  emitOnce(itemId, key, cooldownMs, { value });
}

export function forget(itemId: string): void {
  flagsById.delete(itemId);
  for (const key of lastEmit.keys()) if (key.startsWith(`${itemId}|`)) lastEmit.delete(key);
}

export function resetObservations(): void {
  flagsById.clear();
  lastEmit.clear();
}
