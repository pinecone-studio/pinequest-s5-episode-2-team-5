import type { Obstacle, Point } from './world-config';

/**
 * Walkability grid + A* so avatars walk around buildings, trees and water
 * instead of through them.
 */
export interface NavGrid {
  cols: number;
  rows: number;
  cell: number;
  blocked: Uint8Array;
}

interface GridOptions {
  width: number;
  height: number;
  cell: number;
  /** Extra clearance around obstacles (roughly the avatar's half-width). */
  padding: number;
  /** Keep avatars this far from the map edge. */
  margin: number;
  /** Open pockets that can't be reached from here get blocked too. */
  reachableFrom: Point;
}

export function buildNavGrid(obstacles: Obstacle[], options: GridOptions): NavGrid {
  const { width, height, cell, padding, margin, reachableFrom } = options;
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const blocked = new Uint8Array(cols * rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) * cell;
      const y = (r + 0.5) * cell;
      const outside = x < margin || y < margin || x > width - margin || y > height - margin;
      if (outside || obstacles.some((o) => hits(o, x, y, padding))) blocked[r * cols + c] = 1;
    }
  }

  const grid = { cols, rows, cell, blocked };
  blockUnreachable(grid, reachableFrom);
  return grid;
}

function blockUnreachable(grid: NavGrid, from: Point) {
  const seen = new Uint8Array(grid.blocked.length);
  const startC = Math.floor(from.x / grid.cell);
  const startR = Math.floor(from.y / grid.cell);
  if (!cellOpen(grid, startC, startR)) return;
  const queue = [startR * grid.cols + startC];
  seen[queue[0]] = 1;
  while (queue.length > 0) {
    const idx = queue.pop()!;
    const c = idx % grid.cols;
    const r = Math.floor(idx / grid.cols);
    for (const [dc, dr] of NEIGHBORS.slice(0, 4)) {
      const next = (r + dr) * grid.cols + (c + dc);
      if (cellOpen(grid, c + dc, r + dr) && !seen[next]) {
        seen[next] = 1;
        queue.push(next);
      }
    }
  }
  for (let i = 0; i < grid.blocked.length; i++) if (!seen[i]) grid.blocked[i] = 1;
}

function hits(o: Obstacle, x: number, y: number, pad: number): boolean {
  if (o.kind === 'rect') {
    return x >= o.x - pad && x <= o.x + o.w + pad && y >= o.y - pad && y <= o.y + o.h + pad;
  }
  const dx = (x - o.x) / (o.rx + pad);
  const dy = (y - o.y) / (o.ry + pad);
  return dx * dx + dy * dy <= 1;
}

function cellOpen(grid: NavGrid, c: number, r: number): boolean {
  return c >= 0 && r >= 0 && c < grid.cols && r < grid.rows && grid.blocked[r * grid.cols + c] === 0;
}

export function isWalkable(grid: NavGrid, p: Point): boolean {
  return cellOpen(grid, Math.floor(p.x / grid.cell), Math.floor(p.y / grid.cell));
}

/** The closest open spot to `p` (p itself when it's already open). */
export function nearestWalkable(grid: NavGrid, p: Point): Point {
  if (isWalkable(grid, p)) return p;
  const c0 = Math.floor(p.x / grid.cell);
  const r0 = Math.floor(p.y / grid.cell);
  const maxRadius = Math.max(grid.cols, grid.rows);
  let best: Point | null = null;
  let bestDist = Infinity;
  for (let radius = 1; radius < maxRadius; radius++) {
    // Square rings reach diagonals early, so keep scanning until a ring can't beat the best.
    if (best && (radius - 1) * grid.cell > Math.sqrt(bestDist)) break;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== radius || !cellOpen(grid, c0 + dc, r0 + dr)) continue;
        const candidate = { x: (c0 + dc + 0.5) * grid.cell, y: (r0 + dr + 0.5) * grid.cell };
        const dist = (candidate.x - p.x) ** 2 + (candidate.y - p.y) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          best = candidate;
        }
      }
    }
  }
  return best ?? p;
}

function lineOfSight(grid: NavGrid, a: Point, b: Point): boolean {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (grid.cell * 0.4));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!isWalkable(grid, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return false;
  }
  return true;
}

const NEIGHBORS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
] as const;

/**
 * Waypoints from `from` to (the open spot nearest) `to`, excluding `from`.
 * Returns [] when there is no route.
 */
export function findPath(grid: NavGrid, from: Point, to: Point): Point[] {
  const start = isWalkable(grid, from) ? from : nearestWalkable(grid, from);
  const goal = nearestWalkable(grid, to);
  const prefix = start === from ? [] : [start];
  if (lineOfSight(grid, start, goal)) return [...prefix, goal];

  const { cols, cell } = grid;
  const startIdx = Math.floor(start.y / cell) * cols + Math.floor(start.x / cell);
  const goalC = Math.floor(goal.x / cell);
  const goalR = Math.floor(goal.y / cell);
  const goalIdx = goalR * cols + goalC;

  const g = new Float32Array(grid.blocked.length).fill(Infinity);
  const cameFrom = new Int32Array(grid.blocked.length).fill(-1);
  const closed = new Uint8Array(grid.blocked.length);
  const heap = new MinHeap();

  const heuristic = (c: number, r: number) => {
    const dx = Math.abs(c - goalC);
    const dy = Math.abs(r - goalR);
    return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
  };

  g[startIdx] = 0;
  heap.push(startIdx, heuristic(startIdx % cols, Math.floor(startIdx / cols)));

  while (heap.size > 0) {
    const current = heap.pop();
    if (current === goalIdx) break;
    if (closed[current]) continue;
    closed[current] = 1;
    const c = current % cols;
    const r = Math.floor(current / cols);

    for (const [dc, dr, cost] of NEIGHBORS) {
      const nc = c + dc;
      const nr = r + dr;
      if (!cellOpen(grid, nc, nr)) continue;
      // No cutting corners past an obstacle.
      if (dc !== 0 && dr !== 0 && (!cellOpen(grid, c + dc, r) || !cellOpen(grid, c, r + dr))) continue;
      const next = nr * cols + nc;
      const tentative = g[current] + cost;
      if (tentative < g[next]) {
        g[next] = tentative;
        cameFrom[next] = current;
        heap.push(next, tentative + heuristic(nc, nr));
      }
    }
  }

  if (goalIdx === startIdx) return [...prefix, goal];
  if (cameFrom[goalIdx] === -1) return [];

  const cells: Point[] = [];
  for (let idx = goalIdx; idx !== -1 && idx !== startIdx; idx = cameFrom[idx]) {
    cells.push({ x: ((idx % cols) + 0.5) * cell, y: (Math.floor(idx / cols) + 0.5) * cell });
  }
  cells.reverse();
  cells[cells.length - 1] = goal;

  // String-pull: keep only the corners we can't see past.
  const smoothed: Point[] = [];
  let anchor = start;
  for (let i = 0; i < cells.length - 1; i++) {
    if (!lineOfSight(grid, anchor, cells[i + 1])) {
      smoothed.push(cells[i]);
      anchor = cells[i];
    }
  }
  smoothed.push(goal);
  return [...prefix, ...smoothed];
}

class MinHeap {
  private items: number[] = [];
  private priorities: number[] = [];

  get size() {
    return this.items.length;
  }

  push(item: number, priority: number) {
    this.items.push(item);
    this.priorities.push(priority);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.priorities[parent] <= this.priorities[i]) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): number {
    const top = this.items[0];
    const lastItem = this.items.pop()!;
    const lastPriority = this.priorities.pop()!;
    if (this.items.length > 0) {
      this.items[0] = lastItem;
      this.priorities[0] = lastPriority;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = left + 1;
        let smallest = i;
        if (left < this.items.length && this.priorities[left] < this.priorities[smallest]) smallest = left;
        if (right < this.items.length && this.priorities[right] < this.priorities[smallest]) smallest = right;
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  private swap(a: number, b: number) {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    [this.priorities[a], this.priorities[b]] = [this.priorities[b], this.priorities[a]];
  }
}

/** A random open spot within `radius` of `around`. */
export function randomWalkable(grid: NavGrid, around: Point, radius: number, rand = Math.random): Point {
  for (let attempt = 0; attempt < 20; attempt++) {
    const angle = rand() * Math.PI * 2;
    const dist = radius * Math.sqrt(rand());
    const p = { x: around.x + Math.cos(angle) * dist, y: around.y + Math.sin(angle) * dist };
    if (isWalkable(grid, p)) return p;
  }
  return nearestWalkable(grid, around);
}
