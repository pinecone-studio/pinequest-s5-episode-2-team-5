import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const json=async(path)=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const pack=await json('../src/data/revision-hub/g9-chem/content.json');
const investigations=await json('../src/data/g9-investigations.json');
const grade8=await json('../src/data/textbook-investigations.json');
test('Grade 9 covers all 29 labelled experiments and all 17 textbook topics',()=>{
 assert.equal(pack.meta.grade,9);assert.equal(pack.topics.length,17);assert.equal(pack.chapters.length,6);
 assert.deepEqual(investigations.filter(x=>x.textbookExperiment).map(x=>Number(x.bookPages)),[7,12,14,16,18,20,21,23,50,55,62,63,69,72,91,95,102,104,105,110,114,116,118,120,123,125,129,162,176]);
 const practicals=pack.topics.flatMap(t=>t.practicals);
 assert.equal(practicals.length,32);
 for(const d of investigations){
  assert.equal(d.grade,9);assert.ok(d.method.length>=3);assert.ok(d.safety);assert.ok(d.id.startsWith('g9-'));
  assert.ok(!grade8.some(x=>x.id===d.id));
  const t=pack.topics.find(t=>t.id===d.topicId);assert.ok(t,d.id);
  for(const id of d.practicalIds){const p=t.practicals.find(p=>p.id===id);assert.ok(p,id);assert.equal(p.labActivityId,d.id);assert.deepEqual(p.steps,d.method);}
 }
 assert.equal(new Set(investigations.map(x=>x.id)).size,32);
 assert.equal(investigations.filter(x=>x.mode==='bench').length,32);
});
test('every Grade 9 topic has original learning content and usable assessment data',()=>{
 for(const t of pack.topics){
  for(const field of ['notes','objectives','flashcards','quiz','questions'])assert.ok(t[field].length,`${t.id}: ${field}`);
  assert.ok(pack.chapters.find(c=>c.id===t.chapterId)?.topicIds.includes(t.id));
  assert.ok(t.notes.every(n=>n.blocks.length>=3));
  for(const q of t.quiz)assert.ok(q.answer>=0&&q.answer<q.options.length&&q.explanation);
  for(const q of t.questions)assert.equal(q.totalMarks,q.parts.reduce((n,p)=>n+p.marks,0));
  for(const term of t.keyTerms)assert.ok(pack.glossary.find(x=>x.term===term));
 }
});
