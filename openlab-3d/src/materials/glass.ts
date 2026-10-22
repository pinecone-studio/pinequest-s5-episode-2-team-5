import { useMemo } from 'react';
import { Color, DoubleSide, MeshPhysicalMaterial, type Material } from 'three';
import { QUALITY_PRESETS, useSettingsStore } from '../store/useSettingsStore';

/**
 * Laboratory glass: MeshPhysicalMaterial with transmission 1, roughness 0.05, ior 1.5,
 * thickness 0.02 and a faint blue-green tint. On the Low preset (no transmission pass)
 * it falls back to plain alpha blending.
 */
const cache = new Map<string, Material>();

/** Transmissive material → its cheap alpha-blended twin (used for distance LOD). */
export const transmissionTwins = new Map<Material, Material>();
/** Reverse lookup: cheap twin → transmissive original. */
export const transmissionOriginals = new Map<Material, Material>();

export function registerTransmissionTwin(transmissive: Material, cheap: Material): void {
  transmissionTwins.set(transmissive, cheap);
  transmissionOriginals.set(cheap, transmissive);
}

export function glassMaterial(transmission: boolean, tint = '#eaf6f8', frosted = 0): Material {
  const key = `${transmission}-${tint}-${frosted}`;
  let m = cache.get(key);
  if (!m) {
    m = transmission
      ? new MeshPhysicalMaterial({
          color: new Color(tint),
          transmission: 1,
          roughness: 0.05 + frosted,
          metalness: 0,
          ior: 1.5,
          thickness: 0.02,
          specularIntensity: 1,
          envMapIntensity: 1.2,
          side: DoubleSide,
          transparent: false,
        })
      : new MeshPhysicalMaterial({
          color: new Color(tint),
          roughness: 0.08 + frosted,
          metalness: 0,
          transparent: true,
          opacity: 0.22 + frosted * 0.6,
          envMapIntensity: 1.4,
          clearcoat: 1,
          depthWrite: false,
          side: DoubleSide,
        });
    cache.set(key, m);
    if (transmission) registerTransmissionTwin(m, glassMaterial(false, tint, frosted));
  }
  return m;
}

const decorCache = new Map<string, Material>();
/** Alpha glass for decorative stock (never upgraded to transmission by the glass LOD). */
export function decorGlass(tint = '#eef8fb'): Material {
  let m = decorCache.get(tint);
  if (!m) {
    m = new MeshPhysicalMaterial({ color: new Color(tint), roughness: 0.08, transparent: true, opacity: 0.24, envMapIntensity: 1.4, clearcoat: 1, depthWrite: false, side: DoubleSide });
    decorCache.set(tint, m);
  }
  return m;
}

/** Large architectural panes (windows, door panels): never use transmission — too costly. */
export const windowGlass = new MeshPhysicalMaterial({
  color: '#dcefff',
  roughness: 0.05,
  metalness: 0,
  transparent: true,
  opacity: 0.16,
  envMapIntensity: 1.5,
  clearcoat: 1,
  depthWrite: false,
  side: DoubleSide,
});

export function useTransmission(): boolean {
  return useSettingsStore((s) => QUALITY_PRESETS[s.quality].transmission);
}

export function useGlass(tint?: string, frosted = 0): Material {
  const transmission = useTransmission();
  return useMemo(() => glassMaterial(transmission, tint, frosted), [transmission, tint, frosted]);
}
