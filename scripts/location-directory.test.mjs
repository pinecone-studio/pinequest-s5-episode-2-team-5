import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../supabase/reference-data/', import.meta.url);
const source = JSON.parse(readFileSync(new URL('esis-schools.json', root), 'utf8').replace(/^\uFEFF/, ''));
const schools = parseCsv(readFileSync(new URL('schools.csv', root), 'utf8'));
const aimags = parseCsv(readFileSync(new URL('aimags.csv', root), 'utf8'));
const districts = parseCsv(readFileSync(new URL('ub-districts.csv', root), 'utf8'));

test('all classified ESIS schools are available under their district or aimag', () => {
  assert.equal(source.recordset.length, 873);
  assert.equal(schools.length, 868);
  assert.equal(aimags.length, 21);
  assert.equal(districts.length, 9);
  assert.equal(new Set(schools.map((school) => school.esis_id)).size, schools.length);
  assert.deepEqual(new Set(schools.map((school) => school.district_id).filter(Boolean)), new Set(districts.map((row) => row.id)));
  assert.deepEqual(new Set(schools.map((school) => school.aimag_id).filter(Boolean)), new Set(aimags.map((row) => row.id)));
  assert.ok(schools.every((school) => school.soum_id === '' || school.aimag_id));
});

function parseCsv(input) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted && char === '"' && input[index + 1] === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ',') { row.push(cell); cell = ''; }
    else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && input[index + 1] === '\n') index += 1;
      row.push(cell); if (row.some(Boolean)) rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [headers, ...records] = rows;
  return records.map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ''])));
}
