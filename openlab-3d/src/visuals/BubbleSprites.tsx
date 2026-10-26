/**
 * Gas bubbles inside a liquid: camera-facing rings with a highlight, drawn with alpha-to-coverage
 * so they stay visible through transmissive glass (blended sprites are depth-hidden behind it)
 * and keep anti-aliased edges under MSAA.
 * Bubbles nucleate on the bottom (or on a settled solid), wobble as they rise, grow as the
 * pressure drops, and swell briefly before bursting at the surface.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, DoubleSide, MeshBasicMaterial, Object3D, PlaneGeometry, type InstancedMesh } from 'three';
import { lazy } from '../utils/lazy';
import { useSettingsStore } from '../store/useSettingsStore';

const texture = lazy(() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  if (x) {
    // A gas bubble in water: total internal reflection gives a dark edge, with a bright inner
    // ring and a specular dot. Reads against both pale liquids and dark benches.
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,255,255,0.0)');
    g.addColorStop(0.52, 'rgba(255,255,255,0.0)');
    g.addColorStop(0.6, 'rgba(255,255,255,1)');
    g.addColorStop(0.72, 'rgba(214,232,240,1)');
    g.addColorStop(0.8, 'rgba(84,104,116,1)');
    g.addColorStop(0.95, 'rgba(52,66,76,1)');
    g.addColorStop(1, 'rgba(52,66,76,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    x.fillStyle = 'rgba(255,255,255,1)';
    x.beginPath();
    x.ellipse(44, 42, 14, 10, -0.7, 0, Math.PI * 2);
    x.fill();
  }
  const t = new CanvasTexture(c);
  t.anisotropy = 4;
  return t;
});
const material = lazy(() => new MeshBasicMaterial({ map: texture(), alphaToCoverage: true, side: DoubleSide, toneMapped: false }));
const plane = lazy(() => new PlaneGeometry(1, 1));

function hash(i: number) {
  return Math.abs((Math.sin(i * 127.1 + 31.7) * 43758.5453) % 1);
}

export interface BubbleSpritesProps {
  /** 0..1 every frame: gas release or boiling vigour. */
  intensity: () => number;
  /** Inner radius at a height (vessel space). */
  radiusAt: (y: number) => number;
  bottom: number;
  top: number;
  /** Bubbles leave from a solid lying on the bottom (metal in acid, chalk, catalyst). */
  fromSolid?: boolean;
  max?: number;
}

export function BubbleSprites({ intensity, radiusAt, bottom, top, fromSolid = false, max = 72 }: BubbleSpritesProps) {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const clock = useRef(0);
  useFrame(({ camera }, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const reduced = useSettingsStore.getState().reducedMotion;
    const level = Math.max(0, Math.min(1, intensity()));
    const depth = top - bottom;
    const count = depth > 0.002 ? Math.round(Math.sqrt(level) * (reduced ? max * 0.3 : max)) : 0;
    mesh.count = count;
    mesh.visible = count > 0;
    if (!count) return;
    clock.current += Math.min(0.05, delta);
    const t = clock.current;
    // The rounded foot of a tube is narrow; spread bubbles over the body of the vessel.
    const body = radiusAt(bottom + depth * 0.35);
    // Real effervescence rises in streams from a few nucleation sites (metal edges, scratches).
    const sites = fromSolid ? 5 : 8;
    // Face the camera in vessel space.
    mesh.parent?.getWorldQuaternion(dummy.quaternion);
    dummy.quaternion.invert().multiply(camera.quaternion);
    for (let i = 0; i < count; i++) {
      const v = hash(i),
        site = i % sites,
        siteAngle = site * 2.39996 + 0.7,
        siteR = (fromSolid ? 0.15 + hash(site + 7) * 0.4 : 0.1 + hash(site + 7) * 0.62) * body;
      // Vigorous reactions rise faster; slow ones drift up.
      const speed = (reduced ? 0.02 : 0.035 + v * 0.045) * (0.7 + level * 0.8);
      const phase = (t * speed / Math.max(0.004, depth) + v * 7.31 + i * 0.37) % 1;
      const y = bottom + phase * depth;
      const wobble = reduced ? 0 : Math.sin(t * (7 + v * 6) + i) * body * 0.05 * phase;
      const allowed = radiusAt(y) * 0.85;
      const x0 = Math.cos(siteAngle) * siteR + Math.cos(i * 1.7) * body * 0.12 + wobble,
        z0 = Math.sin(siteAngle) * siteR + Math.sin(i * 1.3) * body * 0.12;
      const spread = Math.hypot(x0, z0),
        inset = spread > allowed ? allowed / spread : 1;
      dummy.position.set(x0 * inset, y, z0 * inset);
      // Grow while rising (less pressure); swell just before bursting at the surface.
      const burst = phase > 0.93 ? 1 + (phase - 0.93) * 6 : 1;
      const size = Math.min(body * 0.32, depth * 0.3, (0.0012 + v * 0.002) * (0.75 + level * 0.6) * (0.6 + phase * 0.55) * burst);
      dummy.scale.setScalar(phase > 0.985 ? 0.00001 : size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[plane(), material(), max]} frustumCulled={false} renderOrder={3} userData={{ noOutline: true, noBatch: true }} raycast={() => undefined} />;
}
