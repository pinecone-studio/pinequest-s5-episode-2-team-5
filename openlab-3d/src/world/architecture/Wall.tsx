/**
 * Walls: every wall in the floor plan is split into solid pieces around its door and
 * window openings, then all pieces are merged into ONE mesh (one draw call) plus a
 * baseboard trim mesh. Each solid piece and each window opening gets a static collider.
 * Walls are 0.2 m thick and 3.2 m tall.
 */
import { useMemo } from 'react';
import { CuboidCollider } from '@react-three/rapier';
import { BoxGeometry, MeshStandardMaterial, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WALL_HEIGHT, WALL_THICKNESS } from '../../utils/constants';
import { LAB } from '../../materials/labPalette';
import { WALLS, type WallDef } from '../layout';

export interface Piece {
  /** Center in world space. */
  cx: number;
  cy: number;
  cz: number;
  /** Size along world x, y, z. */
  sx: number;
  sy: number;
  sz: number;
}

const wallMaterial = new MeshStandardMaterial({ color: LAB.wall, roughness: 0.92 });
const trimMaterial = new MeshStandardMaterial({ color: '#9aa1a8', roughness: 0.6 });

/** Convert a span along a wall (s0..s1, y0..y1, thickness t) into a world-space box. */
function piece(wall: WallDef, s0: number, s1: number, y0: number, y1: number, t = WALL_THICKNESS, offset = 0): Piece {
  const len = s1 - s0;
  const mid = (s0 + s1) / 2;
  if (wall.axis === 'x') {
    return { cx: mid, cy: (y0 + y1) / 2, cz: wall.at + offset, sx: len, sy: y1 - y0, sz: t };
  }
  return { cx: wall.at + offset, cy: (y0 + y1) / 2, cz: mid, sx: t, sy: y1 - y0, sz: len };
}

/** Solid wall pieces (for rendering) and collider pieces for one wall. */
export function wallPieces(wall: WallDef): { solids: Piece[]; colliders: Piece[]; trims: Piece[] } {
  const H = WALL_HEIGHT;
  const start = wall.from - WALL_THICKNESS / 2;
  const end = wall.to + WALL_THICKNESS / 2;
  const openings = [...wall.openings].sort((a, b) => a.center - b.center);
  const solids: Piece[] = [];
  const colliders: Piece[] = [];
  const trims: Piece[] = [];
  let cursor = start;
  const addSolid = (s0: number, s1: number) => {
    if (s1 - s0 <= 0.001) return;
    solids.push(piece(wall, s0, s1, 0, H));
    colliders.push(piece(wall, s0, s1, 0, H));
    // Baseboards on both faces.
    for (const side of [-1, 1]) trims.push(piece(wall, s0, s1, 0, 0.1, 0.014, side * (WALL_THICKNESS / 2 + 0.007)));
  };
  for (const o of openings) {
    const o0 = o.center - o.width / 2;
    const o1 = o.center + o.width / 2;
    addSolid(cursor, o0);
    if (o.kind === 'door') {
      solids.push(piece(wall, o0, o1, o.height, H));
    } else if (o.kind === 'window') {
      if (o.sill > 0.001) {
        solids.push(piece(wall, o0, o1, 0, o.sill));
        for (const side of [-1, 1]) trims.push(piece(wall, o0, o1, 0, 0.1, 0.014, side * (WALL_THICKNESS / 2 + 0.007)));
      }
      solids.push(piece(wall, o0, o1, o.head, H));
      // You can't walk through glass.
      colliders.push(piece(wall, o0, o1, 0, H));
    } else {
      solids.push(piece(wall, o0, o1, 2.8, H));
    }
    cursor = o1;
  }
  addSolid(cursor, end);
  return { solids, colliders, trims };
}

export function mergePieces(pieces: Piece[]): BufferGeometry {
  const geos = pieces.map((p) => {
    const g = new BoxGeometry(p.sx, p.sy, p.sz);
    g.translate(p.cx, p.cy, p.cz);
    return g;
  });
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  if (!merged) throw new Error('Failed to merge wall geometry');
  merged.computeBoundingSphere();
  return merged;
}

/** A single wall (used for previews); the facility uses <Walls/> which merges all of them. */
export function Wall({ def }: { def: WallDef }) {
  const { geometry, colliders } = useMemo(() => {
    const p = wallPieces(def);
    return { geometry: mergePieces(p.solids), colliders: p.colliders };
  }, [def]);
  return (
    <group>
      <mesh geometry={geometry} material={wallMaterial} receiveShadow castShadow />
      {colliders.map((c, i) => (
        <CuboidCollider key={i} args={[c.sx / 2, c.sy / 2, c.sz / 2]} position={[c.cx, c.cy, c.cz]} />
      ))}
    </group>
  );
}

/** All facility walls as two merged meshes plus static colliders. */
export function Walls() {
  const { wallGeo, trimGeo, colliders } = useMemo(() => {
    const solids: Piece[] = [];
    const trims: Piece[] = [];
    const cols: Piece[] = [];
    for (const w of WALLS) {
      const p = wallPieces(w);
      solids.push(...p.solids);
      trims.push(...p.trims);
      cols.push(...p.colliders);
    }
    return { wallGeo: mergePieces(solids), trimGeo: mergePieces(trims), colliders: cols };
  }, []);
  return (
    <group>
      <mesh geometry={wallGeo} material={wallMaterial} receiveShadow castShadow />
      <mesh geometry={trimGeo} material={trimMaterial} />
      {colliders.map((c, i) => (
        <CuboidCollider key={i} args={[c.sx / 2, c.sy / 2, c.sz / 2]} position={[c.cx, c.cy, c.cz]} />
      ))}
    </group>
  );
}
