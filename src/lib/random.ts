/** Small seeded PRNG (mulberry32) so decorations land in the same place every render. */
export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An id like "mh2k4f0a-x7q1k9p2c3" for records made on this device. Unique enough, not secret. */
export function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function pick<T>(items: readonly T[], rand: () => number = Math.random): T {
  return items[Math.floor(rand() * items.length)];
}

export function between(min: number, max: number, rand: () => number = Math.random): number {
  return min + (max - min) * rand();
}
