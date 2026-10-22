/**
 * Procedurally drawn CanvasTextures (floor tiles, posters, screens, labels).
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

const labelCache = new Map<string, Texture>();
/** Small white bottle label with a colored stripe and a formula. */
export function labelTexture(text: string, stripe = '#dc2626'): Texture {
  const key = `${text}-${stripe}`;
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
  ctx.fillText(text, 128, 92, 236);
  ctx.font = '500 16px Inter, sans-serif';
  ctx.fillStyle = '#6b7280';
  ctx.fillText('OPENLAB REAGENTS', 128, 118);
  const t = toTexture(c);
  labelCache.set(key, t);
  return t;
}

/** Fine reticle scale used on the Millikan apparatus' scale plate. */
export const reticlePlateTexture = lazy(() => {
  const [c, ctx] = makeCanvas(128, 256);
  ctx.fillStyle = '#f7f7f2';
  ctx.fillRect(0, 0, 128, 256);
  ctx.strokeStyle = '#111';
  for (let i = 0; i <= 20; i++) {
    const y = 18 + i * 11;
    ctx.lineWidth = i % 5 === 0 ? 2.5 : 1.2;
    ctx.beginPath();
    ctx.moveTo(i % 5 === 0 ? 18 : 34, y);
    ctx.lineTo(110, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#111';
  ctx.font = '700 13px Inter, sans-serif';
  for (let i = 0; i <= 4; i++) ctx.fillText(String(i * 0.5), 2, 22 + i * 55);
  return toTexture(c);
});

/** Whiteboard with handwritten-style notes about the Millikan experiment. */
export const whiteboardTexture = lazy(() => {
  const [c, ctx] = makeCanvas(1024, 512);
  ctx.fillStyle = '#fdfdfd';
  ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = 'rgba(0,0,0,0.03)';
  for (let k = 0; k < 30; k++) ctx.fillRect(Math.random() * 1024, Math.random() * 512, 120, 6);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1d4ed8';
  ctx.font = 'italic 700 46px Poppins, Inter, sans-serif';
  ctx.fillText('Millikan Oil Drop', 48, 78);
  ctx.fillStyle = '#111827';
  ctx.font = 'italic 500 32px Inter, sans-serif';
  const lines = ['v  =  mg / (6πηr)        (field off)', 'qE = mg        E = V / d', 'r  = √( 9ηv / 2ρg )', 'q  =  n · e     →  e ≈ 1.6 × 10⁻¹⁹ C'];
  lines.forEach((l, i) => ctx.fillText(l, 60, 150 + i * 62));
  ctx.fillStyle = '#dc2626';
  ctx.font = 'italic 600 28px Inter, sans-serif';
  ctx.fillText('d = 6.0 mm   η = 1.81×10⁻⁵ Pa·s   ρ = 886 kg/m³', 60, 420);
  ctx.strokeStyle = '#16a34a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(760, 120);
  ctx.lineTo(960, 120);
  ctx.moveTo(760, 300);
  ctx.lineTo(960, 300);
  ctx.stroke();
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(860, 210, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(860, 190);
  ctx.lineTo(860, 140);
  ctx.moveTo(850, 152);
  ctx.lineTo(860, 140);
  ctx.lineTo(870, 152);
  ctx.moveTo(860, 230);
  ctx.lineTo(860, 280);
  ctx.moveTo(850, 268);
  ctx.lineTo(860, 280);
  ctx.lineTo(870, 268);
  ctx.stroke();
  ctx.font = 'italic 600 24px Inter, sans-serif';
  ctx.fillStyle = '#111827';
  ctx.fillText('qE', 880, 160);
  ctx.fillText('mg', 880, 270);
  return toTexture(c);
});

/** Generic chemistry whiteboard. */
export const chemBoardTexture = lazy(() => {
  const [c, ctx] = makeCanvas(1024, 512);
  ctx.fillStyle = '#fdfdfd';
  ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = '#047857';
  ctx.font = 'italic 700 44px Poppins, Inter, sans-serif';
  ctx.fillText('Today: Acids & Bases', 48, 80);
  ctx.fillStyle = '#111827';
  ctx.font = 'italic 500 32px Inter, sans-serif';
  ['HCl + NaOH → NaCl + H₂O', 'pH = −log[H⁺]', 'Goggles ON at all times!', 'Burners off when unattended'].forEach((l, i) =>
    ctx.fillText(l, 60, 160 + i * 66),
  );
  return toTexture(c);
});

export type DesktopState = { measurements: number; estimate: string | null };

/** Laptop desktop: a generic blue gradient with simple original app icons. */
export function drawDesktop(ctx: CanvasRenderingContext2D, w: number, h: number, state: DesktopState): void {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#1e3a8a');
  g.addColorStop(0.55, '#2563eb');
  g.addColorStop(1, '#38bdf8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Soft waves.
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(0, h * (0.62 + k * 0.1));
    ctx.bezierCurveTo(w * 0.3, h * (0.5 + k * 0.1), w * 0.6, h * (0.8 + k * 0.08), w, h * (0.6 + k * 0.1));
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();
  }
  const icons: { label: string; color: string; glyph: 'chart' | 'table' | 'note' | 'folder' }[] = [
    { label: 'Drop Logger', color: '#f5b800', glyph: 'chart' },
    { label: 'Data', color: '#22c55e', glyph: 'table' },
    { label: 'Notes', color: '#f97316', glyph: 'note' },
    { label: 'Files', color: '#a78bfa', glyph: 'folder' },
  ];
  const s = h * 0.13;
  icons.forEach((icon, i) => {
    const x = w * 0.05;
    const y = h * 0.07 + i * (s + h * 0.09);
    ctx.fillStyle = icon.color;
    ctx.beginPath();
    ctx.roundRect(x, y, s, s, s * 0.22);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = s * 0.08;
    ctx.lineCap = 'round';
    const cx = x + s / 2;
    const cy = y + s / 2;
    ctx.beginPath();
    if (icon.glyph === 'chart') {
      ctx.moveTo(x + s * 0.2, y + s * 0.75);
      ctx.lineTo(x + s * 0.4, y + s * 0.5);
      ctx.lineTo(x + s * 0.58, y + s * 0.62);
      ctx.lineTo(x + s * 0.8, y + s * 0.28);
    } else if (icon.glyph === 'table') {
      ctx.rect(x + s * 0.2, y + s * 0.22, s * 0.6, s * 0.56);
      ctx.moveTo(x + s * 0.2, cy);
      ctx.lineTo(x + s * 0.8, cy);
      ctx.moveTo(cx, y + s * 0.22);
      ctx.lineTo(cx, y + s * 0.78);
    } else if (icon.glyph === 'note') {
      ctx.moveTo(x + s * 0.25, y + s * 0.32);
      ctx.lineTo(x + s * 0.75, y + s * 0.32);
      ctx.moveTo(x + s * 0.25, cy);
      ctx.lineTo(x + s * 0.75, cy);
      ctx.moveTo(x + s * 0.25, y + s * 0.68);
      ctx.lineTo(x + s * 0.6, y + s * 0.68);
    } else {
      ctx.moveTo(x + s * 0.18, y + s * 0.3);
      ctx.lineTo(x + s * 0.42, y + s * 0.3);
      ctx.lineTo(x + s * 0.5, y + s * 0.4);
      ctx.lineTo(x + s * 0.82, y + s * 0.4);
      ctx.lineTo(x + s * 0.82, y + s * 0.75);
      ctx.lineTo(x + s * 0.18, y + s * 0.75);
      ctx.closePath();
    }
    ctx.stroke();
    ctx.font = `600 ${Math.round(h * 0.038)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(icon.label, cx, y + s + h * 0.045);
  });
  // App window preview.
  const wx = w * 0.3;
  const wy = h * 0.12;
  const ww = w * 0.62;
  const wh = h * 0.6;
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.beginPath();
  ctx.roundRect(wx, wy, ww, wh, h * 0.025);
  ctx.fill();
  ctx.fillStyle = '#f5b800';
  ctx.beginPath();
  ctx.roundRect(wx, wy, ww, h * 0.07, [h * 0.025, h * 0.025, 0, 0]);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.round(h * 0.04)}px Inter, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('OpenLab Drop Logger', wx + w * 0.02, wy + h * 0.05);
  ctx.fillStyle = '#1f2328';
  ctx.font = `600 ${Math.round(h * 0.045)}px Inter, sans-serif`;
  ctx.fillText(`Measurements: ${state.measurements}`, wx + w * 0.03, wy + h * 0.17);
  ctx.fillStyle = '#475569';
  ctx.font = `500 ${Math.round(h * 0.038)}px Inter, sans-serif`;
  ctx.fillText(state.estimate ? `e ≈ ${state.estimate}` : 'Press E to open the logger', wx + w * 0.03, wy + h * 0.25);
  // Mini chart.
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  const cx0 = wx + w * 0.03;
  const cy0 = wy + wh - h * 0.06;
  ctx.beginPath();
  ctx.moveTo(cx0, wy + h * 0.3);
  ctx.lineTo(cx0, cy0);
  ctx.lineTo(wx + ww - w * 0.03, cy0);
  ctx.stroke();
  ctx.fillStyle = '#2563eb';
  for (let k = 0; k < Math.min(state.measurements, 12); k++) {
    const px = cx0 + (k + 1) * ((ww - w * 0.08) / 13);
    const level = 1 + ((k * 7) % 4);
    const py = cy0 - level * (wh * 0.11);
    ctx.beginPath();
    ctx.arc(px, py, h * 0.012, 0, Math.PI * 2);
    ctx.fill();
  }
  // Taskbar.
  ctx.fillStyle = 'rgba(15,23,42,0.55)';
  ctx.fillRect(0, h * 0.92, w, h * 0.08);
  ctx.fillStyle = '#f5b800';
  ctx.beginPath();
  ctx.arc(w * 0.03, h * 0.96, h * 0.022, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e2e8f0';
  ctx.font = `600 ${Math.round(h * 0.035)}px Inter, sans-serif`;
  ctx.textAlign = 'right';
  const now = new Date();
  ctx.fillText(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, w * 0.97, h * 0.97);
}

export type CellPattern = 'onion' | 'blood' | 'pond' | 'leaf';

/** Specimen image drawn into any 2D context (used by eyepiece view and the demo screen). */
export function drawSpecimen(ctx: CanvasRenderingContext2D, w: number, h: number, pattern: CellPattern, seed = 1): void {
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  if (pattern === 'onion') {
    ctx.fillStyle = '#f3e7d2';
    ctx.fillRect(0, 0, w, h);
    const cw = w / 5.5;
    const ch = h / 9;
    for (let row = -1; row < 11; row++) {
      for (let col = -1; col < 7; col++) {
        const off = row % 2 === 0 ? 0 : cw * 0.45;
        const x = col * cw + off + (rnd() - 0.5) * 8;
        const y = row * ch + (rnd() - 0.5) * 6;
        ctx.fillStyle = `rgba(${200 + rnd() * 30},${160 + rnd() * 30},${190 + rnd() * 30},0.55)`;
        ctx.strokeStyle = 'rgba(120,70,110,0.75)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(x, y, cw * 0.96, ch * 0.92, 10);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(110,40,100,0.75)';
        ctx.beginPath();
        ctx.ellipse(x + cw * (0.3 + rnd() * 0.4), y + ch * (0.35 + rnd() * 0.3), cw * 0.09, ch * 0.13, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (pattern === 'blood') {
    ctx.fillStyle = '#fbe9e7';
    ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 140; k++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = w * (0.025 + rnd() * 0.01);
      const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
      g.addColorStop(0, 'rgba(230,120,120,0.55)');
      g.addColorStop(0.7, 'rgba(200,50,60,0.85)');
      g.addColorStop(1, 'rgba(160,30,40,0.0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let k = 0; k < 4; k++) {
      const x = rnd() * w;
      const y = rnd() * h;
      ctx.fillStyle = 'rgba(150,140,220,0.6)';
      ctx.beginPath();
      ctx.arc(x, y, w * 0.045, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(80,40,150,0.85)';
      for (let l = 0; l < 3; l++) {
        ctx.beginPath();
        ctx.arc(x + (rnd() - 0.5) * w * 0.04, y + (rnd() - 0.5) * w * 0.04, w * 0.016, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (pattern === 'pond') {
    ctx.fillStyle = '#e9f4e4';
    ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 18; k++) {
      const x = rnd() * w;
      const y = rnd() * h;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rnd() * Math.PI);
      ctx.fillStyle = `rgba(${60 + rnd() * 40},${150 + rnd() * 50},${70 + rnd() * 30},0.7)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.06, w * 0.025, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (let k = 0; k < 6; k++) {
      ctx.strokeStyle = 'rgba(40,120,60,0.7)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      let x = rnd() * w;
      let y = rnd() * h;
      ctx.moveTo(x, y);
      for (let seg = 0; seg < 8; seg++) {
        x += (rnd() - 0.3) * 40;
        y += (rnd() - 0.5) * 40;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#e4f1d8';
    ctx.fillRect(0, 0, w, h);
    const cw = w / 7;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const x = col * cw + (rnd() - 0.5) * 6;
        const y = row * (h / 8) + (rnd() - 0.5) * 6;
        ctx.fillStyle = 'rgba(160,210,140,0.6)';
        ctx.strokeStyle = 'rgba(70,120,60,0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(x, y, cw * 0.94, h / 8.4, 14);
        ctx.fill();
        ctx.stroke();
        for (let k = 0; k < 6; k++) {
          ctx.fillStyle = 'rgba(40,140,50,0.85)';
          ctx.beginPath();
          ctx.ellipse(x + cw * (0.15 + rnd() * 0.7), y + (h / 8.4) * (0.2 + rnd() * 0.6), 7, 5, rnd() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

const specimenCache = new Map<string, Texture>();
export function specimenTexture(pattern: CellPattern): Texture {
  const cached = specimenCache.get(pattern);
  if (cached) return cached;
  const [c, ctx] = makeCanvas(512, 512);
  drawSpecimen(ctx, 512, 512, pattern, 3);
  const t = toTexture(c);
  specimenCache.set(pattern, t);
  return t;
}
