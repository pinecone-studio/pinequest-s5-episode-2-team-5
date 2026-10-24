import { create } from 'zustand';
import type { Object3D } from 'three';

/** UI commands for the real worktop camera. These never change apparatus placement. */
export const useBenchView = create<{
  selected: string | null;
  level: 'table' | 'detail';
  distance: number;
  moving: boolean;
  inspecting: boolean;
}>()(() => ({ selected: null, level: 'table', distance: 1.2, moving: false, inspecting: false }));

export const benchView = {
  heldObject: (): Object3D | null => null,
  focus: (_id: string) => {},
  inspect: (_id: string) => {},
  back: () => {},
  reaction: (_id: string) => {},
  table: () => {},
  overview: () => {},
  zoom: (_factor: number) => {},
  setDistance: (_distance: number) => {},
  pan: (_x: number, _z: number) => {},
};
