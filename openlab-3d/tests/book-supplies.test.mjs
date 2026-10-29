import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { parseExperiment } from '../src/menu/chapterBuild.ts';

/* The lab sources import each other without file extensions, so bundle each entry first. */
const dir = mkdtempSync(join(tmpdir(), 'book-supplies-'));
async function load(source) {
  const outfile = join(dir, `${source.replace(/\W/g, '_')}.mjs`);
  await build({
    entryPoints: [fileURLToPath(new URL(`../src/${source}`, import.meta.url))],
    bundle: true, format: 'esm', platform: 'node', packages: 'external', outfile, logLevel: 'silent',
  });
  return import(pathToFileURL(outfile).href);
}
const { BOOK_EQUIPMENT, BOOK_SUBSTANCES, PROCEDURE_TOOLS, bookSupplies, supplyOf } = await load('experiments/workbench/bookSupplies.ts');
const { CATALOG } = await load('equipment/equipmentCatalog.ts');
const { REAGENTS, REAGENT_LIST } = await load('chemistry/reagents.ts');
rmSync(dir, { recursive: true, force: true });

const TEXTBOOK = new URL('../src/data/textbook-experiments/', import.meta.url);
const experiments = readdirSync(TEXTBOOK)
  .filter((name) => /^experiments_grade\d+\.json$/.test(name))
  .flatMap((name) => JSON.parse(readFileSync(new URL(name, TEXTBOOK), 'utf8')))
  // Same parsing as the menu (grade 10 keeps its lists as "a; b" strings).
  .map(parseExperiment).filter(Boolean);

test('7–10-р ангийн бүх туршилт уншигдана', () => {
  assert.ok(experiments.length >= 145, `${experiments.length} туршилт`);
  for (const grade of [7, 8, 9, 10]) assert.ok(experiments.some((e) => e.id.startsWith(`${grade}-`)), `${grade}-р анги`);
});

test('сурах бичгийн хэрэгсэл, бодис бүр лабын зүйлтэй холбогдоно', () => {
  const unmatched = experiments.flatMap((e) => bookSupplies(e).unmatched.map((name) => `${e.id}: ${name}`));
  assert.deepEqual(unmatched, []);
});

test('холбоос бүр лабт байгаа хэрэгсэл эсвэл бодис руу заана', () => {
  const broken = [];
  for (const [name, refs] of Object.entries({ ...BOOK_EQUIPMENT, ...BOOK_SUBSTANCES, ...PROCEDURE_TOOLS })) {
    for (const ref of refs) {
      if (ref.startsWith('reagent:')) {
        const reagent = REAGENTS[ref.slice(8)];
        if (!reagent) broken.push(`${name} → ${ref}`);
        else if (!CATALOG[reagent.container]) broken.push(`${name} → ${ref} (сав ${reagent.container})`);
      } else if (!CATALOG[ref]) broken.push(`${name} → ${ref}`);
    }
  }
  assert.deepEqual(broken, []);
});

test('туршилт бүр ширээнд дор хаяж нэг зүйл гаргана, давхардалгүй', () => {
  for (const e of experiments) {
    const listed = [...e.equipment, ...e.substances].filter((name) => name.trim() !== '—');
    const { supplies } = bookSupplies(e);
    if (listed.length) assert.ok(supplies.length > 0, `${e.id}: ширээ хоосон`);
    assert.equal(new Set(supplies.map((s) => s.key)).size, supplies.length, `${e.id}: давхардсан`);
    for (const s of supplies) assert.ok(s.kind, `${e.id}: ${s.key} загваргүй`);
  }
});

test('ижил нэр туршилтаас хамаарч өөр хэрэгсэл болно (9-23 тавиур)', () => {
  const kinds = (id) => bookSupplies({ id, equipment: ['Тавиур'], substances: [] }).supplies.map((s) => s.kind);
  assert.deepEqual(kinds('9-23'), ['tripod']);
  assert.deepEqual(kinds('7-01'), ['testTubeRack']);
});

test('бодис лабын савтайгаа, workbench-ийн түлхүүрээр гарна', () => {
  const ice = supplyOf('reagent:s_ice');
  assert.equal(ice.key, 'reagent-s_ice');
  assert.equal(ice.reagent, 's_ice');
  assert.equal(ice.kind, REAGENTS.s_ice.container);
  const bath = bookSupplies({ id: 'x', equipment: ['Мөсөн банн', 'мөс'], substances: [] }).supplies.map((s) => s.key);
  assert.deepEqual(bath, ['beaker', 'reagent-s_ice']);
});

test('заавар халаах, жинлэх, шүүх, электролиз хийх бол хэрэгсэл нь ширээнд гарна', () => {
  const ids = new Set(experiments.map((e) => e.id));
  assert.deepEqual(Object.keys(PROCEDURE_TOOLS).filter((id) => !ids.has(id)), []);
  const kinds = (id) => bookSupplies(experiments.find((e) => e.id === id)).supplies.map((s) => s.kind);
  assert.ok(['alcoholLamp', 'tripod', 'wireGauze'].every((k) => kinds('9-12').includes(k)));
  for (const id of ['7-13', '7-14', '10-20', '10-21']) assert.ok(kinds(id).includes('electrolysisCell'), id);
  assert.ok(kinds('7-35').includes('phaseBath'));
  assert.ok(kinds('9-07').includes('scale'));
  assert.equal(kinds('7-18').filter((k) => k === 'evaporatingDish').length, 1);
});

test('хэрэгслийн төрөл бодисын савтай давхцахгүй (нэг зүйл хоёр мөрийг эзлэхгүй)', () => {
  // A bare kind that is also a stock container would match the stocked item and share it.
  const containers = new Set(REAGENT_LIST.map((r) => r.container));
  const tools = [...Object.values(BOOK_EQUIPMENT), ...Object.values(PROCEDURE_TOOLS)].flat().filter((ref) => !ref.startsWith('reagent:'));
  assert.deepEqual([...new Set(tools.filter((kind) => containers.has(kind)))], []);
});

test('сурах бичгийн сав (тигль, лааз, аяга, сав, тавиурт таваг) бодис багтаана', () => {
  for (const kind of ['crucible', 'aluminumCan', 'plasticCup', 'plasticBottle', 'seedPot', 'trough', 'crystallizingDish', 'disposableDish']) {
    assert.ok(CATALOG[kind].capacityMl > 0, kind);
    assert.ok(CATALOG[kind].heatJK > 0, kind);
  }
  assert.ok(CATALOG.crucible.glass, 'шаазан тигль унавал хагарна');
});

test('хуруу шил бүхий туршилтад тавиур гарна (хэвтээ хуруу шилэнд шингэн тогтохгүй)', () => {
  for (const e of experiments) {
    const kinds = bookSupplies(e).supplies.map((s) => s.kind);
    if (kinds.includes('testTube')) assert.ok(kinds.includes('testTubeRack'), e.id);
  }
});

test('заавар хэдэн сав зэрэг хэрэглэнэ, ширээнд тэр тоогоор гарна («Гурван шилэн аяга», «6 хуруу шил»)', () => {
  const NOUN = { 'шилэн аяга': 'beaker', 'хуруу шил': 'testTube', 'хуванцар сав': 'plasticBottle', 'хуванцар аяга': 'plasticCup', 'шил': 'testTube', 'сав': 'beaker' };
  const WORD = { хоёр: 2, гурав: 3, гурван: 3, дөрөв: 4, дөрвөн: 4, тав: 5, таван: 5, зургаа: 6, зургаан: 6 };
  const re = /(\d+|хоёр|гурав|гурван|дөрөв|дөрвөн|тав|таван|зургаа|зургаан)\s+(ширхэг\s+)?(шилэн аяга|хуруу шил|хуванцар сав|хуванцар аяга|шил|сав)(?![а-яөүё])/gi;
  const short = [];
  for (const e of experiments) {
    const need = {};
    for (const m of (e.procedure ?? []).join(' ').matchAll(re)) {
      const n = Number(m[1]) || WORD[m[1].toLowerCase()];
      const kind = NOUN[m[3].toLowerCase()];
      if (n && kind) need[kind] = Math.max(need[kind] ?? 0, n);
    }
    if (e.id === '8-27') need.seedPot = 4; // I–IV сав
    const kinds = bookSupplies(e).supplies.map((s) => s.kind);
    for (const [kind, n] of Object.entries(need)) {
      const have = kinds.filter((k) => k === kind).length + (kind === 'testTube' && kinds.includes('testTubeRack') ? 4 : 0);
      if (have < n) short.push(`${e.id}: ${kind} ${have}/${n}`);
    }
  }
  assert.deepEqual(short, []);
  const keys = bookSupplies(experiments.find((e) => e.id === '7-01')).supplies.map((s) => s.key);
  assert.ok(['beaker', 'beaker#2', 'beaker#3'].every((k) => keys.includes(k)), keys.join(' '));
});
