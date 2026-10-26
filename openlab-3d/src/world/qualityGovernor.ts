/**
 * Decision logic of the frame-rate governor, kept free of React and three.js so it can be
 * unit-tested. The caller measures frame rates over fixed windows and feeds each result in;
 * the governor answers with the ladder level to switch to (or null to stay).
 */
import type { Quality } from '../store/useSettingsStore';

export interface Level {
  quality: Quality;
  /** Cap on the device pixel ratio. */
  dpr: number;
}

/**
 * Auto mode, best to worst. Sharpness comes first: effects step down (High → Medium → Low)
 * while the image stays at 1.5×, and resolution only drops after that, never below 1×,
 * where the lab turns visibly soft and blocky.
 */
export const AUTO_LADDER: Level[] = [
  { quality: 'high', dpr: 2 },
  { quality: 'high', dpr: 1.5 },
  { quality: 'medium', dpr: 1.5 },
  { quality: 'low', dpr: 1.5 },
  { quality: 'low', dpr: 1.25 },
  { quality: 'low', dpr: 1 },
];

/** A manually chosen tier keeps its effects and only adapts the resolution within its range. */
export function manualLadder(quality: Quality, [min, max]: [number, number]): Level[] {
  return [max, 1.5, 1, 0.75, min].filter((d) => d <= max && d >= min).map((dpr) => ({ quality, dpr }));
}

/** Distinct levels on this screen (a 1× display has no 1.5× level). */
export function ladderFor(steps: Level[], device: number): Level[] {
  const seen = new Set<string>();
  return steps
    .map((l) => ({ quality: l.quality, dpr: Math.min(device, l.dpr) }))
    .filter((l) => {
      const key = `${l.quality}@${l.dpr}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export const GOVERNOR = {
  /** Length of one measurement window, s. */
  windowS: 2,
  /** Frames right after a change are ignored (shader compiles, buffer resizes), s. */
  settleS: 2.5,
  /** A steady 40+ fps sharp image beats a blurry 60. */
  slowFps: 40,
  fastFps: 55,
  /** Slow windows in a row before stepping down. */
  slowWindows: 2,
  /** Fast windows in a row before trying one step up. */
  fastWindows: 5,
};

/**
 * Steps down after two slow windows in a row and, after five fast ones, tries one level up.
 * A failed try goes straight back down. A level that failed is not retried if it changes the
 * effects tier (that recompiles shaders), and at most twice if it only changes resolution,
 * so the quality never flip-flops.
 */
export class FrameGovernor {
  readonly ladder: Level[];
  level: number;
  private failures: number[];
  private slow = 0;
  private fast = 0;
  private probeFrom = -1;
  private probeWindows = 0;

  constructor(ladder: Level[], start = 0) {
    this.ladder = ladder;
    this.level = Math.min(Math.max(0, start), ladder.length - 1);
    this.failures = ladder.map(() => 0);
  }

  /** Feed the frame rate of one finished window; returns the level to switch to, or null. */
  onWindow(fps: number): number | null {
    if (fps < GOVERNOR.slowFps) {
      this.fast = 0;
      if (++this.slow < GOVERNOR.slowWindows && this.probeFrom < 0) return null;
      this.failures[this.level]++;
      const down = this.probeFrom >= 0 ? this.probeFrom : this.level + 1;
      this.probeFrom = -1;
      return down < this.ladder.length ? this.move(down) : null;
    }
    this.slow = 0;
    if (this.probeFrom >= 0 && ++this.probeWindows >= 2) this.probeFrom = -1;
    if (fps < GOVERNOR.fastFps || ++this.fast < GOVERNOR.fastWindows || this.level === 0) return null;
    const up = this.level - 1;
    const sameTier = this.ladder[up].quality === this.ladder[this.level].quality;
    if (this.failures[up] >= (sameTier ? 2 : 1)) return null;
    const from = this.level;
    this.move(up);
    this.probeFrom = from;
    this.probeWindows = 0;
    return up;
  }

  private move(level: number): number {
    this.level = level;
    this.slow = 0;
    this.fast = 0;
    return level;
  }
}
