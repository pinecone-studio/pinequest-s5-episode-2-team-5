/**
 * Lab event bus: reactions, measurements, safety incidents and bench actions are emitted
 * here once, and the announcer (toast, notebook, robot), the experiment guide and the
 * session report all listen.
 */
export interface LabEvent {
  /** e.g. 'ppt:CuOH2', 'gas:CO2', 'measure:temp', 'flame:Na', 'break', 'wear:goggles'. */
  key: string;
  title?: string;
  detail?: string;
  /** Measured value (°C, pH, mL …) when the event is a measurement. */
  value?: number;
  itemId?: string;
  /** Logged and counted but not shown as a toast. */
  quiet?: boolean;
}

type Listener = (e: LabEvent) => void;
const listeners = new Set<Listener>();

export function emitLab(e: LabEvent): void {
  listeners.forEach((l) => l(e));
}

export function onLab(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
