import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

/* One bundle of the lab's chemistry engine and rigs (sources import without file extensions). */
const dir = mkdtempSync(join(tmpdir(), 'textbook-chemistry-'));
const src = (path) => JSON.stringify(fileURLToPath(new URL(`../src/${path}`, import.meta.url)));
writeFileSync(join(dir, 'entry.ts'), `
export { reagentMixture, gasMl } from ${src('chemistry/mixture.ts')};
export { equilibrateHeat } from ${src('chemistry/mix.ts')};
export { advanceChemistry } from ${src('chemistry/advance.ts')};
export { phOf } from ${src('chemistry/equilibrium.ts')};
export { createRig, loadRig, startRig, tickRig } from ${src('experiments/grade9/process.ts')};
`);
await build({ entryPoints: [join(dir, 'entry.ts')], bundle: true, format: 'esm', platform: 'node', outfile: join(dir, 'engine.mjs'), logLevel: 'silent' });
const E = await import(pathToFileURL(join(dir, 'engine.mjs')).href);
rmSync(dir, { recursive: true, force: true });

/** Pour reagents (id, mL or g) into one vessel, as a student would. */
function pour(...items) {
  let m = E.reagentMixture(items[0][0], items[0][1]);
  for (const [id, amount] of items.slice(1)) m = E.equilibrateHeat(m, E.reagentMixture(id, amount), 100).m;
  return m;
}
const ENV = { heatW: 0, glassJK: 100, lossWK: 0.5, stir: 0.5, covered: false, co2: false, flame: false };
function wait(m, seconds, env = {}, hold) {
  const gas = { H2: 0 };
  for (let t = 0; t < seconds; t++) {
    if (hold !== undefined) m.temp = hold;
    const r = E.advanceChemistry(m, 1, { ...ENV, ...env });
    m = r.m;
    gas.H2 += r.gas.H2;
  }
  return { m, gas };
}
/** Electrolysis cell: electrolyte in ①, graphite electrodes in ② and ③. */
function cell(electrolyte, { heat } = {}) {
  let r = E.createRig('test', 'electrolysisCell');
  for (const [port, portion] of [[0, electrolyte], [1, E.reagentMixture('s_graphite', 1)], [2, E.reagentMixture('s_graphite', 1)]]) {
    r.port = port;
    r = E.loadRig(r, portion);
  }
  r = E.startRig(r);
  assert.ok(r.running, r.message);
  r.current = 0.5;
  if (heat) { r.heating = true; r.targetTemperature = heat; }
  for (let i = 0; i < 400; i++) r = E.tickRig(r, 0.5);
  return r;
}

test('CuSO₄ электролиз (инерт анод) өмнөхтэй ижил: Cu = It/2F, O₂ = Cu/2', () => {
  const r = cell(E.reagentMixture('cuso4', 50));
  const [, cathode, anode] = r.chambers;
  assert.ok(cathode.s.Cu > 0);
  assert.ok(Math.abs(r.data.deposited - r.current * r.elapsed / 96485.33212 / 2) < 1e-9);
  assert.ok(Math.abs(anode.g.O2 - cathode.s.Cu / 2) < 1e-9);
});

test('NaCl уусмалын электролиз: катодод H₂, анодод Cl₂, уусмал шүлтлэг болно', () => {
  const r = cell(E.reagentMixture('nacl', 50));
  assert.ok(r.chambers[1].g.H2 > 0);
  assert.ok(r.chambers[0].aq.Cl2 > 0);
  assert.ok(E.phOf(r.chambers[0]) > 8);
});

test('HCl электролиз: H₂ ба Cl₂, хүчил багасна', () => {
  const before = E.phOf(E.reagentMixture('hcl', 50));
  const r = cell(E.reagentMixture('hcl', 50));
  assert.ok(r.chambers[1].g.H2 > 0 && r.chambers[0].aq.Cl2 > 0);
  assert.ok(E.phOf(r.chambers[0]) > before);
});

test('Хайлмал PbBr₂: хайлсны дараа л Pb ба Br₂ ялгарна', () => {
  const cold = cell(E.reagentMixture('s_pbbr2', 3));
  assert.ok(!(cold.chambers[1].s.Pb > 0));
  const hot = cell(E.reagentMixture('s_pbbr2', 3), { heat: 390 });
  assert.ok(hot.chambers[1].s.Pb > 0);
  assert.ok(hot.chambers[2].aq.Br2 > 0);
});

test('Цэвэр ус гүйдэл дамжуулахгүй — электролиз явагдахгүй', () => {
  const r = cell(E.reagentMixture('water', 50));
  assert.ok(!(r.chambers[1].g?.H2 > 0));
});

test('Халсан CuO дээр H₂: зэс ангижирна (урвалын зуух)', () => {
  let r = E.createRig('test', 'combustionFurnace');
  r.port = 0; r = E.loadRig(r, E.reagentMixture('s_cuo', 1));
  r.port = 1; r = E.loadRig(r, E.reagentMixture('gas_h2', 500));
  r = E.startRig(r);
  r.heating = true; r.targetTemperature = 300;
  for (let i = 0; i < 400; i++) r = E.tickRig(r, 0.5);
  assert.ok(r.chambers[0].s.Cu > 0);
});

test('KNO₃ халуун усанд уусаж, хөргөхөд талстжина', () => {
  let { m } = wait(pour(['water', 20], ['s_kno3', 15]), 120, { stir: 1 }, 80);
  assert.ok(!(m.s.KNO3 > 0.01));
  ({ m } = wait(m, 60, {}, 15));
  assert.ok(m.s.KNO3 > 0.05);
});

test('Кальци хүйтэн устай урвалд орно; магни хүйтэн усанд үгүй, халуун усанд H₂ ялгаруулна', () => {
  const ca = wait(pour(['water', 100], ['s_ca', 0.5]), 30);
  assert.ok(ca.gas.H2 > 0 && E.phOf(ca.m) > 10);
  assert.equal(wait(pour(['water', 100], ['s_mg', 0.5]), 30).gas.H2, 0);
  assert.ok(wait(pour(['water', 100], ['s_mg', 0.5]), 30, {}, 95).gas.H2 > 0);
});

test('RbCl, SrCl₂ уусмал хүчил биш (катион тооцоонд орно)', () => {
  for (const id of ['rbcl', 'srcl2']) assert.ok(E.phOf(E.reagentMixture(id, 20)) > 6, id);
});

test('FeS + HCl → H₂S нь Cu²⁺-ийг хар CuS болгож тунадасжуулна', () => {
  const { m } = wait(pour(['hcl', 20], ['cuso4', 10], ['s_fes', 1]), 30);
  assert.ok(m.s.CuS > 0);
});

test('Элсэн чихэр + өтгөн H₂SO₄ → нүүрстөрөгч', () => {
  const { m } = wait(pour(['h2so4_conc', 10], ['s_sugar', 5]), 30);
  assert.ok(m.s.C > 0);
});

test('Этанол + KMnO₄ + H₂SO₄ (халуун) → этаны хүчил', () => {
  const start = pour(['h2so4', 10], ['kmno4', 10], ['ethanol', 2]);
  const { m } = wait(start, 60, {}, 60);
  assert.ok(m.aq.Ac > 0 && m.aq.MnO4 < start.aq.MnO4);
});

test('AgNO₃ + Na₂CrO₄ → улаан хүрэн Ag₂CrO₄ тунадас', () => {
  assert.ok(pour(['agno3', 10], ['na2cro4', 10]).s.Ag2CrO4 > 0);
});

test('Төмөр зэсийн сульфатаас зэсийг шахна', () => {
  const { m } = wait(pour(['cuso4', 20], ['s_fe', 1]), 30);
  assert.ok(m.s.Cu > 0 && m.aq.Fe2 > 0);
});
