import { heldApi, tablePointer } from './heldApi';
import { useBenchView } from '../experiments/nacl/view';
import { heldObjectId, describe, useSandbox } from '../experiments/nacl/sandbox';

/** A pointed receiver is a use target, distinct from the empty surface used for placement. */
export function benchUseTarget(): string | null {
  if (heldApi.target?.support) return null;
  const held = heldObjectId();
  const target = useSandbox.getState().hovered ?? (!tablePointer.active ? useBenchView.getState().selected : null);
  return held && target && held !== target && describe(target).capacity > 0 ? target : null;
}
