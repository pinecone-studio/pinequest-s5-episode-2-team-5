/**
 * Merged drawing of still holder contents: one mesh per material instead of one per part
 * (a drawer of glassware is otherwise ~40 draw calls). The originals stay in place on
 * MERGED_LAYER, where the camera skips them but the focus raycasts still find them.
 */
import { BufferAttribute, InstancedMesh, Matrix4, Mesh, type BufferGeometry, type Material, type Object3D } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Layer of stored meshes that their holder draws through a merged copy. The camera skips
 * it; the focus and pointer raycasters enable it, so items can still be aimed at.
 */
export const MERGED_LAYER = 1;

export interface StillBatch {
  merged: Mesh[];
  originals: Mesh[];
}

const KEEP = new Set(['position', 'normal', 'uv']);
const noRaycast = () => {};

function isTroikaText(o: Object3D): boolean {
  return typeof (o as unknown as { sync?: unknown }).sync === 'function' && 'text' in o;
}

/** A copy in the root's space with only the attributes every part has. */
function prepare(geometry: BufferGeometry, matrix: Matrix4): BufferGeometry {
  const g = geometry.clone();
  for (const name of Object.keys(g.attributes)) if (!KEEP.has(name)) g.deleteAttribute(name);
  g.morphAttributes = {};
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  if (!g.getAttribute('uv')) g.setAttribute('uv', new BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
  g.clearGroups();
  g.applyMatrix4(matrix);
  return g;
}

/**
 * Merge the meshes under `root` by material and draw order. Name tags, focus outlines and
 * markers drawn on top of everything (depthTest off) are left as they are.
 */
export function mergeStill(root: Object3D, batch: StillBatch): void {
  unmerge(root, batch);
  root.updateWorldMatrix(true, true);
  const inverse = new Matrix4().copy(root.matrixWorld).invert();
  const local = new Matrix4();
  const sets = new Map<string, { material: Material; renderOrder: number; meshes: Mesh[] }>();
  const visit = (o: Object3D) => {
    const data = o.userData as { isOutline?: boolean; stillMerged?: boolean };
    if (!o.visible || data.isOutline || data.stillMerged || isTroikaText(o)) return;
    if (o instanceof Mesh && !(o instanceof InstancedMesh) && !Array.isArray(o.material) && o.material.depthTest && o.geometry.getAttribute('position')) {
      // Indexed and plain geometries cannot be merged together.
      const key = `${o.material.uuid}|${o.renderOrder}|${o.geometry.index ? 1 : 0}`;
      let set = sets.get(key);
      if (!set) sets.set(key, (set = { material: o.material, renderOrder: o.renderOrder, meshes: [] }));
      set.meshes.push(o);
    }
    for (const child of o.children) visit(child);
  };
  for (const child of root.children) visit(child);

  for (const set of sets.values()) {
    if (set.meshes.length < 2) continue;
    const parts = set.meshes.map((m) => prepare(m.geometry as BufferGeometry, local.multiplyMatrices(inverse, m.matrixWorld)));
    const geometry = mergeGeometries(parts, false);
    parts.forEach((g) => g.dispose());
    if (!geometry) continue;
    geometry.computeBoundingSphere();
    const mesh = new Mesh(geometry, set.material);
    mesh.renderOrder = set.renderOrder;
    mesh.raycast = noRaycast;
    mesh.userData = { noOutline: true, noBatch: true, stillMerged: true };
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
    mesh.matrixWorld.copy(root.matrixWorld);
    batch.merged.push(mesh);
    for (const m of set.meshes) {
      m.layers.set(MERGED_LAYER);
      batch.originals.push(m);
    }
  }
}

/** Back to drawing the originals (before a rebuild, or for good on unmount). */
export function unmerge(root: Object3D, batch: StillBatch): void {
  for (const mesh of batch.merged) {
    root.remove(mesh);
    mesh.geometry.dispose();
  }
  for (const m of batch.originals) m.layers.set(0);
  batch.merged.length = 0;
  batch.originals.length = 0;
}
