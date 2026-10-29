import test from 'node:test';
import assert from 'node:assert/strict';
import { benchGroups, benchSignText, benchTitle, procedureFor, useLaunchedProcedure } from '../src/menu/launchedProcedure.ts';

const reset = () => useLaunchedProcedure.getState().clear();

test('эхлүүлсэн туршилтын алхмыг тухайн лабын туршилтад л харуулна', () => {
  reset();
  useLaunchedProcedure.getState().show('g10-melting', ['Нэг.', 'Хоёр.']);
  const state = useLaunchedProcedure.getState();
  assert.deepEqual(procedureFor('g10-melting', state), ['Нэг.', 'Хоёр.']);
  assert.deepEqual(procedureFor('g9-boiling', state), []); // өөр туршилтад хуучин алхам үлдэхгүй
});

test('цэвэрлэсний дараа хоосон; хоосон алхамтай туршилт ч алдаа үүсгэхгүй', () => {
  useLaunchedProcedure.getState().show('g10-melting', ['Нэг.']);
  useLaunchedProcedure.getState().clear();
  assert.deepEqual(procedureFor('g10-melting', useLaunchedProcedure.getState()), []);
  useLaunchedProcedure.getState().show('g10-melting', []);
  assert.deepEqual(procedureFor('g10-melting', useLaunchedProcedure.getState()), []);
});

test('шинэ туршилт эхлүүлэхэд өмнөхийг сольно', () => {
  useLaunchedProcedure.getState().show('a', ['А-ийн алхам']);
  useLaunchedProcedure.getState().show('b', ['Б-ийн алхам']);
  const state = useLaunchedProcedure.getState();
  assert.deepEqual(procedureFor('a', state), []);
  assert.deepEqual(procedureFor('b', state), ['Б-ийн алхам']);
});

test('ажлын ширээ: холбоотой туршилтад цэснээс сонгосон нэр, алхам гарна', () => {
  reset();
  useLaunchedProcedure.getState().show('g7-indicators', ['Нэг.', 'Хоёр.'], '7-26 Индикатор');
  const state = useLaunchedProcedure.getState();
  assert.equal(benchTitle('g7-indicators', state, 'Лабын нэр'), '7-26 Индикатор');
  assert.deepEqual(benchGroups('g7-indicators', state, []), [{ title: '7-26 Индикатор', steps: ['Нэг.', 'Хоёр.'] }]);
  // өөр лабын туршилтад сонгосон нэр, алхам дамжихгүй
  assert.equal(benchTitle('g9-boiling', state, 'Буцлалт'), 'Буцлалт');
  assert.deepEqual(benchGroups('g9-boiling', state, []), []);
});

test('ажлын ширээ: лабын заавартай холбоогүй туршилт ч сонгосон нэр, алхмаа харуулна', () => {
  reset();
  useLaunchedProcedure.getState().showUnlinked('7-12 Цахилгаан дамжуулалт', ['Нэг.']);
  const state = useLaunchedProcedure.getState();
  assert.equal(benchTitle(null, state), '7-12 Цахилгаан дамжуулалт');
  assert.deepEqual(benchGroups(null, state, []), [{ title: '7-12 Цахилгаан дамжуулалт', steps: ['Нэг.'] }]);
});

test('ажлын ширээ: алхамгүй холбоогүй туршилт нэрээ харуулна, юу ч сонгоогүй бол нэр байхгүй', () => {
  reset();
  assert.equal(benchTitle(null, useLaunchedProcedure.getState()), undefined);
  assert.deepEqual(benchGroups(null, useLaunchedProcedure.getState(), []), []);
  useLaunchedProcedure.getState().showUnlinked('10-15 Онол', []);
  assert.equal(benchTitle(null, useLaunchedProcedure.getState()), '10-15 Онол');
  assert.deepEqual(benchGroups(null, useLaunchedProcedure.getState(), []), []);
});

test('ажлын ширээ: цэснээс эхлээгүй (апп дахь ▶ товч) лабын нэр, холбоотой алхам гарна', () => {
  reset();
  const linked = [{ title: '7-26 Индикатор', steps: ['Нэг.'] }];
  assert.equal(benchTitle('g7-indicators', useLaunchedProcedure.getState(), 'Лабын нэр'), 'Лабын нэр');
  assert.deepEqual(benchGroups('g7-indicators', useLaunchedProcedure.getState(), linked), linked);
});

test('ширээний 3D самбар: сонгосон туршилтын нэр гарна (холбоотой, холбоогүй хоёуланд)', () => {
  reset();
  useLaunchedProcedure.getState().show('g7-indicators', ['Нэг.'], 'Индикатор');
  assert.equal(benchSignText('g7-indicators', useLaunchedProcedure.getState(), 'Лабын нэр'), 'Ажлын ширээ\nИндикатор');
  useLaunchedProcedure.getState().showUnlinked('Цахилгаан', ['Нэг.']);
  assert.equal(benchSignText(null, useLaunchedProcedure.getState()), 'Ажлын ширээ\nЦахилгаан');
});

test('ширээний 3D самбар: юу ч сонгоогүй бол хуучин бичиг, лабын нэр хэвээр', () => {
  reset();
  assert.equal(benchSignText(null, useLaunchedProcedure.getState()), 'Ажлын ширээ\nТуршилт сонгоогүй байна');
  assert.equal(benchSignText('boil', useLaunchedProcedure.getState(), 'Буцлалт'), 'Ажлын ширээ\nБуцлалт');
  assert.equal(benchSignText('boil', useLaunchedProcedure.getState()), 'Ажлын ширээ\nТуршилт олдсонгүй');
});

test('ширээний 3D самбар: урт нэрийг 2 мөр болгоно', () => {
  reset();
  useLaunchedProcedure.getState().showUnlinked('Хүчил, суурийн уусмалыг индикатораар таних', []);
  assert.equal(benchSignText(null, useLaunchedProcedure.getState()), 'Ажлын ширээ\nХүчил, суурийн уусмалыг\nиндикатораар таних');
});

test('ширээний 3D самбар: хэт урт нэр 3 мөр болно, мөр тус бүр богино, үг алдагдахгүй', () => {
  reset();
  const long = 'Магни ба кальцийн устөрөгчийн хлоридын уусмалтай харилцан үйлчлэлцэх';
  useLaunchedProcedure.getState().showUnlinked(long, []);
  const [head, ...rest] = benchSignText(null, useLaunchedProcedure.getState()).split('\n');
  assert.equal(head, 'Ажлын ширээ');
  assert.equal(rest.length, 3);
  assert.ok(rest.every((line) => line.length <= 32), 'мөр бүр 32 тэмдэгтээс богино байх ёстой');
  assert.equal(rest.join(' '), long);
  // маш олон үгтэй нэр ч 3 мөрөөс хэтрэхгүй
  useLaunchedProcedure.getState().showUnlinked('Нэг хоёр гурав дөрөв тав зургаа долоо найм есөн арав арван нэг арван хоёр арван гурав арван дөрөв', []);
  assert.equal(benchSignText(null, useLaunchedProcedure.getState()).split('\n').length, 4);
});
