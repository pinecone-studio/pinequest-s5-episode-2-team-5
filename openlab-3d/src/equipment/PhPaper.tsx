/** Booklet of universal pH paper with the color chart on its cover and the last used strip on top. */
import { useMemo } from 'react';
import { CanvasTexture, MeshStandardMaterial, SRGBColorSpace } from 'three';
import { universalColor } from '../chemistry/color';
import { plastic } from '../materials/plastic';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const chartMaterial = lazy(() => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fff7e6';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#9a3412';
    ctx.font = '700 26px Inter, sans-serif';
    ctx.fillText('pH 1–14', 12, 34);
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = universalColor(i + 1);
      ctx.fillRect(10 + i * 17, 56, 15, 40);
      ctx.fillStyle = '#334155';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillText(String(i + 1), 12 + i * 17, 112);
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return new MeshStandardMaterial({ map: t, roughness: 0.8 });
});

export function PhPaper({ modelUrl, strip, ...props }: ModelProps & { strip?: string }) {
  const stripMat = useMemo(() => plastic(strip ?? '#f5d36a', 0.9), [strip]);
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh material={plastic('#f59e0b', 0.7)} position={[0, 0.008, 0]} castShadow>
        <boxGeometry args={[0.06, 0.016, 0.04]} />
      </mesh>
      <mesh material={chartMaterial()} position={[0, 0.0162, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.056, 0.028]} />
      </mesh>
      <mesh material={stripMat} position={[0.012, 0.0175, 0.004]} rotation={[0, 0.5, 0]} userData={{ noBatch: true }}>
        <boxGeometry args={[0.007, 0.0008, 0.05]} />
      </mesh>
    </ModelOr>
  );
}
