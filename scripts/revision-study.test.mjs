import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { emptyRevision, restoreRevision, topicStats, nextRevisionStep, shuffled, periodicPosition } from '../src/lib/revision-progress.ts';
import { chemistryText, chemistrySegments } from '../src/lib/chemistry-text.ts';
const pack = JSON.parse(await readFile(new URL('../src/data/revision-hub/g8-chem/content.json', import.meta.url), 'utf8'));

test('all topics have a next step and completion reflects the five study areas', () => {
  for (const topic of pack.topics) {
    const empty = emptyRevision();
    assert.equal(nextRevisionStep(topic, empty), 'notes');
    assert.equal(topicStats(topic, empty).completion, 0);
    const finished = { ...empty, notes: topic.notes.map((n) => n.id),
      cards: Object.fromEntries(topic.flashcards.map((c) => [c.id, 'known'])),
      quizBest: { [topic.id]: 100 }, questionBest: Object.fromEntries(topic.questions.map((q) => [q.id, q.totalMarks])),
      practicals: topic.practicals.map((p) => p.id) };
    assert.equal(topicStats(topic, finished).completion, 1);
    assert.equal(nextRevisionStep(topic, finished), null);
    finished.ratings[topic.objectives[0].id] = 'red';
    assert.equal(nextRevisionStep(topic, finished), 'notes');
  }
});

test('saved revision state round-trips and rejects invalid score and rating values', () => {
  const p = { ...emptyRevision(), notes: ['1.1a'], cards: { one: 'again' }, quizBest: { '1.1': 80 } };
  assert.deepEqual(restoreRevision(JSON.parse(JSON.stringify(p))), p);
  const invalid = restoreRevision({ version: 1, notes: ['a', 'a', 4], cards: { a: 'invalid' }, quizBest: { a: 150, b: -5 }, ratings: { a: 'purple' } });
  assert.deepEqual(invalid.notes, ['a']);
  assert.deepEqual(invalid.cards, {}); assert.deepEqual(invalid.quizBest, {}); assert.deepEqual(invalid.ratings, {});
  assert.deepEqual(restoreRevision({ version: 99 }), emptyRevision());
});

test('shuffle keeps every card once and never mutates the input', () => {
  const cards = pack.topics[0].flashcards;
  const before = JSON.stringify(cards);
  assert.deepEqual(shuffled(cards).map((c) => c.id).sort(), cards.map((c) => c.id).sort());
  assert.equal(JSON.stringify(cards), before);
});

test('rich chemistry text handles subscripts, charges and a stacked nuclide token', () => {
  assert.deepEqual(chemistryText('H_2SO_4').filter((t) => t.style === 'sub').map((t) => t.text), ['2', '4']);
  assert.deepEqual(chemistryText('SO_4^2-').at(-1), { text: '2-', style: 'sup' });
  assert.deepEqual(chemistrySegments('{{nuc:35:17:Cl}}'), [{ kind: 'nuclide', mass: '35', atomic: '17', symbol: 'Cl' }]);
});

test('all 15 pack figures have native registry entries', async () => {
  const source = await readFile(new URL('../src/components/revision-hub/study-figures.tsx', import.meta.url), 'utf8');
  const registry = source.match(/export const FIGURES = \{([\s\S]*?)\} satisfies/)[1];
  const names = new Set([...registry.matchAll(/(\w+):/g)].map((m) => m[1]));
  assert.equal(names.size, 15);
  for (const topic of pack.topics) for (const note of topic.notes) for (const block of note.blocks) {
    if (block.t === 'fig') assert.ok(names.has(block.name), `Missing figure ${block.name}`);
  }
});

test('periodic positions include La/Ac f rows without collisions, and retain H/Cr/Cu exceptions', () => {
  const at = (z) => periodicPosition(pack.elements[z - 1]);
  assert.deepEqual(at(58), { row: 9, col: 5 });
  assert.deepEqual(at(71), { row: 9, col: 18 });
  assert.deepEqual(at(90), { row: 10, col: 5 });
  assert.deepEqual(at(103), { row: 10, col: 18 });
  assert.equal(new Set(pack.elements.map((e) => JSON.stringify(periodicPosition(e)))).size, 118);
  assert.notEqual(pack.elements[0].category, 'am');
  for (const [z, d] of [[24, 5], [29, 10]]) {
    assert.ok(pack.elements[z - 1].config.some(([s, n]) => s === '3d' && n === d));
    assert.ok(pack.elements[z - 1].config.some(([s, n]) => s === '4s' && n === 1));
  }
});
