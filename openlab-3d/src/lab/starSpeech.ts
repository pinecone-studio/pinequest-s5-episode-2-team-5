import { create } from 'zustand';

/** The 3D scene owns the speech anchor; the HUD keeps the lesson and chat state. */
export const useStarSpeech = create<{ host: HTMLDivElement | null }>(() => ({ host: null }));
export const setStarSpeechHost = (host: HTMLDivElement | null) => useStarSpeech.setState({ host });

/** Layout refs updated by the scene without a React render on every animation frame. */
export const starSpeech = {
  panel: null as HTMLDivElement | null,
  interacting: false,
  dragging: false,
  position: null as { x: number; y: number } | null,
};

/** Keep the character and its grab target clear of the screen edges and top controls. */
export function clampStarPosition(x: number, y: number, width: number, height: number) {
  const marginX = Math.min(64, width / 2) / width;
  const top = Math.min(112, height / 2) / height;
  const bottom = Math.min(64, height / 2) / height;
  return { x: Math.max(marginX, Math.min(1 - marginX, x)), y: Math.max(top, Math.min(1 - bottom, y)) };
}
