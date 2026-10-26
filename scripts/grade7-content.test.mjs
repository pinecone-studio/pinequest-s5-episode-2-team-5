import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {grade7Model} from '../src/lib/grade7-models.ts';
const json=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const pack=await json('../src/data/revision-hub/g7-chem/content.json');
const activities=await json('../src/data/g7-investigations.json');
const old=[...await json('../src/data/g9-investigations.json'),...await json('../src/data/g10-investigations.json'),...await json('../src/data/textbook-investigations.json')];
test('Grade 7 covers 11 textbook topics, all 31 numbered experiments and one research exercise',()=>{
 assert.equal(pack.meta.grade,7);assert.equal(pack.topics.length,11);assert.equal(pack.chapters.length,4);assert.equal(activities.length,32);
 assert.deepEqual(activities.filter(d=>d.textbookExperiment).map(d=>Number(d.bookPages)),[8,11,12,15,16,21,23,33,35,38,41,44,45,46,50,54,56,58,59,60,62,63,64,66,69,72,84,85,87,89,90]);
 const ids=new Set();
 for(const t of pack.topics){
  assert.ok(pack.chapters.find(c=>c.id===t.chapterId)?.topicIds.includes(t.id));
  for(const key of ['notes','flashcards','quiz','questions','objectives','practicals']){
   assert.ok(t[key].length);for(const row of t[key]){assert.ok(row.id.startsWith('g7-'));assert.ok(!ids.has(row.id));ids.add(row.id);}
   assert.equal(pack.meta.counts[key],pack.topics.reduce((n,t)=>n+t[key].length,0));
  }
  for(const q of t.quiz)assert.ok(q.answer>=0&&q.answer<q.options.length&&q.explanation);
  for(const q of t.questions){assert.equal(q.totalMarks,q.parts.reduce((n,p)=>n+p.marks,0));for(const p of q.parts)assert.equal(p.scheme.length,p.marks);}
  for(const term of t.keyTerms)assert.ok(pack.glossary.some(g=>g.term===term));
 }
 for(const d of activities){
  assert.equal(d.grade,7);assert.ok(!old.some(x=>x.id===d.id));assert.ok(d.method.length>=3&&d.safety&&d.bookPages);
  for(const id of d.practicalIds){const p=pack.topics.find(t=>t.id===d.topicId)?.practicals.find(p=>p.id===id);assert.ok(p,d.id);assert.equal(p.labActivityId,d.id);assert.deepEqual(p.steps,d.method);}
  if(d.mode==='bench')assert.ok(d.supplies.length);else{assert.ok(d.controls.length);assert.deepEqual(d.supplies,[]);}
 }
 assert.equal(new Set(activities.map(x=>x.id)).size,activities.length);
 for(const e of pack.errata)assert.ok(pack.topics.find(t=>t.id===e.topicId)?.notes.some(n=>n.id===e.noteId));
 assert.doesNotMatch(JSON.stringify(pack),/<\/?(?:script|html|div|span|iframe)\b/i);
});
test('all 7th grade lab entries require actual stock and bench evidence',()=>{
 for(const d of activities){assert.equal(d.mode,'bench',d.id);assert.equal(d.controls.length,0,d.id);assert.ok(d.supplies.length>=2,d.id);if(d.labRig)assert.ok(d.supplies.includes(d.labRig),d.id);}
});
const calc=(model,p)=>grade7Model({model},p);
test('iron/sulfur mixtures and reactions conserve mass including excess magnetic iron',()=>{
 for(const action of [0,1,2]){
  const r=calc('g7-iron-sulfur',{iron:1.12,sulfur:.32,extent:100,action}).readings;
  assert.ok(Math.abs(r[0].value+r[1].value+r[2].value-1.44)<1e-10);
  if(action===2){assert.ok(r[2].value>0);assert.ok(r[0].value>0);assert.equal(r[0].value,r[3].value);}else assert.equal(r[2].value,0);
 }
});
test('oxidation and hydroxide models respect oxygen, metal and hydroxide limits',()=>{
 const r=calc('g7-oxidation',{metal:1,mass:1,oxygen:1,extent:100}).readings;
 assert.ok(Math.abs(r[2].value-.031998)<1e-10);assert.ok(Math.abs(r[0].value+r[1].value-r[3].value)<1e-10);
 assert.equal(calc('g7-oxidation',{metal:0,mass:1,oxygen:0,extent:100}).readings[1].value,0);
 const al=calc('g7-hydroxide',{metal:0,amount:1,hydroxide:4}).readings;assert.equal(al[0].value,0);assert.equal(al[2].value,1);
 const cu=calc('g7-hydroxide',{metal:1,amount:1,hydroxide:4}).readings;assert.equal(cu[0].value,1);assert.equal(cu[2].value,0);
});
test('soil retention balances liquid and invalid measurements cannot create negative volumes',()=>{
 for(const seconds of [0,60,180]){
  const r=calc('g7-retention',{soil:2,mass:.25,volume:250,seconds}).readings;
  assert.ok(Math.abs(r[0].value+r[1].value+r[2].value-250)<1e-9);assert.ok(r.every(x=>x.value>=0));
 }
 const invalid=calc('g7-density',{mass:20,initial:20,final:10});assert.equal(invalid.readings[0].value,0);assert.ok(!invalid.readings.some(r=>r.label==='Нягт'));
 const soil=calc('g7-soil-composition',{mineral:80,organic:20,water:30});assert.ok(!soil.readings.some(r=>r.label==='Агаар'));
});
test('corrosion controls, zero-input gas and seed scenarios stay physically bounded',()=>{
 const rust=calc('g7-rust',{days:5,dissolved:0}).readings;assert.equal(rust[0].value,0);assert.ok(rust[1].value>0);assert.equal(rust[2].value,0);
 const wet=calc('g7-rust',{days:5,dissolved:1}).readings;assert.ok(wet[0].value>0&&wet[0].value<wet[1].value);
 const protectedR=calc('g7-protection',{days:5,scratched:0}).readings;assert.equal(protectedR.length,6);assert.ok(protectedR[3].value>protectedR[0].value);assert.ok(protectedR[1].value<protectedR[0].value);
 assert.equal(calc('g7-metal-acid',{material:0,mass:.1,acid:0,time:60}).readings[0].value,0);
 assert.equal(calc('g7-metal-acid',{material:4,mass:.1,acid:2,time:60}).readings[0].value,0);
 assert.equal(calc('g7-growth',{ph:7,weeks:4,seeds:0}).readings[1].value,0);
});
test('Grade 7 seed preserves existing editorial content and uses an additive schema migration',async()=>{
 const seed=await readFile(new URL('../supabase/grade7-learning-content.sql',import.meta.url),'utf8');
 assert.match(seed,/g7-chem/);assert.match(seed,/g7-soil-retention/);assert.match(seed,/on conflict\(id\) do nothing/);
 assert.doesNotMatch(seed,/delete from|truncate |service_role_key/i);
 const migration=await readFile(new URL('../supabase/migrations/202610250002_grade7_learning.sql',import.meta.url),'utf8');
 assert.match(migration,/grade in \(7,8,9,10\)/);assert.match(migration,/for update/);assert.match(migration,/greatest/);assert.match(migration,/auth.uid\(\)/);
});
