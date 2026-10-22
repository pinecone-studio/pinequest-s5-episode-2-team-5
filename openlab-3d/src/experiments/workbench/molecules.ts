/** Bounded educational molecular model: elastic hard spheres + collision chemistry.
 * Time/length are illustrative, not molecular dynamics in SI units. No React or GPU state.
 */
import type { ReactionObservation } from '../../chemistry/reaction-view';
export type Species = string;
export interface Particle { species: Species; x: number; y: number; z: number; vx: number; vy: number; vz: number; hits: number; locked: boolean; active: boolean }
export class MolecularModel {
  particles: Particle[] = [];
  collisions = 0;
  products = 0;
  escaped = 0;
  lattice = 0;
  intermediates = 0;
  turnovers = 0;
  private credit = 0;
  private clock = 0;
  private consumed = new WeakMap<Particle, Map<string, number>>();
  mode: ReactionObservation['preset'];
  readonly recipe?: ReactionObservation;
  private readonly solidProducts = new Set<string>();
  limit: number;
  private random: () => number;
  constructor(mode: 'acid' | 'evap' | ReactionObservation, limit: number, random = Math.random) {
    this.mode = typeof mode === 'string' ? mode : mode.preset; this.limit = limit; this.random = random;
    if (typeof mode !== 'string') {
      this.recipe = mode;
      mode.products.filter((p) => p.phase === 'solid').forEach((p) => this.solidProducts.add(p.id));
      const count = Math.max(2, mode.reactants.reduce((n, s) => n + s.count, 0));
      const groups = Math.max(3, Math.floor(limit / (count + 4)));
      for (let i = 0; i < groups; i++) {
        let anchor: Particle | null = null;
        for (const s of mode.reactants) for (let j = 0; j < s.count; j++) {
          const p = this.add(s.id);
          if (!p) continue;
          if (!anchor) anchor = p;
          else { p.x = anchor.x + (j % 2 ? -.25 : .25); p.y = anchor.y; p.z = anchor.z; p.vx = j % 2 ? .7 : -.7; p.vy = p.vz = 0; }
        }
        for (const s of mode.spectators ?? []) for (let k = 0; k < s.count; k++) this.add(s.id);
        if (mode.preset !== 'evap') this.add('H2O');
      }
      return;
    }
    const n = Math.floor(limit / 8);
    for (let i = 0; i < n; i++) {
      this.add('Na'); this.add('Cl');
      this.add('Na'); this.add('Cl');
      this.add(mode === 'acid' ? 'H' : 'H2O'); this.add(mode === 'acid' ? 'H' : 'H2O');
      this.add('H2O');
      if (mode === 'acid') {
        const c = this.add('CO3');
        const hs = this.particles.filter((p) => p.species === 'H').slice(-2);
        if (c) hs.forEach((h, j) => {
          const sign = j ? 1 : -1;
          h.x = c.x + sign * .24; h.y = c.y; h.z = c.z;
          h.vx = -sign * .65; h.vy = h.vz = 0;
        });
      }
    }
  }
  add(species: Species, at?: Particle): Particle | null {
    const reuse = this.particles.find((p) => !p.active);
    if (!reuse && this.particles.length >= this.limit) return null;
    const p: Particle = { species, x: at?.x ?? (this.random() - .5) * 1.6, y: at?.y ?? (this.random() - .5) * 1.1, z: at?.z ?? (this.random() - .5) * 1.2,
      vx: (this.random() - .5) * .65, vy: (this.random() - .5) * .65, vz: (this.random() - .5) * .65, hits: 0, locked: false, active: true };
    if (reuse) { this.consumed.delete(reuse); Object.assign(reuse, p); return reuse; }
    this.particles.push(p); return p;
  }
  advance(rawDt: number, rate: number, temp: number): void {
    const dt = Math.min(.04, Math.max(0, rawDt));
    this.clock += dt;
    if (rate <= 0) this.credit = 0;
    const speed = Math.sqrt(Math.max(100, temp + 273.15) / 293.15);
    this.credit = Math.min(6, this.credit + Math.max(0, rate) * dt * 4);
    const radius = .095;
    const cellSize = radius * 2;
    const hash = new Map<string, number[]>();
    const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
    this.particles.forEach((p, i) => {
      if (!p.active || p.locked) return;
      // Gentle thermal kicks; elastic pair collisions below do the visible deflection.
      const kick = .12 * Math.sqrt(dt);
      p.vx += (this.random() - .5) * kick; p.vz += (this.random() - .5) * kick;
      p.x += p.vx * dt * speed; p.y += p.vy * dt * speed; p.z += p.vz * dt * speed;
      if (['CO2', 'H2', 'O2', 'steam'].includes(p.species) || (this.mode === 'evap' && p.species === 'H2O' && rate > 0)) {
        p.vy = Math.min(.9, p.vy + dt * .8);
        if (p.y > .85) { p.active = false; this.escaped++; return; }
      } else if (Math.abs(p.y) > .62) { p.y = Math.sign(p.y) * .62; p.vy *= -1; }
      if (Math.abs(p.x) > .85) { p.x = Math.sign(p.x) * .85; p.vx *= -1; }
      if (Math.abs(p.z) > .65) { p.z = Math.sign(p.z) * .65; p.vz *= -1; }
      if (this.solidProducts.has(p.species)) {
        // Newly formed particles visibly converge into a settled cluster.
        p.vx += (-p.x * 1.5 - p.vx) * dt; p.vz += (-p.z * 1.5 - p.vz) * dt;
        p.vy += ((-.5 - p.y) * 1.5 - p.vy) * dt;
        if (Math.hypot(p.x, p.y + .5, p.z) < .19) { p.locked = true; this.lattice++; }
      }
      const cx = Math.floor(p.x / cellSize), cy = Math.floor(p.y / cellSize), cz = Math.floor(p.z / cellSize);
      // Neighbouring cells only; a pair is visited once, when its later member is inserted.
      for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
        for (const j of hash.get(key(cx + x, cy + y, cz + z)) ?? []) {
          const q = this.particles[j]; if (!q.active || !p.active) continue;
          const dx = p.x - q.x, dy = p.y - q.y, dz = p.z - q.z;
          const d = Math.hypot(dx, dy, dz);
          if (d >= radius * 2 || d < 1e-7) continue;
          const nx = dx / d, ny = dy / d, nz = dz / d;
          const overlap = (radius * 2 - d) / 2;
          p.x += nx * overlap; p.y += ny * overlap; p.z += nz * overlap;
          q.x -= nx * overlap; q.y -= ny * overlap; q.z -= nz * overlap;
          const v = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny + (p.vz - q.vz) * nz;
          if (v < 0) {
            p.vx -= v * nx; p.vy -= v * ny; p.vz -= v * nz;
            q.vx += v * nx; q.vy += v * ny; q.vz += v * nz;
            this.collisions++;
            const carbonate = p.species === 'CO3' ? p : q.species === 'CO3' ? q : null;
            const proton = p.species === 'H' ? p : q.species === 'H' ? q : null;
            if (this.recipe) this.react(p, q);
            else if (this.mode === 'acid' && carbonate && proton && this.credit >= .5) {
              this.credit -= .5; proton.active = false; carbonate.hits++;
              if (carbonate.hits === 2) {
                carbonate.species = 'CO2'; carbonate.vy = .45;
                this.add('H2O', carbonate); this.products++;
              }
            }
          }
        }
      }
      const k = key(cx, cy, cz); const bucket = hash.get(k) ?? []; bucket.push(i); hash.set(k, bucket);
    });
    if (!this.recipe && this.mode === 'acid' && rate > 0 && this.clock > .7) {
      this.clock = 0;
      if (!this.particles.some((p) => p.active && p.species === 'CO3')) this.add('CO3');
      if (this.particles.filter((p) => p.active && p.species === 'H').length < 4) { this.add('H'); this.add('H'); }
    }
    if (this.recipe && this.clock > .8 && rate > 0 && this.mode !== 'evap') {
      this.clock = 0;
      for (const s of this.recipe.reactants) if (this.particles.filter((p) => p.active && p.species === s.id).length < Math.max(2, s.count)) for (let k = 0; k < s.count; k++) this.add(s.id);
    }
    if (this.mode === 'evap' && this.credit >= 1 && (!this.recipe || this.solidProducts.size > 0)) {
      // Alternate Na+/Cl- sites in a cubic lattice. Existing ions move to sites.
      const side = Math.max(2, Math.floor(Math.cbrt(Math.floor(this.limit / 8) * 4)));
      if (this.lattice >= side ** 3) return;
      const x = this.lattice % side, z = Math.floor(this.lattice / side) % side, y = Math.floor(this.lattice / (side * side));
      const ion = this.particles.find((p) => p.active && !p.locked && p.species === (this.recipe?.spectators?.[(x + y + z) % Math.max(1, this.recipe.spectators.length)]?.id ?? ((x + y + z) % 2 ? 'Cl' : 'Na')));
      if (ion) {
        this.credit--; this.lattice++;
        ion.x = (x - (side - 1) / 2) * .22; ion.y = -.52 + y * .22; ion.z = (z - (side - 1) / 2) * .22;
        ion.vx = ion.vy = ion.vz = 0; ion.locked = true; this.products++;
      }
    }
  }
  private react(p: Particle, q: Particle): void {
    const recipe = this.recipe;
    if (!recipe || this.credit < .5 || recipe.preset === 'evap') return;
    if (recipe.catalyst === 'iodide') {
      const catalyst = ['I', 'IO'].includes(p.species) ? p : ['I', 'IO'].includes(q.species) ? q : null;
      const peroxide = p.species === 'H2O2' ? p : q.species === 'H2O2' ? q : null;
      if (!catalyst || !peroxide) return;
      this.credit -= .5;
      const at = { ...peroxide };
      peroxide.active = false;
      this.add('H2O', at);
      catalyst.hits++;
      if (catalyst.species === 'I') { catalyst.species = 'IO'; this.intermediates++; }
      else {
        catalyst.species = 'I'; this.turnovers++; this.products++;
        const oxygen = this.add('O2', at); if (oxygen) oxygen.vy = .6;
      }
      return;
    }
    const a = recipe.reactants[0];
    let anchor: Particle, contact: Particle;
    if (p.species === a.id) { anchor = p; contact = q; }
    else if (q.species === a.id) { anchor = q; contact = p; }
    else return;
    const needs = recipe.reactants.length === 1 && a.count === 1 ? [{ id: 'H2O', count: 1 }] : recipe.reactants.map((s, i) => ({ id: s.id, count: s.count - (i === 0 ? 1 : 0) }));
    const requirement = needs.find((s) => s.id === contact.species && s.count > 0);
    if (!requirement) return;
    const consumed = this.consumed.get(anchor) ?? new Map<string, number>();
    if ((consumed.get(contact.species) ?? 0) >= requirement.count) return;
    this.credit -= .5; contact.active = false; anchor.hits++;
    consumed.set(contact.species, (consumed.get(contact.species) ?? 0) + 1); this.consumed.set(anchor, consumed);
    if (needs.some((s) => (consumed.get(s.id) ?? 0) < s.count)) return;
    this.consumed.delete(anchor);
    const at = { ...anchor }; anchor.active = false;
    for (const product of recipe.products) for (let i = 0; i < product.count; i++) {
      const created = this.add(product.id, at);
      if (created) { created.y += .025 * i; if (product.phase === 'gas') created.vy = .5; }
    }
    this.products++;
  }

}
