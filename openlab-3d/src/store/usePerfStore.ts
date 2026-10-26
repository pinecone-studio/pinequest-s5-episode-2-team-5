import { create } from 'zustand';

/** Live state of the frame-rate governor (resolution scale and ladder level), for the FPS readout. */
export const usePerfStore = create<{ dpr: number; level: number; levels: number }>()(() => ({ dpr: 1, level: 0, levels: 1 }));
