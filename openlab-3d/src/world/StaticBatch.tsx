/**
 * Draw-call batching for static content. Shortly after mount, every opaque mesh under
 * this group is merged into one geometry per material (world transforms baked in) and
 * the originals are hidden. Subtrees that must stay live are skipped:
 *  - anything inside an Interactable (they animate, outline and raycast individually)
 *  - objects flagged `userData.dynamic` or `userData.noBatch`
 *  - instanced meshes, LODs, troika text, and transparent / transmissive materials
 * The batch is undone on unmount, so hot reloads and room remounts stay correct.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { useThree } from '@react-three/fiber';
import { BufferAttribute, InstancedMesh, LOD, Matrix4, Mesh, type BufferGeometry, type Group, type Material, type Object3D } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const KEEP = new Set(['position', 'normal', 'uv']);

function isTroikaText(o: Object3D): boolean {
  return typeof (o as unknown as { sync?: unknown }).sync === 'function' && 'text' in o;
}

function batchable(material: Material | Material[]): material is Material {
  if (Array.isArray(material)) return false;
  const m = material as Material & { transmission?: number };
  return !m.transparent && !(m.transmission && m.transmission > 0);
}

function prepare(geometry: BufferGeometry, matrix: Matrix4): BufferGeometry | null {
  if (!geometry.getAttribute('position')) return null;
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  for (const name of Object.keys(g.attributes)) if (!KEEP.has(name)) g.deleteAttribute(name);
  g.morphAttributes = {};
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  if (!g.getAttribute('uv')) g.setAttribute('uv', new BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
  g.clearGroups();
  g.applyMatrix4(matrix);
  return g;
}

export function StaticBatch({ children, delayFrames = 2 }: { children: ReactNode; delayFrames?: number }) {
  const root = useRef<Group>(null);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const r = root.current;
    if (!r) return;
    const merged: Mesh[] = [];
    const hidden: Mesh[] = [];
    let frames = delayFrames;
    let raf = 0;

    const run = () => {
      r.updateWorldMatrix(true, true);
      const inverse = new Matrix4().copy(r.matrixWorld).invert();
      const groups = new Map<string, { material: Material; cast: boolean; receive: boolean; geos: BufferGeometry[]; meshes: Mesh[] }>();
      const local = new Matrix4();
      const visit = (o: Object3D) => {
        const data = o.userData as { interactableId?: string; dynamic?: boolean; noBatch?: boolean };
        if (o !== r && (data.interactableId || data.dynamic || data.noBatch)) return;
        if (o instanceof InstancedMesh || o instanceof LOD || isTroikaText(o) || !o.visible) return;
        if (o instanceof Mesh && batchable(o.material)) {
          local.multiplyMatrices(inverse, o.matrixWorld);
          const g = prepare(o.geometry as BufferGeometry, local);
          if (g) {
            const key = `${o.material.uuid}|${o.castShadow ? 1 : 0}${o.receiveShadow ? 1 : 0}`;
            let entry = groups.get(key);
            if (!entry) {
              entry = { material: o.material, cast: o.castShadow, receive: o.receiveShadow, geos: [], meshes: [] };
              groups.set(key, entry);
            }
            entry.geos.push(g);
            entry.meshes.push(o);
          }
        }
        for (const child of o.children) visit(child);
      };
      visit(r);
      for (const entry of groups.values()) {
        if (entry.geos.length < 2) {
          entry.geos.forEach((g) => g.dispose());
          continue;
        }
        const geometry = mergeGeometries(entry.geos, false);
        entry.geos.forEach((g) => g.dispose());
        if (!geometry) continue;
        geometry.computeBoundingSphere();
        const mesh = new Mesh(geometry, entry.material);
        mesh.castShadow = entry.cast;
        mesh.receiveShadow = entry.receive;
        mesh.userData.noBatch = true;
        r.add(mesh);
        merged.push(mesh);
        for (const m of entry.meshes) {
          m.visible = false;
          hidden.push(m);
        }
      }
      // The shadow map is baked; refresh it once with the merged meshes.
      gl.shadowMap.needsUpdate = true;
    };

    const tick = () => {
      frames -= 1;
      if (frames <= 0) run();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      for (const m of merged) {
        r.remove(m);
        m.geometry.dispose();
      }
      for (const m of hidden) m.visible = true;
    };
  }, [delayFrames, gl]);

  return <group ref={root}>{children}</group>;
}
