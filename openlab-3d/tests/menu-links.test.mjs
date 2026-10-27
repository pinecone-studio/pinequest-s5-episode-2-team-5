import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parseExperiment } from '../src/menu/chapterBuild.ts';
import { guidedMessage, unguidedMessage } from '../src/menu/launchText.ts';

const DATA = new URL('../src/data/', import.meta.url);
const TEXTBOOK = new URL('textbook-experiments/', DATA);
const read = (url) => JSON.parse(readFileSync(url, 'utf8'));

const links = read(new URL('lab-links.json', TEXTBOOK));
const textbookRows = readdirSync(TEXTBOOK)
  .filter((name) => /^experiments_grade\d+\.json$/.test(name))
  .flatMap((name) => read(new URL(name, TEXTBOOK)));

/** 3D лабын туршилтын id-ууд: experiments.json + Expo-ийн сурах бичгийн investigations (src/data) */
const EXPO_DATA = new URL('../../src/data/', import.meta.url);
const labIds = new Set(read(new URL('experiments.json', DATA)).map((e) => e.id));
for (const name of readdirSync(EXPO_DATA).filter((n) => /investigations.*\.json$/.test(n))) {
  for (const row of read(new URL(name, EXPO_DATA))) labIds.add(row.id);
}

test('холбоос бүр лабт байгаа туршилтыг заана', () => {
  const missing = Object.entries(links).filter(([, labId]) => !labIds.has(labId));
  assert.deepEqual(missing, []);
});

test('холбоосын түлхүүр бүр JSON-д байгаа туршилт', () => {
  const ids = new Set(textbookRows.map((r) => r.id));
  assert.deepEqual(Object.keys(links).filter((id) => !ids.has(id)), []);
});

test('анги таарна: "7-xx" нь g7-… туршилттай холбогдоно (g8, g9, g10 мөн адил)', () => {
  const wrong = Object.entries(links).filter(([id, labId]) => {
    const m = labId.match(/^g(\d+)-/);
    return m && m[1] !== id.split('-')[0];
  });
  assert.deepEqual(wrong, []);
});

test('7-р ангийн 40-өөс 31 нь холбогдсон', () => {
  assert.equal(Object.keys(links).filter((id) => id.startsWith('7-')).length, 31);
});

test('"—" тэмдэг хоосон болно (томьёо, хугацаа, аюулгүй байдал)', () => {
  const e = parseExperiment({ id: '7-01', grade: 7, chapter: 'a', section: 'b', title: 't', equation: '—', duration: '—', safety: '—' });
  assert.deepEqual([e.equation, e.duration, e.safety], ['', '', '']);
  const kept = parseExperiment({ id: '7-01', grade: 7, chapter: 'a', section: 'b', title: 't', duration: '10–15 мин', safety: 'Гал' });
  assert.deepEqual([kept.duration, kept.safety], ['10–15 мин', 'Гал']);
});

test('Pip-ийн мессеж: заавартай', () => {
  assert.match(guidedMessage('Фенолфталейн'), /«Фенолфталейн» эхэллээ/);
});

test('Pip-ийн мессеж: заавар байхгүй үед бодис, хэрэгсэл, аюулгүй байдал хэлнэ', () => {
  const e = parseExperiment({
    id: '7-13', grade: 7, chapter: 'a', section: 'b', title: 'Электролиз', page: '42–43',
    substances: 'Зэсийн хлорид; Ус', equipment: 'Электрод', safety: 'Өндөр температур.',
  });
  const text = unguidedMessage(e);
  assert.match(text, /х\.42–43/);
  assert.match(text, /Бодис: Зэсийн хлорид, Ус\./);
  assert.match(text, /Хэрэгсэл: Электрод\./);
  assert.match(text, /Анхаар: Өндөр температур\./);
  assert.doesNotMatch(text, /\.\./); // төгсгөлийн цэг давхардахгүй
});

test('Pip-ийн мессеж: аюулгүй байдал хоосон бол "Анхаар" гарахгүй', () => {
  const e = parseExperiment({ id: '7-01', grade: 7, chapter: 'a', section: 'b', title: 'T', safety: '—', substances: 'Ус' });
  assert.doesNotMatch(unguidedMessage(e), /Анхаар|—/);
});
