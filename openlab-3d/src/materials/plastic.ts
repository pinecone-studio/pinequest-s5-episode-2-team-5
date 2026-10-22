import { MeshStandardMaterial, MeshPhysicalMaterial, Color } from 'three';
import { LAB } from './labPalette';

/** Matte white/cream plastics (roughness 0.6). */
export const plasticWhite = new MeshStandardMaterial({ color: LAB.white, roughness: 0.6, metalness: 0 });
export const plasticCream = new MeshStandardMaterial({ color: LAB.cream, roughness: 0.6, metalness: 0 });
export const plasticLightGray = new MeshStandardMaterial({ color: LAB.lightGray, roughness: 0.6 });
export const plasticDark = new MeshStandardMaterial({ color: LAB.charcoal, roughness: 0.55 });
export const plasticBlack = new MeshStandardMaterial({ color: LAB.black, roughness: 0.45 });
export const plasticYellow = new MeshStandardMaterial({ color: LAB.yellow, roughness: 0.55 });
export const plasticRed = new MeshStandardMaterial({ color: LAB.red, roughness: 0.5 });
export const plasticBlue = new MeshStandardMaterial({ color: '#2563eb', roughness: 0.5 });
export const plasticGreen = new MeshStandardMaterial({ color: '#22a35a', roughness: 0.5 });

/** Black rubber (roughness 0.9). */
export const rubberBlack = new MeshStandardMaterial({ color: '#111214', roughness: 0.9, metalness: 0 });

/** Glossy dark visor / screen glass. */
export const glossyBlack = new MeshPhysicalMaterial({ color: '#0d0f12', roughness: 0.15, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08 });

/** Painted furniture. */
export const benchTop = new MeshStandardMaterial({ color: LAB.benchTop, roughness: 0.7 });
export const benchBody = new MeshStandardMaterial({ color: LAB.benchBody, roughness: 0.65 });
export const benchFront = new MeshStandardMaterial({ color: LAB.benchFront, roughness: 0.55 });
export const paintedWhite = new MeshStandardMaterial({ color: '#f1f2f4', roughness: 0.55 });
export const wood = new MeshStandardMaterial({ color: LAB.wood, roughness: 0.7 });

const cache = new Map<string, MeshStandardMaterial>();
/** Cached matte plastic of any color. */
export function plastic(color: string, roughness = 0.6): MeshStandardMaterial {
  const key = `${color}-${roughness}`;
  let m = cache.get(key);
  if (!m) {
    m = new MeshStandardMaterial({ color: new Color(color), roughness });
    cache.set(key, m);
  }
  return m;
}
