import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { makeElementQuiz, outerElectrons, GROUP_GUIDES, restoreElementMemory, emptyElementMemory } from '../src/lib/periodic-learning.ts';
const elements = JSON.parse(await readFile(new URL('../src/data/revision-hub/g8-chem/content.json', import.meta.url), 'utf8')).elements;

test('all 118 neutral shell/configuration diagrams conserve the electron count', () => {
  for (const element of elements) {
    assert.equal(element.shells.reduce((sum, n) => sum + n, 0), element.z, element.symbol);
    assert.equal(element.config.reduce((sum, [, n]) => sum + n, 0), element.z, element.symbol);
    assert.ok(element.shells.every((n) => Number.isInteger(n) && n > 0));
    const shells = [];
    for (const [orbital, count] of element.config) {
      const index = Number(orbital[0]) - 1;
      shells[index] = (shells[index] ?? 0) + count;
    }
    assert.deepEqual(element.shells, shells, `${element.symbol}: shell diagram must match configuration`);
  }
});

test('group comparisons use consistent first-20 valence electrons, including helium', () => {
  for (const guide of GROUP_GUIDES) for (const z of guide.examples) {
    const element = elements[z - 1];
    assert.equal(element.group, guide.group);
    assert.equal(outerElectrons(element), z === 2 ? 2 : guide.group <= 2 ? guide.group : guide.group - 10);
  }
  assert.notEqual(elements[0].category, 'am');
  assert.equal(outerElectrons(elements[45]), 18); // Pd is why the main-group shortcut must not be universal.
});

test('recall sessions contain unique targets and unambiguous options across every scope', () => {
  for (const pool of [elements.slice(0, 20), elements, ...Array.from({ length: 18 }, (_, i) => elements.filter((e) => e.group === i + 1))]) {
    for (let pass = 0; pass < 20; pass++) {
      const questions = makeElementQuiz(pool, elements);
      assert.equal(questions.length, Math.min(10, pool.length));
      assert.equal(new Set(questions.map((q) => q.z)).size, questions.length);
      for (const question of questions) {
        assert.ok(pool.some((e) => e.z === question.z));
        if (question.kind === 'position') assert.equal(question.answer, String(question.z));
        else {
          assert.equal(question.options.length, 4);
          assert.equal(new Set(question.options).size, 4);
          assert.equal(question.options.filter((answer) => answer === question.answer).length, 1);
          assert.ok(!question.options.includes('null'));
        }
      }
    }
  }
  assert.deepEqual(makeElementQuiz([], elements), []);
});

test('memorization progress restores safely and keeps per-element attempt counts', () => {
  const data = { version: 1, known: [1, 11, 17], attempts: { 11: { correct: 2, total: 3 } } };
  assert.deepEqual(restoreElementMemory(JSON.parse(JSON.stringify(data))), data);
  assert.deepEqual(restoreElementMemory(null), emptyElementMemory());
  const invalid = restoreElementMemory({ version: 1, known: [0, 1, 1, 119, '3'], attempts: { 2: { correct: 5, total: 1 }, 119: { correct: 1, total: 1 } } });
  assert.deepEqual(invalid.known, [1]); assert.deepEqual(invalid.attempts, {});
});
