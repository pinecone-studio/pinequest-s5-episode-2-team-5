/** Per-vessel visual activity written by the simulation and read every frame by the models. */
export interface VesselFxState {
  /** 0..1 gas or boiling bubbles. */
  bubbles: number;
  /** 0..1 steam above the rim. */
  steam: number;
  /** 0..1 dark smoke (charring, burning). */
  smoke: number;
}

export const vesselFx = new Map<string, VesselFxState>();
