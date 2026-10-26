import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { districtOf, matchesSearch, schoolNumbers, schoolSearchText } from '../src/lib/school-district.ts';

test('reads the сум, дүүрэг or тосгон from a school name', () => {
  assert.equal(districtOf('Архангай аймгийн Батцэнгэл сумын ерөнхий боловсролын сургууль'), 'Батцэнгэл сум');
  assert.equal(districtOf('Архангай аймгийн Чулуут сум бага сургууль'), 'Чулуут сум');
  assert.equal(districtOf('Улаанбаатар хотын Сүхбаатар дүүргийн 13 дугаар сургууль'), 'Сүхбаатар дүүрэг');
  assert.equal(districtOf('Баян-Өлгий аймгийн Цагааннуур тосгоны ерөнхий боловсролын сургууль'), 'Цагааннуур тосгон');
});

test('normalizes letter case so one сум is one group', () => {
  assert.equal(districtOf('Архангай аймгийн Өндөр-Улаан сумын Ерөнхий боловсролын сургууль'), 'Өндөр-Улаан сум');
  assert.equal(districtOf('Архангай аймгийн Өндөр-улаан сумын хануй багийн бага сургууль'), 'Өндөр-Улаан сум');
  assert.equal(districtOf('Архангай аймгийн чулуут сумын ерөнхий боловсролын сургууль'), 'Чулуут сум');
});

test('names without a сум or дүүрэг give null', () => {
  assert.equal(districtOf('Архангай аймгийн Гурван тамир коллеж'), null);
  assert.equal(districtOf('Шинжлэх ухаан технологийн Эрдэм ахлах сургууль'), null);
});

test('search matches every word, in any order and case', () => {
  const name = 'Улаанбаатар хотын Сүхбаатар дүүргийн 13 дугаар сургууль';
  assert.ok(matchesSearch(name, 'сүхбаатар 13'));
  assert.ok(matchesSearch(name, '13  СҮХБААТАР'));
  assert.ok(matchesSearch(name, ''));
  assert.ok(!matchesSearch(name, 'сүхбаатар 14'));
});

test('reads school numbers written in words or digits', () => {
  const cases = [
    ['Нийслэлийн ерөнхий боловсролын хорин тав дугаар сургууль', 25],
    ['Нийслэлийн ерөнхий боловсролын зуун дөчин тав дугаар сургууль', 145],
    ['… ерөнхий боловсролын нэг зуун хорин нэг дүгээр сургууль', 121],
    ['… ерөнхий боловсролын нэгзуун хоёрдугаар сургууль', 102],
    ['… ерөнхий боловсролын тавин долдугаар сургууль', 57],
    ['… ерөнхий боловсролын тавьдугаар сургууль', 50],
    ['… ерөнхий боловсролын арван гурав дугаар сургууль', 13],
    ['Есөнбулаг сумын ерөнхий боловсролын гуравдугаар сургууль', 3],
    ['… ерөнхий боловсролын5 сургууль', 5],
    ['… 3-р сургууль', 3],
  ];
  for (const [name, number] of cases) assert.deepEqual(schoolNumbers(name), [number], name);
  assert.deepEqual(schoolNumbers('Жаргалан хоёр сургууль'), []);
  assert.deepEqual(schoolNumbers('Архангай аймгийн Гурван тамир коллеж'), []);
});

test('searching a number finds a school whose number is written in words', () => {
  const text = schoolSearchText('Нийслэлийн ерөнхий боловсролын хорин тав дугаар сургууль');
  assert.ok(matchesSearch(text, '25'));
  assert.ok(matchesSearch(text, '25-р'));
  assert.ok(matchesSearch(text, 'хорин тав'));
  assert.ok(!matchesSearch(text, '26'));
});

test('most seeded schools carry a сум or дүүрэг', async () => {
  const sql = await readFile(new URL('../supabase/migrations/202610260003_seed_schools.sql', import.meta.url), 'utf8');
  const names = [...sql.matchAll(/\('(?:city|province)', '(?:[^']|'')*', '((?:[^']|'')*)', (?:true|false)\)/g)].map((m) => m[1]);
  assert.equal(names.length, 1000);
  const withDistrict = names.filter((name) => districtOf(name) !== null).length;
  assert.ok(withDistrict >= 600, `only ${withDistrict} names have a сум or дүүрэг`);
});
