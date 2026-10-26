import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('supabase/reference-data');
const source = JSON.parse(readFileSync(resolve(root, 'esis-schools.json'), 'utf8').replace(/^\uFEFF/, ''));
const aimags = new Map(csv('aimags.csv').map((row) => [normalize(row.name), row.id]));
const districts = new Map(csv('ub-districts.csv').map((row) => [normalize(row.name), row.id]));

function csv(filename) {
  const [headerLine, ...lines] = readFileSync(resolve(root, filename), 'utf8').trim().split(/\r?\n/);
  const headers = headerLine.split(',');
  return lines.map((line) => Object.fromEntries(line.split(',').map((value, index) => [headers[index], value])));
}
function normalize(value) { return value.toLocaleLowerCase().replace(/[\s-]/g, ''); }
function quote(value) { return `"${String(value).replaceAll('"', '""')}"`; }

const records = source.recordset.map((item) => {
  const parent = item.ParentInstitutionName.trim();
  const districtId = districts.get(normalize(parent));
  if (districtId) return { name: item.InstitutionName.trim(), region_type: 'ulaanbaatar', district_id: districtId, aimag_id: '', soum_id: '', is_sample: 'false', esis_id: item.InstitutionId };
  const aimagId = aimags.get(normalize(parent.replace(/ аймаг$/i, '')));
  if (aimagId) return { name: item.InstitutionName.trim(), region_type: 'rural', district_id: '', aimag_id: aimagId, soum_id: '', is_sample: 'false', esis_id: item.InstitutionId };
  return null;
}).filter(Boolean);

const ids = records.map((row) => row.esis_id);
if (new Set(ids).size !== ids.length) throw new Error('ESIS source contains duplicate InstitutionId values');
if (records.length < 800) throw new Error(`Only ${records.length} schools matched known districts/aimags`);
const header = ['name', 'region_type', 'district_id', 'aimag_id', 'soum_id', 'is_sample', 'esis_id'];
writeFileSync(resolve(root, 'schools.csv'), `${header.join(',')}\n${records.map((row) => header.map((key) => quote(row[key])).join(',')).join('\n')}\n`);
console.log(`Normalized ${records.length} ESIS schools; skipped ${source.recordset.length - records.length} without a known district or aimag parent.`);
