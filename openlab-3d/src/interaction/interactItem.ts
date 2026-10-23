import { interactables } from './registry';

/** The same primary interaction and explicit grab command in every camera mode. */
export function interactItem(id: string, grab = false): boolean {
  const entry = interactables.get(id);
  if (!entry?.enabled) return false;
  const action = grab ? entry.onGrab : entry.onInteract;
  if (!action) return false;
  action();
  return true;
}
