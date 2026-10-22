/**
 * Window glazing for every window opening: aluminum frames (5 cm), a mullion on wide
 * windows, a 25 cm interior sill, and a single glass pane. All frames are merged into
 * one mesh and all panes into another.
 */
import { useMemo } from 'react';
import { MeshStandardMaterial } from 'three';
import { WALL_THICKNESS } from '../../utils/constants';
import { windowGlass } from '../../materials/glass';
import { WALLS, type WallDef } from '../layout';
import { mergePieces, type Piece } from './Wall';

const frameMaterial = new MeshStandardMaterial({ color: '#c9ced4', metalness: 0.6, roughness: 0.35 });
const sillMaterial = new MeshStandardMaterial({ color: '#e3e6ea', roughness: 0.5 });

function box(wall: WallDef, s: number, y: number, len: number, h: number, depth: number, offset = 0): Piece {
  return wall.axis === 'x'
    ? { cx: s, cy: y, cz: wall.at + offset, sx: len, sy: h, sz: depth }
    : { cx: wall.at + offset, cy: y, cz: s, sx: depth, sy: h, sz: len };
}

export function windowPieces(): { frames: Piece[]; sills: Piece[]; panes: Piece[] } {
  const frames: Piece[] = [];
  const sills: Piece[] = [];
  const panes: Piece[] = [];
  const f = 0.05;
  for (const wall of WALLS) {
    for (const o of wall.openings) {
      if (o.kind !== 'window') continue;
      const h = o.head - o.sill;
      const yMid = (o.sill + o.head) / 2;
      const depth = WALL_THICKNESS * 0.6;
      frames.push(box(wall, o.center, o.head - f / 2, o.width, f, depth));
      frames.push(box(wall, o.center, o.sill + f / 2, o.width, f, depth));
      frames.push(box(wall, o.center - o.width / 2 + f / 2, yMid, f, h, depth));
      frames.push(box(wall, o.center + o.width / 2 - f / 2, yMid, f, h, depth));
      const mullions = Math.floor(o.width / 1.5);
      for (let m = 1; m <= mullions; m++) {
        const s = o.center - o.width / 2 + (o.width * m) / (mullions + 1);
        frames.push(box(wall, s, yMid, f * 0.8, h, depth * 0.9));
      }
      if (o.sill > 0.2) {
        // Sills on both sides for interior windows, inside only (both, harmlessly) for exterior.
        sills.push(box(wall, o.center, o.sill - 0.015, o.width + 0.1, 0.03, WALL_THICKNESS + 0.18));
      }
      panes.push(box(wall, o.center, yMid, o.width - f, h - f, 0.012));
    }
  }
  return { frames, sills, panes };
}

export function Windows() {
  const geos = useMemo(() => {
    const p = windowPieces();
    return { frames: mergePieces(p.frames), sills: mergePieces(p.sills), panes: mergePieces(p.panes) };
  }, []);
  return (
    <group>
      <mesh geometry={geos.frames} material={frameMaterial} castShadow />
      <mesh geometry={geos.sills} material={sillMaterial} receiveShadow />
      <mesh geometry={geos.panes} material={windowGlass} renderOrder={2} userData={{ noOutline: true }} />
    </group>
  );
}
