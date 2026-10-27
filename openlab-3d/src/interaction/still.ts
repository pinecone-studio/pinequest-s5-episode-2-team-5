/**
 * Items resting in a drawer or cabinet are "still": models skip live effects (bubbles,
 * steam, flames, colour fades) and per-frame work, and their holder draws them merged into a
 * few meshes and recomputes their world matrices only when something changes (see
 * StillGroup in StoredItems.tsx).
 */
import { createContext, useContext, useLayoutEffect, type DependencyList } from 'react';

export interface StillHolder {
  /** Something re-rendered: refresh world matrices for a few frames. */
  wake: () => void;
  /** What is drawn changed: draw the originals until the merged copy is rebuilt. */
  changed: () => void;
}

export const StillContext = createContext<StillHolder | null>(null);

export function useStill(): boolean {
  return useContext(StillContext) !== null;
}

/** After every render of the caller, let its holder refresh the frozen world matrices. */
export function useWakeHolder(): void {
  const still = useContext(StillContext);
  useLayoutEffect(() => {
    still?.wake();
  });
}

/** Tell the holder its merged copy is out of date whenever `deps` change. */
export function useHolderChanged(deps: DependencyList): void {
  const still = useContext(StillContext);
  useLayoutEffect(() => {
    still?.changed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
