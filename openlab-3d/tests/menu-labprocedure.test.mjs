import test from 'node:test';
import assert from 'node:assert/strict';
import { groupsForLab } from '../src/menu/labProcedure.ts';
import { cardTitle, groupsToShow, unlinkedCard, useLaunchedProcedure } from '../src/menu/launchedProcedure.ts';

const exp = (id, title, procedure) => ({ id, title, procedure });
const LINKS = { '8-01': 'reaction-timing', '8-13': 'reaction-timing', '7-26': 'g7-indicators', '7-99': 'g7-empty' };
const linkOf = (id) => LINKS[id] ?? null;
const rows = [exp('8-01', 'Хугацаа хэмжих', ['Нэг.', 'Хоёр.']), exp('7-26', 'Индикатор', ['Гурав.']), exp('8-13', 'Урвалын хурд', ['Дөрөв.']), exp('7-99', 'Алхамгүй', []), exp('9-00', 'Холбоогүй', ['Тав.'])];

test('лабтай холбогдсон, алхамтай туршилтуудыг JSON-ийн дарааллаар бүлэглэнэ', () => {
  assert.deepEqual(groupsForLab('g7-indicators', rows, linkOf), [{ title: 'Индикатор', steps: ['Гурав.'] }]);
  // нэг лаб хоёр туршилттай холбогдсон бол хоёр бүлэг
  assert.deepEqual(groupsForLab('reaction-timing', rows, linkOf).map((g) => g.title), ['Хугацаа хэмжих', 'Урвалын хурд']);
});

test('алхамгүй эсвэл холбоосгүй туршилтыг алгасна, хоосон бүлэг гаргахгүй', () => {
  assert.deepEqual(groupsForLab('g7-empty', rows, linkOf), []);
  assert.deepEqual(groupsForLab('no-such-lab', rows, linkOf), []);
});

test('цэснээс эхлүүлсэн бол тэр туршилтын алхам, үгүй бол холбогдсон туршилтуудын алхам', () => {
  const linked = [{ title: 'А', steps: ['а'] }, { title: 'Б', steps: ['б'] }];
  useLaunchedProcedure.getState().clear();
  assert.deepEqual(groupsToShow('reaction-timing', useLaunchedProcedure.getState(), linked), linked);
  useLaunchedProcedure.getState().show('reaction-timing', ['Цэснээс.']);
  assert.deepEqual(groupsToShow('reaction-timing', useLaunchedProcedure.getState(), linked), [{ title: '', steps: ['Цэснээс.'] }]);
  // өөр лаб нээвэл өмнөх цэснээс эхлүүлсэн алхам үлдэхгүй
  assert.deepEqual(groupsToShow('g7-indicators', useLaunchedProcedure.getState(), linked), linked);
  useLaunchedProcedure.getState().clear();
});

test('цэснээс сонгосон туршилтын нэр картын гарчиг болно; өөр лабад лабын нэр хэвээр', () => {
  const store = useLaunchedProcedure.getState();
  store.show('reaction-timing', ['Нэг.'], 'Химийн урвал бүрэн явагдах хугацааг хэмжих');
  assert.equal(cardTitle('reaction-timing', useLaunchedProcedure.getState(), 'Урвалын хугацаа ба массын өөрчлөлт'), 'Химийн урвал бүрэн явагдах хугацааг хэмжих');
  assert.equal(cardTitle('g7-indicators', useLaunchedProcedure.getState(), 'Лабын нэр'), 'Лабын нэр');
  // цэснээс эхлүүлээгүй (нэргүй) бол лабын нэр
  store.show('reaction-timing', ['Нэг.']);
  assert.equal(cardTitle('reaction-timing', useLaunchedProcedure.getState(), 'Лабын нэр'), 'Лабын нэр');
  store.clear();
});

test('лабын заавартай холбоогүй туршилт нэр, алхмаараа карт болно; цэвэрлэсний дараа болон алхамгүй бол карт гарахгүй', () => {
  const store = useLaunchedProcedure.getState();
  store.showUnlinked('Агаараас хөнгөн ба хүнд хийг хураах арга', ['Нэг.', 'Хоёр.']);
  assert.deepEqual(unlinkedCard(useLaunchedProcedure.getState()), { title: 'Агаараас хөнгөн ба хүнд хийг хураах арга', steps: ['Нэг.', 'Хоёр.'] });
  // лабтай холбоотой туршилт эхлүүлбэл холбоогүй карт гарахгүй
  store.show('g7-indicators', ['Гурав.'], 'Индикатор');
  assert.equal(unlinkedCard(useLaunchedProcedure.getState()), null);
  store.showUnlinked('Алхамгүй', []);
  assert.equal(unlinkedCard(useLaunchedProcedure.getState()), null);
  store.clear();
  assert.equal(unlinkedCard(useLaunchedProcedure.getState()), null);
});
