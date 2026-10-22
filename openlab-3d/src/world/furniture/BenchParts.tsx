/**
 * Instanced parts shared by all benches/cabinets in a room: drawer and door fronts,
 * chrome bar handles and open-top drawer boxes. A room wraps its furniture in
 * <BenchParts> so hundreds of fronts cost only three draw calls.
 */
import type { ReactNode } from 'react';
import { createInstances } from '@react-three/drei';
import { BoxGeometry, BufferGeometry, Color, CylinderGeometry, Float32BufferAttribute } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { benchFront, plasticLightGray } from '../../materials/plastic';
import { metalChrome } from '../../materials/metal';
import { lazy } from '../../utils/lazy';

const [FrontInstances, FrontInstance] = createInstances();
const [HandleInstances, HandleInstance] = createInstances();
const [BoxInstances, BoxInstance] = createInstances();

export { FrontInstance, HandleInstance, BoxInstance };

/** Unit box (1 × 1 × 1) scaled per instance. */
export const unitBox = lazy(() => new BoxGeometry(1, 1, 1));

/** Horizontal bar handle, 0.12 m long, standing 0.025 m off the front on two posts. */
export const handleGeometry = lazy(() => {
  const bar = new CylinderGeometry(0.0055, 0.0055, 0.12, 8);
  bar.rotateZ(Math.PI / 2);
  bar.translate(0, 0, 0.025);
  const postA = new CylinderGeometry(0.004, 0.004, 0.025, 6);
  postA.rotateX(Math.PI / 2);
  postA.translate(-0.05, 0, 0.0125);
  const postB = postA.clone();
  postB.translate(0.1, 0, 0);
  const merged = mergeGeometries([bar, postA, postB], false);
  return merged ?? bar;
});

/** Open-top drawer tray of unit size (centered, open at +y). */
export const drawerBoxGeometry = lazy(() => {
  const t = 0.04;
  const parts: BufferGeometry[] = [];
  const add = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const g = new BoxGeometry(w, h, d);
    g.translate(x, y, z);
    parts.push(g);
  };
  add(1, t, 1, 0, -0.5 + t / 2, 0);
  add(t, 1, 1, -0.5 + t / 2, 0, 0);
  add(t, 1, 1, 0.5 - t / 2, 0, 0);
  add(1, 1, t, 0, 0, -0.5 + t / 2);
  add(1, 1, t, 0, 0, 0.5 - t / 2);
  const merged = mergeGeometries(parts, false) ?? new BoxGeometry(1, 1, 1);
  if (!merged.getAttribute('uv')) merged.setAttribute('uv', new Float32BufferAttribute(new Float32Array((merged.getAttribute('position').count) * 2), 2));
  return merged;
});

export const WHITE = new Color(1, 1, 1);
export const HIGHLIGHT = new Color(1.9, 1.95, 2.05);

export function BenchParts({ children, limit = 400 }: { children: ReactNode; limit?: number }) {
  return (
    <FrontInstances limit={limit} geometry={unitBox()} material={benchFront} castShadow receiveShadow frustumCulled={false}>
      <HandleInstances limit={limit} geometry={handleGeometry()} material={metalChrome} frustumCulled={false}>
        <BoxInstances limit={Math.round(limit / 2)} geometry={drawerBoxGeometry()} material={plasticLightGray} frustumCulled={false}>
          {children}
        </BoxInstances>
      </HandleInstances>
    </FrontInstances>
  );
}
