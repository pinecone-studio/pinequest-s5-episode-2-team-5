import { create } from 'zustand';

/** UI commands for the real worktop camera. These never change apparatus placement. */
export const useBenchView = create<{
  selected: string | null;
  level: 'table' | 'detail';
  distance: number;
  moving: boolean;
}>()(() => ({ selected: null, level: 'table', distance: 0.8, moving: false }));

export const benchView = {
  focus: (_id: string) => {},
  table: () => {},
  overview: () => {},
  zoom: (_factor: number) => {},
  setDistance: (_distance: number) => {},
  pan: (_x: number, _z: number) => {},
};
