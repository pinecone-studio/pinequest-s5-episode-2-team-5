import test from 'node:test';
import assert from 'node:assert/strict';
import { benchTipLine, canAskAi, experimentDoneLine, GRIP_KINDS, nearest, pepTalk, STAR_AI, STAR_POINTS_AT, starLineFor } from '../src/lab/starLines.ts';

test('real danger makes Star say "Stop!" at once, never through the AI', () => {
  for (const key of ['safety:goggles', 'safety:gloves', 'safety:grip', 'safety:hot']) {
    const line = starLineFor({ key, quiet: true }, true);
    assert.equal(line?.tone, 'danger', key);
    assert.equal(line.mood, 'danger');
    assert.match(line.text, /^Зогс!/);
    assert.equal(line.ai, false);
    assert.equal(canAskAi(line, { used: 0, lastAt: -Infinity, failures: 0 }, 1e9), false);
  }
});

test('an overflow, broken glass or wrong waste gets comfort and a tip, not a scolding', () => {
  const spill = starLineFor({ key: 'spill', quiet: true }, false);
  assert.equal(spill?.tone, 'oops');
  assert.match(spill.text, /Дараагийн удаа/);
  assert.equal(starLineFor({ key: 'break', title: 'Шил хагарлаа', detail: 'Хуруу шил унаж хагарлаа.' }, false)?.tone, 'oops');
  assert.equal(starLineFor({ key: 'waste:sink', title: 'Хортой хаягдал', detail: 'Улаан саванд хий.' }, true)?.tone, 'oops');
});

test('a reaction seen for the first time is cheered with its fact; repeats and quiet events stay silent', () => {
  const event = { key: 'ppt:CuOH2', title: 'Цэнхэр тунадас', detail: 'Зэсийн гидроксид үүслээ.' };
  const line = starLineFor(event, true);
  assert.equal(line?.tone, 'good');
  assert.equal(line.ai, true);
  assert.ok(line.text.includes('Зэсийн гидроксид үүслээ.'));
  assert.equal(line.about, 'Цэнхэр тунадас! Зэсийн гидроксид үүслээ.');
  assert.equal(starLineFor(event, false), null);
  assert.equal(starLineFor({ ...event, quiet: true }, true), null);
  assert.equal(starLineFor({ key: 'wear:goggles', title: 'Шил зүүлээ', detail: 'Сайн.' }, true), null);
});

test('pep talks name the next step and finished experiments are worth an AI comment', () => {
  assert.match(pepTalk('Хуруу шилэнд 2 мл хий').text, /Дараагийнх нь: Хуруу шилэнд 2 мл хий$/);
  assert.equal(pepTalk().ai, false);
  const done = experimentDoneLine('x1', 'Саармагжуулалт', 'Хүчил шүлт хоёр ус үүсгэв.');
  assert.equal(done.ai, true);
  assert.match(done.text, /«Саармагжуулалт» туршилт дууслаа!/);
});

test('the AI writes only a few comments: spaced out, capped per visit, and not after repeated failures', () => {
  const line = starLineFor({ key: 'gas:CO2', title: 'Хий ялгарлаа', detail: 'CO₂ бөмбөлөг.' }, true);
  const fresh = { used: 0, lastAt: -Infinity, failures: 0 };
  assert.equal(canAskAi(line, fresh, 1000), true);
  assert.equal(canAskAi(line, { ...fresh, lastAt: 1000 }, 1000 + STAR_AI.minGapMs - 1), false);
  assert.equal(canAskAi(line, { ...fresh, lastAt: 1000 }, 1000 + STAR_AI.minGapMs), true);
  assert.equal(canAskAi(line, { ...fresh, used: STAR_AI.perSession }, 1e9), false);
  assert.equal(canAskAi(line, { ...fresh, failures: STAR_AI.maxFailures }, 1e9), false);
  assert.equal(canAskAi(line, fresh, 0, { ...STAR_AI, perSession: 0 }), false, 'perSession 0 turns AI comments off');
});

test('every warning and mishap Star comforts has something to point at, except broken glass', () => {
  for (const key of ['safety:goggles', 'safety:gloves', 'safety:grip', 'safety:hot', 'spill', 'waste:sink']) {
    const line = starLineFor({ key, quiet: true, title: 'x', detail: 'y' }, true);
    assert.ok(line && line.tone !== 'good', key);
    assert.ok(STAR_POINTS_AT[key], `${key} has a target`);
  }
  assert.equal(STAR_POINTS_AT.break, undefined, 'shards are not something to walk to');
  assert.deepEqual(STAR_POINTS_AT['safety:goggles'], { kinds: ['goggles'], done: 'goggles' });
  assert.equal(STAR_POINTS_AT['safety:hot'].kinds, GRIP_KINDS, 'hot glass: show the tongs and holders');
  assert.equal(STAR_POINTS_AT['safety:hot'].done, 'grip');
  assert.equal(STAR_POINTS_AT.spill.puddle, true);
  assert.equal(STAR_POINTS_AT['waste:sink'].spot, 'chem-waste');
});

test('Star points at the closest of several items on the floor plan', () => {
  const goggles = [{ id: 'far', x: 7.6, z: -14.5 }, { id: 'near', x: -3.5, z: -12.1 }, { id: 'mid', x: 3.3, z: -14.5 }];
  assert.equal(nearest(goggles, -2, -10).id, 'near');
  assert.equal(nearest(goggles, 6, -14).id, 'far');
  assert.equal(nearest([], 0, 0), null);
});

test('sitting down at the worktop earns a tip the AI may word, without flying off to point anywhere', () => {
  const line = benchTipLine('Хуруу шилэнд 2 мл HCl хий.', 'Хүүхэд ширээнд суулаа.');
  assert.equal(line.tone, 'tip');
  assert.equal(line.mood, 'tip', 'its own mood, so it may show over the desk instructions');
  assert.equal(line.ai, true);
  assert.equal(line.text, 'Хуруу шилэнд 2 мл HCl хий.');
  assert.equal(line.about, 'Хүүхэд ширээнд суулаа.');
  assert.equal(STAR_POINTS_AT[line.key], undefined);
  assert.equal(canAskAi(line, { used: 0, lastAt: -Infinity, failures: 0 }, 1000), true);
});
