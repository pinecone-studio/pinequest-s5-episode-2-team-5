import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseExperiment, parseExperimentRows, matchesCompletion } from '../openlab-3d/src/lab/experiment-schema.ts';

const definitions = JSON.parse(await readFile(new URL('../openlab-3d/src/data/experiments.json', import.meta.url), 'utf8'));
const rows = definitions.map((content) => ({ id: content.id, schema_version: 1, content }));

test('all 14 bundled experiments round-trip through database JSON with stable ids', () => {
  assert.equal(definitions.length, 14);
  assert.deepEqual(parseExperimentRows(JSON.parse(JSON.stringify(rows))), definitions);
  assert.equal(new Set(definitions.map((item) => item.id)).size, 14);
});

test('elephant toothpaste retains its three event-driven completion rules', () => {
  const elephant = definitions.find((item) => item.id === 'elephant');
  assert.deepEqual(elephant.steps.map((step) => step.id), ['h2o2', 'soap', 'cat']);
  for (const [i, key] of ['use:h2o2', 'use:soap', 'foam'].entries()) {
    assert.equal(matchesCompletion({ key }, elephant.steps[i].completion), true);
    assert.equal(matchesCompletion({ key: 'unrelated' }, elephant.steps[i].completion), false);
  }
});

test('measurement thresholds preserve inclusive/exclusive boundaries and require finite values', () => {
  const hot = { events: ['measure:temp'], value: { gte: 90 } };
  assert.equal(matchesCompletion({ key: 'measure:temp', value: 90 }, hot), true);
  assert.equal(matchesCompletion({ key: 'measure:temp', value: 89.99 }, hot), false);
  for (const value of [undefined, NaN, Infinity]) assert.equal(matchesCompletion({ key: 'measure:temp', value }, hot), false);
  assert.equal(matchesCompletion({ key: 'measure:ph', value: 95 }, hot), false);
  assert.equal(matchesCompletion({ key: 'measure:ph', value: 4 }, { events: ['measure:ph'], value: { lt: 4 } }), false);
});

test('multiple events and flame prefixes use declarative matching', () => {
  assert.equal(matchesCompletion({ key: 'ppt:AgCl' }, { events: ['ppt:AgCl', 'ppt:BaSO4'] }), true);
  assert.equal(matchesCompletion({ key: 'flame:Ca' }, { prefixes: ['flame:Ca', 'flame:Cu'] }), true);
  assert.equal(matchesCompletion({ key: 'flame:Na' }, { prefixes: ['flame:Ca', 'flame:Cu'] }), false);
});

test('invalid rows, duplicate identities and executable completion payloads are rejected', () => {
  assert.throws(() => parseExperimentRows([{ ...rows[0], schema_version: 2 }]));
  assert.throws(() => parseExperimentRows([{ ...rows[0], id: 'different-id' }]));
  assert.throws(() => parseExperimentRows([rows[0], rows[0]]));
  const invalid = structuredClone(definitions[0]);
  invalid.steps[1].id = invalid.steps[0].id;
  assert.throws(() => parseExperiment(invalid));
  invalid.steps[1].id = 'other';
  invalid.steps[0].completion = { events: ['foam'], javascript: 'globalThis.compromised = true' };
  assert.throws(() => parseExperiment(invalid));
  invalid.steps[0].completion = {};
  assert.throws(() => parseExperiment(invalid));
  assert.equal(globalThis.compromised, undefined);
});

test('empty published catalog is valid, while oversized/malformed catalogs are rejected', () => {
  assert.deepEqual(parseExperimentRows([]), []);
  assert.throws(() => parseExperimentRows(Array.from({ length: 251 }, () => rows[0])));
  assert.throws(() => parseExperimentRows(null));
  assert.throws(() => parseExperiment({ ...definitions[0], steps: [] }));
});
