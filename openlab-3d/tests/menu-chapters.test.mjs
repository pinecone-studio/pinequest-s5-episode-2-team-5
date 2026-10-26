import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { buildChapters, parseExperiment } from '../src/menu/chapterBuild.ts';

/** Жинхэнэ JSON файлуудыг уншина (src/data/textbook-experiments) */
const DIR = new URL('../src/data/textbook-experiments/', import.meta.url);
const files = Object.fromEntries(
  readdirSync(DIR)
    .filter((name) => /^experiments_grade\d+\.json$/.test(name))
    .map((name) => [name, JSON.parse(readFileSync(new URL(name, DIR), 'utf8'))]),
);
const all = (chapters) => chapters.flatMap((c) => c.sections.flatMap((s) => s.experiments));

test('7-р анги: 4 бүлэг, 11 сэдэв, 40 туршилт — сурах бичгийн дарааллаар', () => {
  const chapters = buildChapters(files, 7);
  assert.deepEqual(chapters.map((c) => c.experimentCount), [7, 12, 13, 8]);
  assert.deepEqual(chapters.map((c) => c.sections.length), [2, 3, 3, 3]);
  assert.equal(chapters[0].name, 'I. Бодисын төлөв');
  assert.equal(chapters[0].sections[0].name, '1.1 Бодисын төлөв, төлөвийн шилжилт');
  const ids = all(chapters).map((e) => e.id);
  assert.equal(ids.length, 40);
  assert.equal(ids[0], '7-01');
  assert.equal(ids[39], '7-40');
  assert.deepEqual(ids, [...ids].sort()); // 7-01 … 7-40: JSON-ы дараалал хадгалагдсан
});

test('8, 9, 10-р ангийн туршилтын тоо JSON-той таарна, 11-р анги хоосон', () => {
  assert.equal(all(buildChapters(files, 8)).length, 30);
  assert.equal(all(buildChapters(files, 9)).length, 31);
  assert.equal(all(buildChapters(files, 10)).length, 44);
  assert.deepEqual(buildChapters(files, 11), []);
  assert.equal(buildChapters(files, 9).length, 5);
});

test('⭐ онцлох туршилт, хуудас, жагсаалтын талбар зөв', () => {
  const list = all(buildChapters(files, 7));
  assert.equal(list.filter((e) => e.showcase).length, 8);
  const e = list.find((x) => x.id === '7-13');
  assert.equal(e.page, '42–43');
  assert.equal(e.showcase, false);
  const gas = list.find((x) => x.id === '7-12');
  assert.deepEqual(gas.substances, ['Устөрөгч', 'Нүүрсхүчлийн хий', 'Ус']);
  assert.deepEqual(gas.engine, ['GAS_COLLECTION', 'H2_POP_TEST']);
});

test('шинэ ангийн файл нэмэхэд код өөрчлөхгүйгээр бүлэг гарна (11-р анги)', () => {
  const extra = {
    ...files,
    'experiments_grade11.json': [
      { id: '11-01', grade: 11, chapter: 'I. А', section: '1.1 Х', title: 'Нэг' },
      { id: '11-02', grade: 11, chapter: 'II. Б', section: '2.1 Ү', title: 'Хоёр' },
      { id: '11-03', grade: 11, chapter: 'I. А', section: '1.2 Ө', title: 'Гурав' },
    ],
  };
  const chapters = buildChapters(extra, 11);
  assert.deepEqual(chapters.map((c) => c.name), ['I. А', 'II. Б']); // анх гарсан дарааллаар
  assert.deepEqual(chapters[0].sections.map((s) => s.name), ['1.1 Х', '1.2 Ө']);
  assert.equal(chapters[0].experimentCount, 2);
});

test('муу мөр, муу файл алдаа үүсгэхгүй', () => {
  assert.equal(parseExperiment(null), null);
  assert.equal(parseExperiment({ id: '7-1', grade: 7, chapter: 'a', section: 'b' }), null); // гарчиггүй
  assert.equal(parseExperiment({ id: '7-1', grade: 'x', chapter: 'a', section: 'b', title: 't' }), null);
  const messy = { a: 'массив биш', b: [null, 5, { grade: 8 }, { id: '8-1', grade: 8, chapter: 'a', section: 'b', title: 't', page: 12 }] };
  const chapters = buildChapters(messy, 8);
  assert.equal(all(chapters).length, 1);
  assert.equal(all(chapters)[0].page, '12'); // тоо ч гэсэн текст болгоно
});

// ---- Хийх дараалал (`procedure` багана) ----
import { parseProcedure } from '../src/menu/chapterBuild.ts';

test('procedure: жагсаалт хэлбэрээр ирвэл алхам болно', () => {
  assert.deepEqual(parseProcedure(['Бодис хий.', ' Халаа. ']), ['Бодис хий.', 'Халаа.']);
});

test('procedure: нэг текст — шинэ мөр эсвэл " | "-ээр тусгаарлагдсан', () => {
  assert.deepEqual(parseProcedure('Бодис хий.\nХалаа.\r\nХэмж.'), ['Бодис хий.', 'Халаа.', 'Хэмж.']);
  assert.deepEqual(parseProcedure('Бодис хий. | Халаа. | Хэмж.'), ['Бодис хий.', 'Халаа.', 'Хэмж.']);
});

test('procedure: өмнөх дугаарыг хасна, текст доторх цэг таслал үлдэнэ', () => {
  assert.deepEqual(parseProcedure('1. Бодис хий; ус нэм.\n2) Халаа, хутга.\n3 . Хэмж.'), ['Бодис хий; ус нэм.', 'Халаа, хутга.', 'Хэмж.']);
});

test('procedure: байхгүй, хоосон, буруу төрөл → хоосон жагсаалт; мөр дотор ирнэ', () => {
  assert.deepEqual(parseProcedure(undefined), []);
  assert.deepEqual(parseProcedure(''), []);
  assert.deepEqual(parseProcedure('  \n  '), []);
  assert.deepEqual(parseProcedure(42), ['42']); // тоог текст болгоно, алдаа гаргахгүй
  const row = { id: '7-01', grade: 7, chapter: 'a', section: 'b', title: 't' };
  assert.deepEqual(parseExperiment(row).procedure, []);
  assert.deepEqual(parseExperiment({ ...row, procedure: ['А', 'Б'] }).procedure, ['А', 'Б']);
});
