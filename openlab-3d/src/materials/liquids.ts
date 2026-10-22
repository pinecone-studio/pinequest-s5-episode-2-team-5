import { useMemo } from 'react';
import { Color, MeshPhysicalMaterial, type Material } from 'three';
import { useTransmission } from './glass';

/**
 * Liquids are an inner, slightly smaller mesh with a flat meniscus top.
 *
 * Note on transmission: three.js renders transmissive materials by sampling a buffer of the
 * *opaque* scene, so a transmissive liquid inside transmissive glass disappears. With glass
 * transmission on (Medium/High) the liquid is therefore a glossy, opaque tinted material —
 * the glass refracts it like a real filled beaker. On Low (alpha-blended glass) the liquid
 * is a semi-transparent tint instead.
 */
const cache = new Map<string, Material>();

export function liquidMaterial(color: string, transmission: boolean): Material {
  const key = `${color}-${transmission}`;
  let m = cache.get(key);
  if (!m) {
    const c = new Color(color);
    m = transmission
      ? new MeshPhysicalMaterial({
          color: c,
          roughness: 0.08,
          metalness: 0,
          clearcoat: 1,
          clearcoatRoughness: 0.04,
          sheen: 0.4,
          sheenColor: c.clone().lerp(new Color('#ffffff'), 0.5),
          emissive: c,
          emissiveIntensity: 0.14,
        })
      : new MeshPhysicalMaterial({
          color: c,
          roughness: 0.15,
          transparent: true,
          opacity: 0.86,
          emissive: c,
          emissiveIntensity: 0.06,
        });
    cache.set(key, m);
  }
  return m;
}

export function useLiquid(color: string): Material {
  const transmission = useTransmission();
  return useMemo(() => liquidMaterial(color, transmission), [color, transmission]);
}
