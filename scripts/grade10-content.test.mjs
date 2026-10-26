import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {grade10Model} from '../src/lib/grade10-models.ts';
const json=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const pack=await json('../src/data/revision-hub/g10-chem/content.json');
const activities=await json('../src/data/g10-investigations.json');
const old=[...await json('../src/data/g9-investigations.json'),...await json('../src/data/textbook-investigations.json')];
test('Grade 10 includes all 16 textbook sections with linked, isolated activities',()=>{
 assert.equal(pack.meta.grade,10);assert.equal(pack.topics.length,16);assert.equal(pack.chapters.length,4);assert.equal(activities.length,45);
 const allIds=new Set();
 for(const t of pack.topics){
  assert.ok(pack.chapters.find(c=>c.id===t.chapterId)?.topicIds.includes(t.id));
  for(const key of ['notes','flashcards','quiz','questions','objectives']){
   assert.ok(t[key].length);for(const row of t[key]){assert.ok(row.id.startsWith('g10-'));assert.ok(!allIds.has(row.id));allIds.add(row.id);}
   assert.equal(pack.meta.counts[key],pack.topics.reduce((n,t)=>n+t[key].length,0));
  }
  for(const q of t.quiz)assert.ok(q.answer>=0&&q.answer<q.options.length&&q.explanation);
  for(const q of t.questions){assert.equal(q.totalMarks,q.parts.reduce((n,p)=>n+p.marks,0));for(const p of q.parts)assert.equal(p.scheme.length,p.marks);}
  for(const term of t.keyTerms)assert.ok(pack.glossary.some(g=>g.term===term));
 }
 for(const d of activities){
  assert.ok(d.id.startsWith('g10-'));assert.equal(d.grade,10);assert.ok(!old.some(x=>x.id===d.id));assert.ok(d.method.length>=3&&d.safety&&d.bookPages);
  for(const id of d.practicalIds){const p=pack.topics.find(t=>t.id===d.topicId)?.practicals.find(p=>p.id===id);assert.ok(p,d.id);assert.equal(p.labActivityId,d.id);assert.deepEqual(p.steps,d.method);}
  if(d.mode==='bench')assert.ok(d.supplies.length);
  else {assert.ok(d.controls.length);assert.deepEqual(d.supplies,[]);}
 }
 assert.equal(new Set(activities.map(x=>x.id)).size,activities.length);
 assert.doesNotMatch(JSON.stringify(pack),/<\/?(?:script|html|div|span|iframe)\b/i);
});
test('all 10th grade lab entries require actual stock and bench evidence',()=>{
 for(const d of activities){assert.equal(d.mode,'bench',d.id);assert.equal(d.controls.length,0,d.id);assert.ok(d.supplies.length>=2,d.id);if(d.labRig)assert.ok(d.supplies.includes(d.labRig),d.id);}
});
const calc=(model,p)=>grade10Model({model},p).readings;
test('stoichiometry, Faraday limits, equilibria and polymer end groups conserve amounts',()=>{
 const electro=calc('g10-electrolysis',{current:1,time:600,amount:.1,anode:0,nickel:0});assert.equal(electro[0].value,.1);assert.ok(Math.abs(electro[1].value-.0063546)<1e-10);
 const noPower=calc('g10-electrolysis',{current:0,time:600,amount:2,anode:1,nickel:1});assert.equal(noPower[0].value,0);
 const ester=calc('g10-ester',{acid:10,ethanol:10,water:0});assert.ok(Math.abs(ester[0].value-20/3)<1e-8);
 const wet=calc('g10-ester',{acid:10,ethanol:10,water:20});assert.ok(wet[0].value<ester[0].value);
 const complex=calc('g10-equilibrium',{iron:1,scn:2});assert.ok(Math.abs(complex[0].value-complex[1].value*complex[2].value)<1e-9);
 const nylon=calc('g10-nylon',{diamine:5,diacyl:5,extent:50});assert.equal(nylon[0].value,5);assert.equal(nylon[1].value,5);assert.equal(nylon[4].value,2);
 const gas=calc('g10-sulfur',{copper:10,acid:2,heated:1});assert.equal(gas[0].value,1);assert.equal(gas[2].value,9);
});
test('gas equilibria obey temperature/pressure trends and atom balances',()=>{
 const cold=calc('g10-no2',{temperature:10,volume:1}),hot=calc('g10-no2',{temperature:60,volume:1}),compressed=calc('g10-no2',{temperature:10,volume:.2});
 assert.ok(hot[1].value>cold[1].value);assert.ok(compressed[1].value<cold[1].value);assert.ok(Math.abs(cold[0].value+cold[1].value/2-10)<1e-10);
 const low=calc('g10-haber',{temperature:427,pressure:10}),high=calc('g10-haber',{temperature:427,pressure:200}),warm=calc('g10-haber',{temperature:577,pressure:200});
 assert.ok(high[2].value>low[2].value);assert.ok(warm[2].value<high[2].value);assert.ok(Math.abs(high[0].value+high[2].value/2-1)<1e-10);
});
test('Grade 10 seed is repeatable and does not overwrite existing grades or progress',async()=>{
 const seed=await readFile(new URL('../supabase/grade10-learning-content.sql',import.meta.url),'utf8');
 assert.match(seed,/g10-chem/);assert.match(seed,/g10-starch/);assert.match(seed,/on conflict\(id\) do nothing/);
 assert.doesNotMatch(seed,/delete from|truncate |service_role_key/i);
 const migration=await readFile(new URL('../supabase/migrations/202610250001_grade10_learning.sql',import.meta.url),'utf8');
 assert.match(migration,/grade in \(8,9,10\)/);assert.match(migration,/for update/);assert.match(migration,/greatest/);assert.match(migration,/auth.uid\(\)/);
});
