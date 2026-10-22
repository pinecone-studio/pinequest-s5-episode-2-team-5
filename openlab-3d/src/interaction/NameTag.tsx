/**
 * Floating Mongolian name plate above a focused item. Drawn on a canvas with the DOM
 * fonts (troika's bundled fonts are Latin-only), shown as a camera-facing sprite.
 */
import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';

const W = 640;
const H = 150;

function draw(title: string, subtitle?: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(17, 24, 39, 0.82)';
    ctx.beginPath();
    ctx.roundRect(4, 4, W - 8, H - 8, 28);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 46px Inter, sans-serif';
    ctx.fillText(title, W / 2, subtitle ? 52 : H / 2, W - 48);
    if (subtitle) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = '600 34px Inter, sans-serif';
      ctx.fillText(subtitle, W / 2, 106, W - 48);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function NameTag({ title, subtitle, height }: { title: string; subtitle?: string; height: number }) {
  const texture = useMemo(() => draw(title, subtitle), [title, subtitle]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={[0, height + 0.08, 0]} scale={[0.34, 0.34 * (H / W), 1]} renderOrder={999} raycast={() => undefined}>
      <spriteMaterial map={texture} transparent depthTest={false} toneMapped={false} />
    </sprite>
  );
}
