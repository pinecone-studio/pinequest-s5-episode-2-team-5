import test from 'node:test';
import assert from 'node:assert/strict';
import { procedureFor, useLaunchedProcedure } from '../src/menu/launchedProcedure.ts';

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
