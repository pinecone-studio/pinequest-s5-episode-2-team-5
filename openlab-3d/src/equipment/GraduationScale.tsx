import { CanvasTexture, LatheGeometry, MeshBasicMaterial, Vector2, SRGBColorSpace } from 'three';
import { heightForVolume, PROFILES, radiusAt } from './profiles';

type ScaleKind = 'cylinder' | 'beaker' | 'erlenmeyer' | 'burette' | 'volumetric' | 'thermometer';
interface ScaleSpec {
  bottom: number; top: number; radius: (y: number) => number;
  values: number[]; height: (value: number) => number; major: number; unit: string; arc: number;
}
const range = (from: number, to: number, step: number) => Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) => from + i * step);
const specs: Record<ScaleKind, ScaleSpec> = {
  cylinder: { bottom: .0135, top: .249, radius: () => .0143, values: range(1, 100, 1), height: (v) => heightForVolume(PROFILES.graduatedCylinder, v), major: 10, unit: 'mL', arc: 1.9 },
  beaker: { bottom: .006, top: .091, radius: () => .0353, values: range(50, 250, 50), height: (v) => heightForVolume(PROFILES.beaker, v), major: 50, unit: 'mL ≈', arc: 1.65 },
  erlenmeyer: { bottom: .004, top: .133, radius: (y) => radiusAt(PROFILES.erlenmeyer, y) + .0029, values: range(50, 200, 50), height: (v) => heightForVolume(PROFILES.erlenmeyer, v), major: 50, unit: 'mL ≈', arc: 1.65 },
  // Burettes read delivered volume: zero at the top, increasing downwards.
  burette: { bottom: .244, top: .736, radius: () => .0071, values: range(0, 50, 1), height: (v) => .72 - v / 50 * .46, major: 10, unit: 'mL', arc: 2.3 },
  volumetric: { bottom: .119, top: .166, radius: (y) => .0095 + (y - .112) / (.17 - .112) * (.0088 - .0095) + .0003, values: [100], height: () => .14, major: 100, unit: 'mL', arc: 2.5 },
  thermometer: { bottom: .016, top: .299, radius: () => .0039, values: range(-10, 110, 5), height: (v) => .03 + (v + 10) / 120 * .26, major: 20, unit: '°C', arc: 2.5 },
};
const assets = new Map<ScaleKind, { geometry: LatheGeometry; material: MeshBasicMaterial }>();
function getScale(kind: ScaleKind) {
  const cached = assets.get(kind);
  if (cached) return cached;
  const spec = specs[kind];
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = kind === 'cylinder' || kind === 'burette' || kind === 'thermometer' ? 2048 : 1024;
  const g = canvas.getContext('2d')!;
  g.strokeStyle = '#173a86'; g.fillStyle = '#173a86';
  g.font = 'bold 76px sans-serif'; g.textBaseline = 'middle';
  // Long narrow instruments need shorter glyphs in UV space to keep real-world text proportions.
  const textScaleY = kind === 'burette' ? .12 : kind === 'thermometer' ? .10 : 1;
  const text = (value: string, x: number, y: number) => {
    g.save(); g.translate(x, y); g.scale(1, textScaleY); g.fillText(value, 0, 0); g.restore();
  };
  for (const value of spec.values) {
    const y = (spec.top - spec.height(value)) / (spec.top - spec.bottom) * canvas.height;
    const major = value % spec.major === 0 || kind === 'thermometer' && value === -10;
    g.lineWidth = (major ? 8 : value % 5 === 0 ? 5 : 3) * (textScaleY < 1 ? .3 : 1);
    g.beginPath(); g.moveTo(35, y); g.lineTo(major ? 220 : value % 5 === 0 ? 155 : 105, y); g.stroke();
    if (major) text(String(value), 245, kind === 'volumetric' ? y - 100 : y);
  }
  g.font = 'bold 58px sans-serif';
  text(spec.unit, kind === 'erlenmeyer' ? 35 : 245, canvas.height - 40);
  const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; map.anisotropy = 8;
  const points = Array.from({ length: 65 }, (_, i) => {
    const y = spec.bottom + (spec.top - spec.bottom) * i / 64;
    return new Vector2(spec.radius(y), y);
  });
  const asset = {
    geometry: new LatheGeometry(points, 40, -spec.arc / 2, spec.arc),
    material: new MeshBasicMaterial({ map, transparent: true, alphaTest: .05, depthWrite: false, toneMapped: false }),
  };
  assets.set(kind, asset);
  return asset;
}

/** Surface ink only: no protruding tick geometry, mirrored back faces, or selection outlines. */
export function GraduationScale({ kind = 'cylinder' }: { kind?: ScaleKind }) {
  const { geometry, material } = getScale(kind);
  return <mesh geometry={geometry} material={material} rotation={kind === 'thermometer' ? [0, Math.PI, 0] : undefined} renderOrder={4} userData={{ noOutline: true, noBatch: true }} />;
}
