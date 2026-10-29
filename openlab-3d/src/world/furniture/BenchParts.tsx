/**
 * Instanced parts shared by all benches/cabinets in a room: drawer and door fronts with
 * a raised center panel, chrome bar handles, open-top drawer boxes with a rubber liner,
 * and the brushed-metal holders of the category labels. A room wraps its furniture in
 * <BenchParts> so hundreds of fronts cost only a handful of draw calls.
 */
import type { ReactNode } from 'react';
import { create } from 'zustand';
import { createInstances } from '@react-three/drei';
import { BoxGeometry, BufferGeometry, Color, CylinderGeometry, Float32BufferAttribute, MeshStandardMaterial, PlaneGeometry } from 'three';
import { STORAGE_INFO, type StorageCategory } from '../../interaction/holders';
import { plateTexture } from '../../utils/textures';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { benchFront, plasticLightGray } from '../../materials/plastic';
import { metalBrushed, metalChrome } from '../../materials/metal';
import { lazy } from '../../utils/lazy';

const [FrontInstances, FrontInstance] = createInstances();
const [HandleInstances, HandleInstance] = createInstances();
const [BoxInstances, BoxInstance] = createInstances();
const [PanelInstances, PanelInstance] = createInstances();
const [LinerInstances, LinerInstance] = createInstances();
const [HolderInstances, HolderInstance] = createInstances();

export { FrontInstance, HandleInstance, BoxInstance, PanelInstance, LinerInstance, HolderInstance };

/**
 * Instanced copies of shared materials. three.js compiles a separate shader for instanced
 * meshes, so a material drawn both here and on plain meshes (metal tools, burners) would
 * switch shaders and rebuild its parameters on every such draw.
 */
const frontMaterial = benchFront.clone();
const handleMaterial = metalChrome.clone();
const boxMaterial = plasticLightGray.clone();
const holderMaterial = metalBrushed.clone();

/** Raised center panel of a front: white base, painted with the same per-module pastel as its frame. */
const panelMaterial = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.45 });
/** Ribbed rubber mat on the floor of a drawer tray. */
const linerMaterial = new MeshStandardMaterial({ color: '#2b2f35', roughness: 0.95 });

const LABEL_CATEGORIES = (Object.keys(STORAGE_INFO) as StorageCategory[]).filter((c) => c !== 'rack');
const LABEL_SETS = Object.fromEntries(LABEL_CATEGORIES.map((c) => [c, createInstances()])) as Record<StorageCategory, ReturnType<typeof createInstances>>;
const labelGeometry = lazy(() => new PlaneGeometry(1, 1));
const labelMaterials = new Map<StorageCategory, MeshStandardMaterial>();
function labelMaterial(c: StorageCategory): MeshStandardMaterial {
  let m = labelMaterials.get(c);
  if (!m) {
    m = new MeshStandardMaterial({ map: plateTexture(STORAGE_INFO[c].label, STORAGE_INFO[c].color), roughness: 0.6 });
    labelMaterials.set(c, m);
  }
  return m;
}

/** Category plate on a drawer front or cabinet door (instanced per category). */
export function LabelPlate({ category, position, scale }: { category: StorageCategory; position: [number, number, number]; scale: [number, number, number] }) {
  const set = LABEL_SETS[category];
  if (!set) return null;
  const Instance = set[1];
  return <Instance position={position} scale={scale} />;
}

function LabelProviders({ children, limit }: { children: ReactNode; limit: number }) {
  return LABEL_CATEGORIES.reduce<ReactNode>((inner, c) => {
    const Provider = LABEL_SETS[c][0];
    return (
      <Provider key={c} limit={limit} frames={SYNC_FRAMES} geometry={labelGeometry()} material={labelMaterial(c)} frustumCulled={false}>
        {inner}
      </Provider>
    );
  }, children);
}

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

/** Wall and floor thickness of the drawer tray, as a fraction of its size. */
export const TRAY_WALL = 0.025;

/** Open-top drawer tray of unit size (centered, open at +y). */
export const drawerBoxGeometry = lazy(() => {
  const t = TRAY_WALL;
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
/** Focused fronts brighten slightly with a cool tint (not a white flash). */
export const HIGHLIGHT = new Color(1.22, 1.3, 1.45);

/**
 * drei's providers recompute and re-upload every instance matrix each frame by default.
 * Here they sync for a couple of frames after each render, and BenchParts re-renders only
 * when something asks for it (a drawer or door moving, a front's tint changing).
 */
const SYNC_FRAMES = 2;
export const useBenchSync = create<{ version: number }>()(() => ({ version: 0 }));
let syncQueued = false;

/** Re-sync the bench instances on the next frames (cheap to call every frame while moving). */
export function syncBenchParts(): void {
  if (syncQueued) return;
  syncQueued = true;
  queueMicrotask(() => {
    syncQueued = false;
    useBenchSync.setState((s) => ({ version: s.version + 1 }));
  });
}

export function BenchParts({ children, limit = 400 }: { children: ReactNode; limit?: number }) {
  // Subscribing re-renders the providers, which restarts their sync frames.
  useBenchSync((s) => s.version);
  const f = SYNC_FRAMES;
  return (
    <FrontInstances limit={limit} frames={f} geometry={unitBox()} material={frontMaterial} castShadow receiveShadow frustumCulled={false}>
      <HandleInstances limit={limit} frames={f} geometry={handleGeometry()} material={handleMaterial} frustumCulled={false}>
        <BoxInstances limit={Math.round(limit / 2)} frames={f} geometry={drawerBoxGeometry()} material={boxMaterial} frustumCulled={false}>
          <PanelInstances limit={limit} frames={f} geometry={unitBox()} material={panelMaterial} castShadow receiveShadow frustumCulled={false}>
            <LinerInstances limit={Math.round(limit / 2)} frames={f} geometry={unitBox()} material={linerMaterial} receiveShadow frustumCulled={false}>
              <HolderInstances limit={limit} frames={f} geometry={unitBox()} material={holderMaterial} frustumCulled={false}>
                <LabelProviders limit={64}>{children}</LabelProviders>
              </HolderInstances>
            </LinerInstances>
          </PanelInstances>
        </BoxInstances>
      </HandleInstances>
    </FrontInstances>
  );
}
