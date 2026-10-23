import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { newJourney, restoreJourney, canContinue, quizScore, QUIZ_IDS } from '../src/lib/catalyst-journey.ts';
import { chemistryText } from '../src/lib/chemistry-text.ts';
const pack = JSON.parse(await readFile(new URL('../src/data/revision-hub/g8-chem/content.json', import.meta.url), 'utf8'));
const topic = pack.topics.find((topic) => topic.id === '3.2');
const questions = QUIZ_IDS.map((id) => topic.quiz.find((question) => question.id === id));

test('journey questions and catalyst notes resolve to the supplied pack', () => {
  assert.ok(questions.every(Boolean));
  assert.equal(new Set(QUIZ_IDS).size, 3);
  assert.ok(topic.notes.some((note) => note.blocks.some((block) => block.t === 'key' && block.term === 'Катализатор')));
});

test('journey requires a prediction, sourced observation and written reflection', () => {
  const p = newJourney();
  assert.equal(canContinue(p), true);
  p.step = 1;
  assert.equal(canContinue(p), false);
  p.prediction = 2; // A wrong prediction must not prevent learning.
  assert.equal(canContinue(p), true);
  p.step = 2;
  p.observation = 'Хүчилтөрөгч хурдан ялгарсан.';
  assert.equal(canContinue(p), false);
  p.source = 'illustration';
  assert.equal(canContinue(p), true);
  p.step = 3;
  p.reflection = 'Катализатор урвалын хурдыг ихэсгэсэн.';
  assert.equal(canContinue(p), false);
  p.revealed = true;
  assert.equal(canContinue(p), true);
});

test('completed journey survives reload, with account-independent serializable state', () => {
  const p = { ...newJourney(), step: 4, prediction: 0, observation: 'Хөөс огцом нэмэгдсэн.',
    source: 'lab', reflection: 'Катализатор өөр зам бий болгосон.', revealed: true, marks: [0, 2],
    answers: Object.fromEntries(questions.map((q) => [q.id, q.answer])), best: 3, completed: true };
  assert.deepEqual(restoreJourney(JSON.parse(JSON.stringify(p))), p);
  assert.equal(quizScore(p.answers, questions), 3);
  assert.equal(quizScore({}, questions), 0);
});

test('invalid saved data cannot skip required steps or inject quiz scores', () => {
  for (const raw of [null, 'invalid', {}, { version: 99 }]) assert.deepEqual(restoreJourney(raw), newJourney());
  const p = restoreJourney({ version: 1, step: 999, prediction: 88, source: 'fake',
    answers: { '3.2-mcq3': 999, unknown: 2 }, marks: [-1, 0, 0, 15], best: 999, completed: true });
  assert.equal(p.step, 1);
  assert.equal(p.completed, false);
  assert.equal(p.prediction, null);
  assert.equal(p.source, null);
  assert.deepEqual(p.answers, {});
  assert.deepEqual(p.marks, [0]);
  assert.equal(p.best, 3);
});

test('chemistry text preserves formula counts, charge and emphasis without HTML', () => {
  assert.deepEqual(chemistryText('H_2SO_4'), [
    { text: 'H', style: 'plain' }, { text: '2', style: 'sub' },
    { text: 'SO', style: 'plain' }, { text: '4', style: 'sub' },
  ]);
  assert.deepEqual(chemistryText('SO_4^2-').slice(-2), [{ text: '4', style: 'sub' }, { text: '2-', style: 'sup' }]);
  assert.equal(chemistryText('**H_2O**')[1].style, 'sub');
  assert.deepEqual(chemistryText('*тайлбар*'), [{ text: 'тайлбар', style: 'italic' }]);
});
