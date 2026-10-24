import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pack = JSON.parse(await readFile(new URL('../src/data/revision-hub/g8-chem/content.json', import.meta.url), 'utf8'));
const reference = JSON.parse(await readFile(new URL('../docs/hub-g8/grade8-chemistry.content.json', import.meta.url), 'utf8'));
const types = await readFile(new URL('../src/data/revision-hub/types.ts', import.meta.url), 'utf8');
const glossaryAdditions = JSON.parse(await readFile(new URL('../src/data/revision-hub/g8-chem/glossary-additions.json', import.meta.url), 'utf8'));
const glossary = [...pack.glossary, ...glossaryAdditions];
const topics = new Set(pack.topics.map((topic) => topic.id));
const all = (field) => pack.topics.flatMap((topic) => topic[field]);

// Read the union itself so this check cannot drift from the supplied TypeScript types.
const figureUnion = types.match(/export type FigureName\s*=([\s\S]*?);/);
assert.ok(figureUnion, 'FigureName union must exist');
const figures = new Set([...figureUnion[1].matchAll(/["']([^"']+)["']/g)].map((match) => match[1]));

function walk(value, visit, path = 'pack') {
  if (!value || typeof value !== 'object') return;
  visit(value, path);
  for (const [key, child] of Object.entries(value)) walk(child, visit, `${path}.${key}`);
}

test('content inventory matches the Grade 8 specification', () => {
  assert.equal(pack.topics.length, 11, 'topics');
  assert.equal(all('notes').length, 40, 'notes');
  assert.equal(all('flashcards').length, 106, 'flashcards');
  assert.equal(all('quiz').length, 79, 'MCQs');
  assert.equal(all('questions').length, 33, 'structured questions');
  assert.equal(all('questions').reduce((sum, question) => sum + question.totalMarks, 0), 166, 'marks');
  assert.equal(pack.elements.length, 118, 'elements');
  assert.equal(pack.tables.length, 17, 'reference tables');
  assert.equal(Object.keys(pack.lab.structured).length, 8, 'structured practicals');
  assert.equal(all('practicals').length, 23, 'practical summaries');
  assert.equal(all('objectives').length, 43, 'objectives');
  assert.equal(pack.glossary.length, 47, 'glossary terms');
  assert.equal(pack.errata.length, 13, 'errata');
});

test('all object ids across the pack are nonempty and unique', () => {
  const seen = new Map();
  walk(pack, (value, path) => {
    if (!Object.hasOwn(value, 'id')) return;
    assert.equal(typeof value.id, 'string', path);
    assert.ok(value.id.trim(), `Empty id at ${path}`);
    assert.ok(!seen.has(value.id), `Duplicate id ${value.id}: ${seen.get(value.id)} and ${path}`);
    seen.set(value.id, path);
  });
  assert.equal(new Set(pack.elements.map((element) => element.z)).size, 118);
  assert.equal(new Set(pack.elements.map((element) => element.symbol)).size, 118);
});

test('every MCQ answer index is within its options', () => {
  for (const question of all('quiz')) {
    assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length,
      `${question.id}: answer ${question.answer} is outside ${question.options.length} options`);
  }
  for (const [id, practical] of Object.entries(pack.lab.structured)) {
    const { a, o } = practical.safety;
    assert.ok(Number.isInteger(a) && a >= 0 && a < o.length, `${id}: invalid safety answer ${a}`);
  }
});

test('question mark schemes match part marks and question totals', () => {
  for (const question of all('questions')) {
    for (const part of question.parts) {
      assert.equal(part.scheme.length, part.marks, `${question.id}, part ${part.label}`);
    }
    assert.equal(question.parts.reduce((sum, part) => sum + part.marks, 0), question.totalMarks, question.id);
  }
});

test('structured practicals resolve and have valid conclusions and result axes', () => {
  const practicals = new Set(all('practicals').map((practical) => practical.id));
  for (const [id, practical] of Object.entries(pack.lab.structured)) {
    assert.ok(practicals.has(id), `Unknown topic practical ${id}`);
    assert.equal(practical.concl.s.length, practical.concl.m, `${id}: conclusion marks`);
    assert.notEqual(Object.hasOwn(practical.table, 'rows'), Object.hasOwn(practical.table, 'x'),
      `${id}: requires exactly one of table.rows / table.x`);
    const rows = practical.table.rows ?? practical.table.x.values;
    // Line charts store one series per column; categorical charts store one array per row.
    const outer = practical.table.x ? practical.table.cols.length : rows.length;
    const inner = practical.table.x ? rows.length : practical.table.cols.length;
    assert.equal(practical.table.sample.length, outer, `${id}: sample count`);
    for (const series of practical.table.sample) {
      assert.equal(series.length, inner, `${id}: sample length`);
    }
  }
});

test('every key term resolves to a glossary entry', () => {
  const normalize = (term) => term.normalize('NFC').trim().toLocaleLowerCase('mn');
  const terms = new Set(glossary.map((entry) => normalize(entry.term)));
  assert.equal(terms.size, glossary.length, 'Glossary terms must be unique');
  assert.ok(glossary.every((entry) => entry.definition.trim()), 'Every glossary term needs a definition');
  const unresolved = pack.topics.flatMap((topic) => topic.keyTerms
    .filter((term) => !terms.has(normalize(term)))
    .map((term) => `${topic.id}: ${term}`));
  assert.deepEqual(unresolved, [], `Unresolved glossary key terms (${unresolved.length}):\n${unresolved.join('\n')}`);
});

test('glossary, chapters, tables and errata resolve to existing content', () => {
  for (const entry of [...glossary, ...pack.tables, ...pack.errata]) {
    assert.ok(topics.has(entry.topicId), `Unknown topic ${entry.topicId}`);
  }
  for (const chapter of pack.chapters) {
    for (const id of chapter.topicIds) {
      assert.ok(topics.has(id), `Unknown chapter topic ${id}`);
      assert.equal(pack.topics.find((topic) => topic.id === id).chapterId, chapter.id);
    }
  }
  for (const entry of pack.errata) {
    assert.ok(pack.topics.find((topic) => topic.id === entry.topicId).notes.some((note) => note.id === entry.noteId),
      `Unknown errata note ${entry.noteId}`);
  }
});

test('every figure block uses one of the 15 FigureName values', () => {
  assert.equal(figures.size, 15);
  for (const note of all('notes')) {
    for (const block of note.blocks) {
      if (block.t === 'fig') assert.ok(figures.has(block.name), `${note.id}: unknown figure ${block.name}`);
    }
  }
});

test('bundled content preserves the supplied source pack', () => {
  assert.deepEqual(pack, reference);
});
