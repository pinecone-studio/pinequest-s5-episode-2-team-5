import { MeshStandardMaterial } from 'three';
import { LAB } from './labPalette';

/** Metals: metalness 0.9, roughness 0.3 unless noted. */
export const metalSteel = new MeshStandardMaterial({ color: '#c3c8ce', metalness: 0.9, roughness: 0.3 });
export const metalChrome = new MeshStandardMaterial({ color: '#e8ecf0', metalness: 0.95, roughness: 0.12 });
export const metalBrushed = new MeshStandardMaterial({ color: '#aeb4bb', metalness: 0.9, roughness: 0.42 });
export const metalDark = new MeshStandardMaterial({ color: '#4d5359', metalness: 0.85, roughness: 0.35 });
export const metalBrass = new MeshStandardMaterial({ color: LAB.brass, metalness: 0.9, roughness: 0.3 });
export const metalAluminum = new MeshStandardMaterial({ color: '#d4d7db', metalness: 0.75, roughness: 0.35 });
/** Powder-coated shelving (painted metal). */
export const metalPainted = new MeshStandardMaterial({ color: '#7d858e', metalness: 0.55, roughness: 0.45 });
export const metalRed = new MeshStandardMaterial({ color: '#c81e1e', metalness: 0.4, roughness: 0.35 });
