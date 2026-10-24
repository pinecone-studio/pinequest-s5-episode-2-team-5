/** Presentation only: no effect can create gas, foam, or reaction progress. */
export function reactionIntensity(rate: number): number {
  return Number.isFinite(rate) && rate > 0 ? Math.min(1, Math.sqrt(rate * 1600)) : 0;
}

export function bubblePose(index: number, time: number, radius: number, bottom: number, surface: number, intensity: number, reduced: boolean) {
  const seed = (Math.sin(index * 127.1 + 31.7) * 43758.5453) % 1;
  const variation = Math.abs(seed);
  const travel = Math.max(.003, surface - bottom);
  const speed = (reduced ? .018 : .025 + variation * .035);
  const phase = (time * speed / travel + index * .618034) % 1;
  const angle = index * 2.39996 + (reduced ? 0 : Math.sin(phase * 5 + index) * .22);
  const spread = radius * (.12 + variation * .58);
  return {
    x: Math.cos(angle) * spread,
    z: Math.sin(angle) * spread,
    y: bottom + phase * Math.max(0, surface - bottom),
    size: Math.min(radius * .12, (.0008 + variation * .0015) * (1 + intensity * .7) * (.7 + phase * .3) * Math.min(1, (1 - phase) * 20)),
  };
}

export function foamOverflowHeight(foamMl: number, freeMl: number, radius: number, soap: boolean): number {
  if (!soap || !Number.isFinite(foamMl) || !Number.isFinite(freeMl) || !Number.isFinite(radius) || radius <= 0) return 0;
  return Math.min(.75, Math.max(0, foamMl - Math.max(0, freeMl)) * 1e-6 / (Math.PI * radius * radius));
}

/** A low mound feeds overlapping viscous curtains, then a shallow pool under gravity. */
export function foamPose(index: number, count: number, volumeMl: number, radius: number, height: number, age: number) {
  if (!(volumeMl > 0) || !(radius > 0) || !(height > 0)) return null;
  const volume = volumeMl * 1e-6;
  // Broad overlapping lobes form one foam body, even around a narrow cylinder neck.
  const body = Math.max(radius * 1.35, Math.min(.075, Math.cbrt(volume) * .72));
  const neck = Math.min(.14, Math.cbrt(volume) * 2);
  const sides = count < 48 ? 4 : 8;
  const columnCount = Math.ceil(count * .3), curtainCount = Math.ceil(count * .4 / sides) * sides;
  const fall = Math.min(height, 1.25 * Math.max(0, age) ** 2);
  if (index < columnCount) {
    const u = index / Math.max(1, columnCount - 1);
    return { x: 0, z: 0,
      y: height + u * neck, sx: body, sy: Math.max(body * .65, neck / Math.max(1, columnCount - 1) * 1.25), sz: body };
  }
  if (index < columnCount + curtainCount) {
    const k = index - columnCount;
    const rows = curtainCount / sides;
    const u = Math.floor(k / sides) / Math.max(1, rows - 1);
    const angle = (k % sides) * Math.PI * 2 / sides;
    // Start flush with the crown, then widen smoothly with the actual downward travel.
    const reach = u * fall;
    const progress = reach / height;
    const smooth = progress * progress * (3 - 2 * progress);
    const outer = body * (1 + .5 * smooth);
    const half = Math.max(body * .8, fall / Math.max(1, rows - 1) * .65);
    return { x: Math.cos(angle) * outer * .16,
      z: Math.sin(angle) * outer * .16,
      y: Math.max(half, height - reach), sx: outer * .84, sy: half, sz: outer * .84 };

  }
  if (fall < height) return null;
  const k = index - columnCount - curtainCount, pools = count - columnCount - curtainCount;
  const angle = k * Math.PI * 2 / Math.max(1, pools), spread = Math.min(.14, Math.max(body * 1.7, Math.sqrt(volume * .55 / (.024 * Math.PI))));
  const mound = Math.min(.045, Math.max(body * .45, volume * .55 / (Math.PI * Math.max(.0001, spread * spread) * 2)));
  const distance = spread * .25;
  return {x:Math.cos(angle)*distance,z:Math.sin(angle)*distance,y:mound,sx:spread*.65,sy:mound,sz:spread*.65};
}

/** Foam drains into a lingering, thin wet film; this is visual residue, not extra reagent. */
export function collapsedFoam(volumeMl: number, age: number) {
  const volume = Math.max(0, volumeMl);
  const dry = Math.max(0, Math.min(1, (age - 45) / 40));
  return { radius: Math.min(.18, Math.max(.015, Math.sqrt(volume * 1e-6 / (.0015 * Math.PI))) * (1 + .35 * (1 - Math.exp(-Math.max(0, age) / 8)))),
    thickness: .0015 * (1 - dry * .7), opacity: volume > 0 ? .48 * (1 - dry) : 0 };
}
