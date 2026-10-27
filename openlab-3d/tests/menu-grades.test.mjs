import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { CURRICULUM_GRADES, summarizeGrades } from '../src/menu/gradeSummary.ts';

/** Жинхэнэ JSON файлуудыг уншина (src/data/textbook-experiments) */
const DIR = new URL('../src/data/textbook-experiments/', import.meta.url);
const files = Object.fromEntries(
  readdirSync(DIR)
    .filter((name) => /^experiments_grade\d+\.json$/.test(name))
    .map((name) => [name, JSON.parse(readFileSync(new URL(name, DIR), 'utf8'))]),
);

test('7–10-р анги: бүлэг, туршилтын тоо JSON-той таарна', () => {
  const byGrade = Object.fromEntries(summarizeGrades(files).map((g) => [g.grade, g]));
  assert.deepEqual([byGrade[7].chapters, byGrade[7].experiments], [4, 40]);
  assert.deepEqual([byGrade[8].chapters, byGrade[8].experiments], [4, 30]);
  assert.deepEqual([byGrade[9].chapters, byGrade[9].experiments], [5, 31]);
  assert.deepEqual([byGrade[10].chapters, byGrade[10].experiments], [4, 44]);
  for (const grade of [7, 8, 9, 10]) assert.equal(byGrade[grade].available, true);
});

test('JSON байхгүй 11-р анги "Удахгүй" (available=false), дараалал 7→11', () => {
  const summaries = summarizeGrades(files);
  assert.deepEqual(summaries.map((g) => g.grade), CURRICULUM_GRADES);
  const g11 = summaries.find((g) => g.grade === 11);
  assert.deepEqual(g11, { grade: 11, chapters: 0, experiments: 0, available: false });
});

test('шинэ ангийн файл нэмэхэд код өөрчлөхгүйгээр идэвхжинэ (11-р анги)', () => {
  const extra = { ...files, 'experiments_grade11.json': [{ grade: 11, chapter: 'I. Шинэ бүлэг' }, { grade: 11, chapter: 'I. Шинэ бүлэг' }, { grade: 11, chapter: 'II. Өөр бүлэг' }] };
  const g11 = summarizeGrades(extra).find((g) => g.grade === 11);
  assert.deepEqual(g11, { grade: 11, chapters: 2, experiments: 3, available: true });
});

test('муу мөр, муу файл алдаа үүсгэхгүй', () => {
  const messy = { a: 'энэ массив биш', b: [null, 5, { grade: 'x' }, { grade: 8 }] };
  const g8 = summarizeGrades(messy).find((g) => g.grade === 8);
  assert.deepEqual(g8, { grade: 8, chapters: 0, experiments: 1, available: true });
});
