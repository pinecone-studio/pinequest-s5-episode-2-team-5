import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

/*
 * Every 7–10-р ангийн experiment must be doable in the lab. The ones with a guided demonstration
 * are run to completion in molecules.test.mjs; this file carries out the others the way a
 * student would (pour, wait, heat, load a rig) with the stock the book lists, and checks that
 * the book's phenomenon really happens.
 */
const dir = mkdtempSync(join(tmpdir(), 'textbook-makeable-'));
const src = (path) => JSON.stringify(fileURLToPath(new URL(`../src/${path}`, import.meta.url)));
writeFileSync(join(dir, 'entry.ts'), `
export { reagentMixture, emptyMixture, liquidMl, solidMassG, gasMl, takeLiquid, merge } from ${src('chemistry/mixture.ts')};
export { equilibrateHeat } from ${src('chemistry/mix.ts')};
export { advanceChemistry } from ${src('chemistry/advance.ts')};
export { phOf } from ${src('chemistry/equilibrium.ts')};
export { DEFAULT_ENV } from ${src('chemistry/kinetics.ts')};
export { createRig, loadRig, startRig, tickRig } from ${src('experiments/grade9/process.ts')};
export { GUIDED_PLANS } from ${src('experiments/workbench/guidance/plans.ts')};
`);
await build({ entryPoints: [join(dir, 'entry.ts')], bundle: true, format: 'esm', platform: 'node', outfile: join(dir, 'engine.mjs'), logLevel: 'silent' });
const E = await import(pathToFileURL(join(dir, 'engine.mjs')).href);
rmSync(dir, { recursive: true, force: true });

const LINKS = JSON.parse(readFileSync(new URL('../src/data/textbook-experiments/lab-links.json', import.meta.url), 'utf8'));
const BOOK = [7, 8, 9, 10].flatMap((g) => JSON.parse(readFileSync(new URL(`../src/data/textbook-experiments/experiments_grade${g}.json`, import.meta.url), 'utf8')));

/** Pour reagents (id, mL or g) into one vessel, in order. */
function pour(...items) {
  let m = E.reagentMixture(items[0][0], items[0][1]);
  for (const [id, amount] of items.slice(1)) m = E.equilibrateHeat(m, E.reagentMixture(id, amount), 100).m;
  return m;
}
const ENV = { ...E.DEFAULT_ENV, lossWK: 2, stir: 0.5 };
/** Let a vessel sit (optionally heated or held at a temperature) and total the gas it gives off. */
function wait(m, seconds, env = {}, hold) {
  const gas = { CO2: 0, H2: 0, O2: 0, NH3: 0, steam: 0, smoke: 0 };
  const notes = new Set();
  for (let t = 0; t < seconds; t += 0.5) {
    if (hold !== undefined) m.temp = hold;
    const r = E.advanceChemistry(m, 0.5, { ...ENV, ...env });
    m = r.m;
    for (const k of Object.keys(gas)) gas[k] += r.gas[k] * 0.5;
    r.notes.forEach((n) => notes.add(n));
  }
  return { m, gas, notes };
}
/** Load portions into a rig's ports, start it and run it. */
function rig(kind, ports, { seconds = 200, set = {} } = {}) {
  let r = E.createRig('makeable', kind);
  for (const [port, portion] of ports) { r.port = port; r = E.loadRig(r, portion); }
  r = { ...E.startRig(r), ...set };
  assert.ok(r.running, r.message);
  for (let t = 0; t < seconds; t += 0.5) r = E.tickRig(r, 0.5);
  return r;
}
const filtrate = (m) => ({ ...E.takeLiquid(m, E.liquidMl(m)).taken, s: {}, cloud: 0 });

const SCENARIOS = {
  '7-12': () => {
    // Hydrogen from the cylinder fills a tube held mouth-down; CO₂ a tube held mouth-up.
    assert.ok(E.reagentMixture('gas_h2', 20).g.H2 > 0);
    assert.ok(E.reagentMixture('gas_co2', 20).g.CO2 > 0);
  },
  '7-13': () => {
    const r = rig('electrolysisCell', [[0, E.reagentMixture('cucl2', 50)], [1, E.reagentMixture('s_graphite', 1)], [2, E.reagentMixture('s_graphite', 1)]], { set: { current: 0.5 } });
    assert.ok(r.chambers[1].s.Cu > 0, 'катодод зэс');
    assert.ok(r.chambers[0].aq.Cl2 > 0, 'анодод хлор');
  },
  '7-14': () => {
    const r = rig('electrolysisCell', [[0, pour(['nacl', 50])], [1, E.reagentMixture('s_iron_nails', 2)], [2, E.reagentMixture('s_graphite', 1)]], { set: { current: 0.5 } });
    assert.ok(r.chambers[1].g.H2 > 0 && r.chambers[0].aq.Cl2 > 0);
  },
  '7-18': () => {
    const mix = wait(pour(['water', 30], ['s_sand', 3], ['s_nacl', 2]), 60, { stir: 1 }).m;
    assert.ok(mix.s.sand > 0 && !(mix.s.NaCl > 1e-6), 'давс уусна, элс үлдэнэ');
    const dry = wait(filtrate(mix), 400, { heatW: 1300 }).m;
    assert.ok(dry.s.NaCl > 0.02 && !(dry.s.sand > 0), 'шүүгдэс ууршаад давс үлдэнэ');
  },
  '7-22': () => {
    const { m } = wait(pour(['limewater', 10], ['gas_co2', 50]), 20);
    assert.ok(m.s.CaCO3 > 0, 'шохойн ус булингартана');
  },
  '7-30': () => {
    const nail = () => E.reagentMixture('s_iron_nails', 2);
    const targets = [22, 22, 22, 70, 22, 22, 22, 22, 22];
    const r = rig('exposureRack', [[0, E.merge(nail(), E.reagentMixture('water', 10))], [1, E.merge(nail(), pour(['water', 10], ['s_nacl', 1]))], [2, E.merge(nail(), E.reagentMixture('hcl', 10))], [3, E.merge(nail(), E.reagentMixture('hot_water', 10))]], { seconds: 600, set: { heating: true, targets } });
    assert.ok(r.rust[1] > r.rust[0] * 1.2, 'давстай ус зэврэлтийг түргэсгэнэ');
    assert.ok(r.rust[3] > r.rust[0] * 1.2, 'халуун ус зэврэлтийг түргэсгэнэ');
    assert.ok(r.chambers[2].aq.Fe2 > 0, 'хүчил төмрийг уусгана');
  },
  '7-33': () => {
    // A thermometer in the boiling water: heat until it boils, read it while water is left.
    const at = (atm) => {
      let r = rig('heatingBath', [[0, E.reagentMixture('water', 50)]], { seconds: 0, set: { heating: true, pressure: atm } });
      for (let t = 0; t < 900 && r.chambers[0].water > 40; t += 0.5) r = E.tickRig(r, 0.5);
      assert.ok(r.chambers[0].water > 1, 'ус үлдсэн');
      return r.chambers[0].temp;
    };
    const sea = at(1), ub = at(86.5 / 101.325);
    assert.ok(Math.abs(sea - 100) < 0.6, `далайн түвшинд ${sea}`);
    assert.ok(ub < sea - 3 && ub > 94, `Улаанбаатарт ${ub}`);
  },
  '7-34': () => {
    const can = wait(pour(['water', 100], ['s_ice', 50]), 60, { air: true }).m;
    assert.ok(can.temp < 5, 'мөстэй ус хүйтэн');
    assert.ok(can.dew > 0, 'гадна талд агаарын уур конденсацлана');
    assert.ok(!(wait(E.reagentMixture('water', 100), 60, { air: true }).m.dew > 0), 'тасалгааны усан дээр дусал үүсэхгүй');
  },
  '7-35': () => {
    const freeze = (id, hot) => {
      let r = rig('phaseBath', [[0, E.reagentMixture(id, 10)]], { seconds: 0 });
      r.chambers[0].temp = hot ? 90 : 22;
      r = { ...r, cooling: true, targetTemperature: -18 };
      let t = 0;
      while (t < 3000 && !(r.chambers[0].s.ice > 0)) { r = E.tickRig(r, 1); t++; }
      return t;
    };
    for (const id of ['water', 'milk', 'apple_juice', 'orange_juice']) {
      const room = freeze(id, false), hot = freeze(id, true);
      assert.ok(room < 3000 && hot < 3000, `${id} хөлдөнө`);
      assert.ok(hot > room, `${id}: халуун нь удаан хөлдөнө`);
    }
  },
  '8-03': () => {
    const { m } = wait(pour(['na2co3', 20], ['hcl', 20]), 30);
    assert.ok(m.aq.Na > 0 && m.aq.Cl > 0);
    const dry = wait(filtrate(m), 400, { heatW: 1300 }).m;
    assert.ok(dry.s.NaCl > 0.005, 'NaCl талст');
  },
  '8-24': () => {
    const lit = rig('soilBench', [[0, pour(['water', 50], ['s_pondweed', 5])]], { seconds: 600, set: { light: 1 } });
    const dark = rig('soilBench', [[0, pour(['water', 50], ['s_pondweed', 5])]], { seconds: 600, set: { light: 0 } });
    assert.ok(lit.chambers[0].g?.O2 > 0, 'гэрэлд ургамал хүчилтөрөгч ялгаруулна');
    assert.ok(!(dark.chambers[0].g?.O2 > 0), 'харанхуйд ялгаруулахгүй');
  },
  '8-25': () => {
    let r = E.createRig('makeable', 'exposureRack');
    for (const port of [0, 1]) { r.port = port; r = E.loadRig(r, E.reagentMixture('s_vaseline', 1)); }
    r = { ...E.startRig(r), covers: [false, true, false, false, false, false, false, false, false] };
    for (let t = 0; t < 600; t += 0.5) r = E.tickRig(r, 0.5);
    assert.ok(r.chambers[0].s.dust > 0, 'ил вазелинд тоос наалдана');
    assert.ok(!(r.chambers[1].s.dust > 0), 'хучсан тавганд тоос наалдахгүй');
  },
  '8-26': () => {
    const water = pour(['water', 20], ['ui', 0.2]);
    const ph = (m) => E.phOf(m);
    assert.ok(Math.abs(ph(water) - 7) < 0.5);
    assert.ok(ph(wait(E.equilibrateHeat(water, E.reagentMixture('s_citric', 0.5), 100).m, 30).m) < 4, 'нимбэгний хүчил хүчиллэг');
    const oil = E.equilibrateHeat(water, E.reagentMixture('motor_oil', 5), 100).m;
    assert.ok(oil.aq.hexadecane > 0 && Math.abs(ph(oil) - 7) < 0.5, 'тос уусахгүй, орчин өөрчлөхгүй');
    assert.ok(ph(wait(E.equilibrateHeat(water, E.reagentMixture('s_detergent', 0.5), 100).m, 30).m) > 8, 'угаагч нунтаг шүлтлэг');
    const soil = E.equilibrateHeat(water, E.reagentMixture('soil_sandy', 2), 100).m;
    assert.ok(E.solidMassG(soil) > 1 && soil.cloud > 0.5, 'хөрс булингартана');
  },
  '8-27': () => {
    const grow = (water) => rig('soilBench', [[0, E.merge(pour([water, 50]), E.reagentMixture('s_barley', 2))]], { seconds: 3600, set: { timeScale: 1, light: 1 } }).data.height ?? 0;
    assert.ok(grow('tap_water') > 0, 'цэвэр усаар ургана');
    assert.ok(grow('dirty_water') < grow('tap_water'), 'бохир ус ургалтыг саатуулна');
  },
  '8-28': () => {
    const dirty = E.reagentMixture('dirty_water', 50);
    const r = rig('soilBench', [[0, E.merge(E.merge(E.reagentMixture('s_activated_carbon', 5), E.reagentMixture('s_sand', 10)), dirty)]], { seconds: 600, set: { operation: 'filter' } });
    const clean = r.chambers[2];
    assert.ok(E.liquidMl(clean) > 5, 'шүүгдэс цугларна');
    assert.ok(E.solidMassG(clean) < E.solidMassG(dirty) / 20, 'шүүгдэс тунгалаг');
    // Sand alone stops the mud; activated carbon also takes out the dissolved soap.
    const sandOnly = rig('soilBench', [[0, E.merge(E.reagentMixture('s_sand', 15), E.reagentMixture('dirty_water', 50))]], { seconds: 600, set: { operation: 'filter' } }).chambers[2];
    const soap = (m) => (m.aq.soap ?? 0) / (E.liquidMl(m) / 1000);
    assert.ok(soap(clean) < soap(sandOnly) / 2, `нүүрстэй ${soap(clean)} < элс ${soap(sandOnly)}`);
  },
  '8-30': () => {
    const r = rig('gasTrain', [[0, E.reagentMixture('s_tobacco', 1)], [2, pour(['water', 50], ['ui', 0.2])]], { seconds: 300, set: { heating: true } });
    assert.ok(r.chambers[2].s.tar > 0, 'утаа усанд давирхай үлдээнэ');
    assert.ok(E.phOf(r.chambers[2]) < 6.5, 'утаа шингээсэн ус хүчиллэг');
  },
  '9-21': () => {
    const { m } = wait(pour(['cuso4', 5], ['s_iron_nails', 1]), 60);
    assert.ok(m.s.Cu > 0 && m.aq.Fe2 > 0, 'хадаас зэсээр бүрхэгдэнэ');
  },
  '10-05': () => {
    let { m } = wait(pour(['water', 20], ['s_kno3', 15]), 120, { stir: 1 }, 80);
    assert.ok(!(m.s.KNO3 > 0.01));
    ({ m } = wait(m, 60, {}, 15));
    assert.ok(m.s.KNO3 > 0.05);
  },
  '10-09': () => {
    assert.ok(pour(['unknown_salt', 2], ['naoh', 2]).s.FeOH2 > 0, 'NaOH: ногоон тунадас → Fe²⁺');
    assert.ok(pour(['unknown_salt', 2], ['bacl2', 2]).s.BaSO4 > 0, 'BaCl₂: цагаан тунадас → SO₄²⁻');
    assert.ok(!(pour(['unknown_salt', 2], ['agno3', 2]).s.AgCl > 0), 'AgNO₃: хлорид байхгүй');
  },
  '10-10': () => {
    const h2 = wait(pour(['hcl', 10], ['s_mg', 0.1]), 30).gas.H2;
    assert.ok(h2 > 0.003, 'Mg + HCl → H₂');
    assert.ok(wait(pour(['limewater', 10], ['gas_co2', 50]), 20).m.s.CaCO3 > 0, 'CO₂ шохойн усыг булингартуулна');
    assert.ok(E.phOf(wait(pour(['water', 5], ['gas_co2', 20]), 5).m) < 6.5, 'CO₂ норгосон лакмусыг улаан');
    assert.ok(E.phOf(pour(['water', 5], ['nh3', 0.5])) > 9, 'NH₃ норгосон лакмусыг хөх');
  },
  '10-17': () => {
    const reading = (m) => rig('conductivityTester', [[0, m]], { seconds: 2 }).extent;
    assert.ok(reading(E.reagentMixture('nacl', 20)) > 0.5, 'NaCl уусмал');
    assert.ok(reading(E.reagentMixture('h2so4', 20)) > 0.5, 'H₂SO₄ уусмал');
    assert.equal(reading(E.reagentMixture('water', 20)), 0, 'нэрмэл ус');
    assert.equal(reading(E.reagentMixture('sugar_solution', 20)), 0, 'сахарын уусмал');
    assert.equal(reading(E.reagentMixture('s_nacl', 5)), 0, 'хатуу NaCl');
  },
  '10-20': () => {
    let r = E.createRig('makeable', 'electrolysisCell');
    for (const [port, portion] of [[0, E.reagentMixture('s_pbbr2', 3)], [1, E.reagentMixture('s_graphite', 1)], [2, E.reagentMixture('s_graphite', 1)]]) { r.port = port; r = E.loadRig(r, portion); }
    r = { ...E.startRig(r), current: 0.5, heating: true, targetTemperature: 390 };
    for (let i = 0; i < 400; i++) r = E.tickRig(r, 0.5);
    assert.ok(r.chambers[1].s.Pb > 0 && r.chambers[2].aq.Br2 > 0);
  },
  '10-21': () => {
    const r = rig('electrolysisCell', [[0, E.reagentMixture('hcl', 50)], [1, E.reagentMixture('s_graphite', 1)], [2, E.reagentMixture('s_graphite', 1)]], { set: { current: 0.5 } });
    assert.ok(r.chambers[1].g.H2 > 0 && r.chambers[0].aq.Cl2 > 0);
  },
  '10-23': () => {
    const cold = wait(pour(['water', 100], ['s_mg', 0.2]), 60).gas.H2;
    // Mineral wool soaked in water and the ribbon, heated in a test tube by the spirit lamp.
    const steam = wait(pour(['water', 2], ['s_mineral_wool', 0.5], ['s_mg', 0.2]), 240, { heatW: 420, glassJK: 17, lossWK: 0.6 });
    assert.ok(steam.gas.H2 > 10 * cold, `уур ${steam.gas.H2} > хүйтэн ус ${cold}`);
    assert.ok(steam.m.s.MgO > 0, 'MgO үүснэ');
  },
  '10-24': () => {
    let r = E.createRig('makeable', 'combustionFurnace');
    r.port = 0; r = E.loadRig(r, E.reagentMixture('s_cuo', 1));
    r.port = 1; r = E.loadRig(r, E.reagentMixture('gas_h2', 500));
    r = { ...E.startRig(r), heating: true, targetTemperature: 300 };
    for (let i = 0; i < 400; i++) r = E.tickRig(r, 0.5);
    assert.ok(r.chambers[0].s.Cu > 0);
  },
  '10-27': () => {
    for (const [salt, sulfide] of [['cuso4', 'CuS'], ['cdso4', 'CdS'], ['pbno3', 'PbS']]) {
      const { m } = wait(pour(['hcl', 20], [salt, 10], ['s_fes', 1]), 30);
      assert.ok(m.s[sulfide] > 0, sulfide);
    }
  },
  '10-29': () => {
    assert.ok(wait(pour(['h2so4_conc', 10], ['s_sugar', 5]), 30).m.s.C > 0);
  },
  '10-35': () => {
    const r = rig('crackingTube', [[0, E.merge(E.merge(E.reagentMixture('s_wax', 2), E.reagentMixture('s_mineral_wool', 0.5)), E.reagentMixture('s_alumina', 1))], [2, E.reagentMixture('bromine', 10)]], { seconds: 400, set: { heating: true, targetTemperature: 550 } });
    assert.ok(r.chambers[2].aq.Br2 < E.reagentMixture('bromine', 10).aq.Br2 * 0.5, 'бромын ус өнгөө алдана');
  },
  '10-40': () => {
    const hcl = wait(pour(['hcl', 10], ['s_mg', 0.05]), 10).gas.H2;
    const acetic = wait(pour(['acetic', 10], ['s_mg', 0.05]), 10).gas.H2;
    assert.ok(acetic > 0 && hcl > 2 * acetic, `HCl ${hcl} хурдан, цууны хүчил ${acetic}`);
  },
  '10-42': () => {
    const start = pour(['h2so4', 10], ['kmno4', 10], ['ethanol', 2]);
    const { m } = wait(start, 60, {}, 60);
    assert.ok(m.aq.Ac > 0 && m.aq.MnO4 < start.aq.MnO4);
  },
};

test('сурах бичгийн 145 туршилт бүр лабын заавартай эсвэл энд шалгагдсан', () => {
  assert.equal(BOOK.length, 145);
  const uncovered = BOOK.filter((e) => !(LINKS[e.id] && E.GUIDED_PLANS[LINKS[e.id]]) && !SCENARIOS[e.id]).map((e) => e.id);
  assert.deepEqual(uncovered, []);
});

for (const [id, scenario] of Object.entries(SCENARIOS)) {
  const e = BOOK.find((x) => x.id === id);
  test(`${id} ${e?.title ?? ''}`, scenario);
}
