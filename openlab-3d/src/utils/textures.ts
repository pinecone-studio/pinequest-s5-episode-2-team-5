/**
 * Procedurally drawn CanvasTextures (floor tiles, posters, whiteboard, labels).
 * Nothing is loaded from the network.
 */
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import { lazy } from './lazy';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return [c, ctx];
}

function toTexture(c: HTMLCanvasElement, repeat = false): CanvasTexture {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
  }
  t.needsUpdate = true;
  return t;
}

/** 2 × 2 tiles of 0.6 m: one texture repeat covers 1.2 m of floor. */
export const floorTexture = lazy(() => {
  const [c, ctx] = makeCanvas(512, 512);
  const tile = 256;
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const shade = 214 + Math.round((Math.random() - 0.5) * 6);
      ctx.fillStyle = `rgb(${shade + 3},${shade + 6},${shade + 9})`;
      ctx.fillRect(i * tile, j * tile, tile, tile);
      // Speckled vinyl.
      for (let k = 0; k < 420; k++) {
        const v = shade + Math.round((Math.random() - 0.5) * 26);
        ctx.fillStyle = `rgba(${v},${v + 2},${v + 5},0.35)`;
        ctx.fillRect(i * tile + Math.random() * tile, j * tile + Math.random() * tile, 2, 2);
      }
    }
  }
  ctx.strokeStyle = 'rgba(150,156,163,0.55)';
  ctx.lineWidth = 3;
  for (let k = 0; k <= 2; k++) {
    ctx.beginPath();
    ctx.moveTo(k * tile, 0);
    ctx.lineTo(k * tile, 512);
    ctx.moveTo(0, k * tile);
    ctx.lineTo(512, k * tile);
    ctx.stroke();
  }
  return toTexture(c, true);
});

export const ceilingTexture = lazy(() => {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#f5f6f7';
  ctx.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 900; k++) {
    ctx.fillStyle = `rgba(190,195,200,${Math.random() * 0.25})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
  }
  ctx.strokeStyle = '#d8dce0';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 256, 256);
  return toTexture(c, true);
});

export const groundTexture = lazy(() => {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#9fbf8a';
  ctx.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 2500; k++) {
    const g = 150 + Math.random() * 60;
    ctx.fillStyle = `rgba(${g - 60},${g},${g - 80},0.35)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 3);
  }
  return toTexture(c, true);
});

export interface PosterSpec {
  title: string;
  lines: string[];
  color: string;
  icon?: 'goggles' | 'exit' | 'hands' | 'nofood' | 'atom' | 'flask' | 'fire' | 'cell';
}

function drawIcon(ctx: CanvasRenderingContext2D, icon: NonNullable<PosterSpec['icon']>, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = s * 0.08;
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (icon) {
    case 'goggles':
      ctx.beginPath();
      ctx.ellipse(-s * 0.22, 0, s * 0.2, s * 0.15, 0, 0, Math.PI * 2);
      ctx.ellipse(s * 0.22, 0, s * 0.2, s * 0.15, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.42, 0);
      ctx.lineTo(-s * 0.5, -s * 0.05);
      ctx.moveTo(s * 0.42, 0);
      ctx.lineTo(s * 0.5, -s * 0.05);
      ctx.stroke();
      break;
    case 'exit':
      ctx.strokeRect(-s * 0.15, -s * 0.35, s * 0.4, s * 0.7);
      ctx.beginPath();
      ctx.arc(-s * 0.32, -s * 0.22, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.32, -s * 0.12);
      ctx.lineTo(-s * 0.36, s * 0.08);
      ctx.lineTo(-s * 0.45, s * 0.3);
      ctx.moveTo(-s * 0.36, s * 0.08);
      ctx.lineTo(-s * 0.22, s * 0.3);
      ctx.moveTo(-s * 0.48, -s * 0.05);
      ctx.lineTo(-s * 0.22, -s * 0.02);
      ctx.stroke();
      break;
    case 'hands':
      for (const dx of [-0.17, 0.17]) {
        ctx.beginPath();
        ctx.roundRect(s * dx - s * 0.12, -s * 0.1, s * 0.24, s * 0.36, s * 0.08);
        ctx.stroke();
        for (let f = 0; f < 4; f++) {
          ctx.beginPath();
          ctx.moveTo(s * dx - s * 0.09 + f * s * 0.06, -s * 0.1);
          ctx.lineTo(s * dx - s * 0.09 + f * s * 0.06, -s * 0.3);
          ctx.stroke();
        }
      }
      for (let d = 0; d < 3; d++) {
        ctx.beginPath();
        ctx.arc(-s * 0.3 + d * s * 0.3, -s * 0.42, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'nofood':
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.08, -s * 0.2);
      ctx.lineTo(-s * 0.06, s * 0.2);
      ctx.lineTo(s * 0.1, s * 0.2);
      ctx.lineTo(s * 0.12, -s * 0.2);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.26, -s * 0.26);
      ctx.lineTo(s * 0.26, s * 0.26);
      ctx.stroke();
      break;
    case 'atom':
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.4, s * 0.14, (k * Math.PI) / 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'flask':
      ctx.beginPath();
      ctx.moveTo(-s * 0.08, -s * 0.38);
      ctx.lineTo(-s * 0.08, -s * 0.1);
      ctx.lineTo(-s * 0.3, s * 0.32);
      ctx.lineTo(s * 0.3, s * 0.32);
      ctx.lineTo(s * 0.08, -s * 0.1);
      ctx.lineTo(s * 0.08, -s * 0.38);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, s * 0.12);
      ctx.lineTo(s * 0.2, s * 0.12);
      ctx.stroke();
      break;
    case 'fire':
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.4);
      ctx.bezierCurveTo(s * 0.35, -s * 0.05, s * 0.3, s * 0.35, 0, s * 0.38);
      ctx.bezierCurveTo(-s * 0.3, s * 0.35, -s * 0.35, -s * 0.02, -s * 0.05, -s * 0.12);
      ctx.bezierCurveTo(-s * 0.02, -s * 0.22, 0, -s * 0.3, 0, -s * 0.4);
      ctx.fill();
      break;
    case 'cell':
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.4, s * 0.28, 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.06, -s * 0.02, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.restore();
}

const posterCache = new Map<string, Texture>();
/** A poster: colored header band with icon, title and short lines of body text. */
export function posterTexture(spec: PosterSpec): Texture {
  const key = JSON.stringify(spec);
  const cached = posterCache.get(key);
  if (cached) return cached;
  const [c, ctx] = makeCanvas(512, 724);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 724);
  ctx.fillStyle = spec.color;
  ctx.fillRect(0, 0, 512, 300);
  if (spec.icon) drawIcon(ctx, spec.icon, 256, 150, 220);
  ctx.fillStyle = '#1f2328';
  ctx.font = '700 46px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(spec.title, 256, 372, 470);
  ctx.font = '500 28px Inter, sans-serif';
  ctx.fillStyle = '#475569';
  spec.lines.forEach((line, i) => ctx.fillText(line, 256, 432 + i * 44, 470));
  ctx.fillStyle = spec.color;
  ctx.fillRect(0, 700, 512, 24);
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 506, 718);
  const t = toTexture(c);
  posterCache.set(key, t);
  return t;
}

const signCache = new Map<string, Texture>();
/**
 * Centered bold sign lettering on a transparent background, sized to fit a plane of the
 * given aspect ratio (width / height). Drawn with the DOM fonts, so Cyrillic works.
 */
export function signTexture(lines: string[], color: string, aspect: number): Texture {
  const key = `${lines.join('\n')}-${color}-${aspect}`;
  const cached = signCache.get(key);
  if (cached) return cached;
  const w = 1024;
  const h = Math.round(w / aspect);
  const [c, ctx] = makeCanvas(w, h);
  const lineH = h / lines.length;
  let size = lineH * 0.78;
  ctx.font = `700 ${size}px Inter, sans-serif`;
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  if (widest > w * 0.96) size *= (w * 0.96) / widest;
  ctx.font = `700 ${size}px Inter, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, w / 2, lineH * (i + 0.5)));
  const t = toTexture(c);
  signCache.set(key, t);
  return t;
}

const labelCache = new Map<string, Texture>();
/** Small white bottle label with a colored stripe and a formula. */
export function labelTexture(text: string, stripe = '#dc2626', subtitle = 'OPENLAB УРВАЛЖ'): Texture {
  const key = `${text}-${stripe}-${subtitle}`;
  const cached = labelCache.get(key);
  if (cached) return cached;
  const [c, ctx] = makeCanvas(256, 128);
  ctx.fillStyle = '#fbfbf8';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = stripe;
  ctx.fillRect(0, 0, 256, 26);
  ctx.fillStyle = '#111827';
  ctx.font = '700 54px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 128, 84, 236);
  ctx.font = '600 20px Inter, sans-serif';
  ctx.fillStyle = '#4b5563';
  ctx.fillText(subtitle, 128, 118, 236);
  const t = toTexture(c);
  labelCache.set(key, t);
  return t;
}

/** Generic chemistry whiteboard. */
export const chemBoardTexture = lazy(() => {
  const [c, ctx] = makeCanvas(1024, 512);
  ctx.fillStyle = '#fdfdfd';
  ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = '#047857';
  ctx.font = 'italic 700 44px Poppins, Inter, sans-serif';
  ctx.fillText('Өнөөдөр: Хүчил ба шүлт', 48, 80);
  ctx.fillStyle = '#111827';
  ctx.font = 'italic 500 32px Inter, sans-serif';
  ['HCl + NaOH → NaCl + H₂O', 'pH = −log[H⁺]', 'Нүдний шилээ үргэлж зүү!', 'Горелкийг хараа хяналтгүй бүү орхи'].forEach((l, i) =>
    ctx.fillText(l, 60, 160 + i * 66),
  );
  return toTexture(c);
});

const plateCache = new Map<string, Texture>();
/** Drawer / cabinet label plate: white card with a colored band and bold text. */
export function plateTexture(text: string, color: string): Texture {
  const key = `${text}-${color}`;
  const cached = plateCache.get(key);
  if (cached) return cached;
  const [c, ctx] = makeCanvas(512, 128);
  ctx.fillStyle = '#fbfbf8';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 34, 128);
  ctx.fillRect(0, 118, 512, 10);
  ctx.fillStyle = '#111827';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  let size = 58;
  ctx.font = `700 ${size}px Inter, sans-serif`;
  const w = ctx.measureText(text).width;
  if (w > 440) size *= 440 / w;
  ctx.font = `700 ${size}px Inter, sans-serif`;
  ctx.fillText(text, 273, 62);
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 508, 124);
  const t = toTexture(c);
  plateCache.set(key, t);
  return t;
}

/** GHS flammable pictogram: a black flame over a bar in a red-bordered white diamond (transparent corners). */
export const flameDiamondTexture = lazy(() => {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.beginPath();
  ctx.moveTo(128, 6);
  ctx.lineTo(250, 128);
  ctx.lineTo(128, 250);
  ctx.lineTo(6, 128);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 16;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#d0021b';
  ctx.stroke();
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.moveTo(130, 62);
  ctx.bezierCurveTo(156, 92, 176, 118, 170, 156);
  ctx.bezierCurveTo(166, 182, 148, 194, 128, 194);
  ctx.bezierCurveTo(104, 194, 86, 180, 86, 156);
  ctx.bezierCurveTo(86, 132, 100, 122, 106, 100);
  ctx.bezierCurveTo(114, 116, 116, 128, 122, 134);
  ctx.bezierCurveTo(128, 110, 122, 88, 130, 62);
  ctx.fill();
  ctx.fillRect(80, 200, 96, 11);
  return toTexture(c);
});
