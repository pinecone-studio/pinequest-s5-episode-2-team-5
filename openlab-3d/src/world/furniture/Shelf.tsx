/**
 * Shelving:
 *  - <ShelvingUnits>: powder-coated steel units (1.8 m × 2.0 m × 0.5 m, 4 shelves) full of
 *    cardboard boxes, bins and glassware, all instanced across every unit in the room.
 *  - <ReagentShelf>: 2-tier island-top rack (2.4 m × 0.6 m × 0.28 m) holding reagent bottles.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { CuboidCollider } from '@react-three/rapier';
import { BoxGeometry, Color, CylinderGeometry, InstancedMesh, Object3D, type BufferGeometry, type Material } from 'three';
import { metalPainted, metalAluminum } from '../../materials/metal';
import { plastic } from '../../materials/plastic';
import { decorGlass } from '../../materials/glass';
import { lazy } from '../../utils/lazy';
import { stockBeakerGeometry, stockFlaskGeometry } from './WallCabinet';

export interface UnitPlacement {
  x: number;
  z: number;
  rotY: number;
}

interface InstanceSpec {
  matrix: Object3D;
  color?: Color;
}

const unit = lazy(() => new BoxGeometry(1, 1, 1));
const bottleGeo = lazy(() => {
  const g = new CylinderGeometry(0.03, 0.03, 0.12, 14);
  g.translate(0, 0.06, 0);
  return g;
});
const capGeo = lazy(() => {
  const g = new CylinderGeometry(0.016, 0.016, 0.025, 10);
  g.translate(0, 0.132, 0);
  return g;
});

/** Seeded pseudo-random so layouts are identical on every load. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function Instanced({ geometry, material, items, castShadow = false }: { geometry: BufferGeometry; material: Material; items: InstanceSpec[]; castShadow?: boolean }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => {
      it.matrix.updateMatrix();
      mesh.setMatrixAt(i, it.matrix.matrix);
      if (it.color) mesh.setColorAt(i, it.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  if (items.length === 0) return null;
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={castShadow} receiveShadow userData={{ noOutline: true }} />;
}

function place(u: UnitPlacement, lx: number, ly: number, lz: number, sx: number, sy: number, sz: number, rot = 0): Object3D {
  const o = new Object3D();
  const c = Math.cos(u.rotY);
  const s = Math.sin(u.rotY);
  o.position.set(u.x + lx * c + lz * s, ly, u.z - lx * s + lz * c);
  o.rotation.y = u.rotY + rot;
  o.scale.set(sx, sy, sz);
  return o;
}

const BOX_COLORS = ['#c89f6d', '#b88d5c', '#d4b083', '#a87c4f', '#e5e0d6', '#5b8fd8', '#e0e3e6'];

export function ShelvingUnits({ units, width = 1.8, height = 2.0, depth = 0.5, levels = 4, seed = 7 }: { units: UnitPlacement[]; width?: number; height?: number; depth?: number; levels?: number; seed?: number }) {
  // Decorative stock uses alpha glass: transmission would re-render the whole room for it.
  const glass = decorGlass('#eef8fb');
  const data = useMemo(() => {
    const rnd = seeded(seed);
    const frame: InstanceSpec[] = [];
    const boxes: InstanceSpec[] = [];
    const beakers: InstanceSpec[] = [];
    const flasks: InstanceSpec[] = [];
    for (const u of units) {
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          frame.push({ matrix: place(u, (sx * (width - 0.04)) / 2, height / 2, (sz * (depth - 0.04)) / 2, 0.035, height, 0.035) });
        }
      }
      for (let l = 0; l < levels; l++) {
        const y = 0.12 + (l * (height - 0.2)) / (levels - 1);
        frame.push({ matrix: place(u, 0, y, 0, width, 0.025, depth) });
        if (l === levels - 1) continue;
        const shelfTop = y + 0.0125;
        const clearance = (height - 0.2) / (levels - 1) - 0.05;
        // Fill each shelf: mostly boxes, sometimes a row of glassware.
        if (rnd() < 0.28) {
          const n = 7 + Math.floor(rnd() * 4);
          for (let k = 0; k < n; k++) {
            const lx = -width / 2 + 0.12 + (k * (width - 0.24)) / (n - 1);
            const target = rnd() < 0.5 ? beakers : flasks;
            const sc = 0.9 + rnd() * 0.5;
            target.push({ matrix: place(u, lx, shelfTop, (rnd() - 0.5) * 0.15, sc, sc, sc) });
          }
        } else {
          let cursor = -width / 2 + 0.04;
          while (cursor < width / 2 - 0.2) {
            const bw = 0.22 + rnd() * 0.3;
            if (cursor + bw > width / 2 - 0.03) break;
            const bh = Math.min(clearance, 0.12 + rnd() * 0.25);
            const bd = depth * (0.6 + rnd() * 0.3);
            boxes.push({
              matrix: place(u, cursor + bw / 2, shelfTop + bh / 2, (rnd() - 0.5) * 0.05, bw, bh, bd, (rnd() - 0.5) * 0.08),
              color: new Color(BOX_COLORS[Math.floor(rnd() * BOX_COLORS.length)]),
            });
            cursor += bw + 0.03 + rnd() * 0.05;
          }
        }
      }
    }
    return { frame, boxes, beakers, flasks };
  }, [units, width, height, depth, levels, seed]);

  return (
    <group>
      <Instanced geometry={unit()} material={metalPainted} items={data.frame} castShadow />
      <Instanced geometry={unit()} material={plastic('#ffffff', 0.85)} items={data.boxes} castShadow />
      <Instanced geometry={stockBeakerGeometry()} material={glass} items={data.beakers} />
      <Instanced geometry={stockFlaskGeometry()} material={glass} items={data.flasks} />
      {units.map((u, i) => (
        <CuboidCollider key={i} args={[width / 2, height / 2, depth / 2]} position={[u.x, height / 2, u.z]} rotation={[0, u.rotY, 0]} />
      ))}
    </group>
  );
}

const BOTTLE_COLORS = ['#7a4a1c', '#7a4a1c', '#e9eef2', '#2b6fd6', '#7a4a1c', '#e9eef2', '#1f9d55'];

/** Two-tier reagent rack centered on an island top (origin = bench top center). */
export function ReagentShelf({ position, rotY = 0, width = 2.2, seed = 3 }: { position: [number, number, number]; rotY?: number; width?: number; seed?: number }) {
  const data = useMemo(() => {
    const rnd = seeded(seed);
    const u: UnitPlacement = { x: position[0], z: position[2], rotY };
    const frame: InstanceSpec[] = [];
    const bottles: InstanceSpec[] = [];
    const caps: InstanceSpec[] = [];
    const y0 = position[1];
    for (const sx of [-1, 1]) frame.push({ matrix: place(u, (sx * width) / 2, y0 + 0.3, 0, 0.02, 0.6, 0.26) });
    for (const h of [0.28, 0.58]) {
      frame.push({ matrix: place(u, 0, y0 + h, 0, width, 0.015, 0.26) });
      const n = Math.floor(width / 0.09);
      for (let k = 0; k < n; k++) {
        if (rnd() < 0.15) continue;
        const lx = -width / 2 + 0.06 + k * ((width - 0.12) / (n - 1));
        const s = 0.85 + rnd() * 0.3;
        bottles.push({ matrix: place(u, lx, y0 + h + 0.008, (rnd() - 0.5) * 0.08, s, s, s), color: new Color(BOTTLE_COLORS[Math.floor(rnd() * BOTTLE_COLORS.length)]) });
        caps.push({ matrix: place(u, lx, y0 + h + 0.008, (rnd() - 0.5) * 0.001, s, s, s), color: new Color(rnd() < 0.5 ? '#111' : '#c0262d') });
      }
    }
    // Keep caps aligned with their bottles.
    caps.forEach((c, i) => c.matrix.position.copy(bottles[i].matrix.position));
    return { frame, bottles, caps };
  }, [position, rotY, width, seed]);
  return (
    <group>
      <Instanced geometry={unit()} material={metalAluminum} items={data.frame} castShadow />
      <Instanced geometry={bottleGeo()} material={plastic('#ffffff', 0.25)} items={data.bottles} castShadow />
      <Instanced geometry={capGeo()} material={plastic('#ffffff', 0.5)} items={data.caps} />
    </group>
  );
}
