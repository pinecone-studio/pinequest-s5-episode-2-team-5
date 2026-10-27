import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../openlab-3d/package.json',import.meta.url));
const {build}=require('esbuild');
const dir=await mkdtemp(join(tmpdir(),'learning-tests-'));
await build({stdin:{contents:"export * from './src/lib/revision-sync.ts';export * from './src/lib/learning-content.ts';export * from './src/data/revision-hub/index.ts';export * from './src/lib/textbook-investigations.ts';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:join(dir,'content.mjs')});
const lib=await import(pathToFileURL(join(dir,'content.mjs')));await rm(dir,{recursive:true,force:true});
test('published pack changes are accepted while malformed lesson blocks are rejected',()=>{
 const pack=structuredClone(lib.getPack('g9-chem'));pack.topics[0].title='Edited in Supabase';assert.equal(lib.applyLessonPack('g9-chem',pack),true);assert.equal(lib.getPack('g9-chem').topics[0].title,'Edited in Supabase');
 pack.topics[0].notes[0].blocks=[{t:'p',x:44}];assert.equal(lib.applyLessonPack('g9-chem',pack),false);
});
test('investigation procedures load from database without changing engine-backed supplies',()=>{
 const d=structuredClone(lib.investigationById('g9-citric-endotherm'));d.method=['Database procedure'];assert.equal(lib.applyInvestigations([{id:d.id,content:d}]),true);assert.deepEqual(lib.investigationById(d.id).method,d.method);
 d.supplies=['unknown'];assert.equal(lib.applyInvestigations([{id:d.id,content:d}]),false);
});
test('cross-device merges preserve best scores, reads and the latest individual rating',()=>{
 const a=lib.snapshot();a.state.notes=['one'];a.state.quizBest.x=90;a.state.cards.a='known';a.clocks['cards.a']=100;
 const b=lib.snapshot();b.state.notes=['two'];b.state.quizBest.x=40;b.state.cards.a='again';b.clocks['cards.a']=200;
 const result=lib.mergeRevision(a,b);assert.deepEqual(result.state.notes,['one','two']);assert.equal(result.state.quizBest.x,90);assert.equal(result.state.cards.a,'again');assert.deepEqual(lib.mergeRevision(result,b),result);
 const stale=lib.mergeRevision(result,a);assert.equal(stale.state.cards.a,'again');
});
test('only changed ratings receive a new timestamp',()=>{
 const before=lib.snapshot();before.state.cards.a='known';before.clocks['cards.a']=100;
 const after=structuredClone(before.state);after.ratings.o='green';const changed=lib.changedRevision(before,after,200);
 assert.equal(changed.clocks['cards.a'],100);assert.equal(changed.clocks['ratings.o'],200);
});
test('import includes both grades and preserves existing dashboard edits',async()=>{
 const sql=await readFile('supabase/learning-content.sql','utf8');assert.match(sql,/g9-citric-endotherm/);assert.match(sql,/g8-chem/);assert.match(sql,/on conflict\(id\) do nothing/);assert.doesNotMatch(sql,/service_role_key|EXPO_PUBLIC_SUPABASE_ANON_KEY/);
});
test('a wrong answer fixed on one device stays fixed after merging a stale device',()=>{
 const before=lib.snapshot();before.state.wrong=['q1','q2'];
 const fixed=lib.changedRevision(before,{...before.state,wrong:['q2']},300);assert.equal(fixed.clocks['wrong.q1'],300);
 const stale=lib.snapshot();stale.state.wrong=['q1','q3'];
 const merged=lib.mergeRevision(stale,fixed);assert.deepEqual([...merged.state.wrong].sort(),['q2','q3']);
 assert.deepEqual([...lib.mergeRevision(fixed,stale).state.wrong].sort(),['q2','q3']);
 const again=lib.changedRevision(merged,{...merged.state,wrong:[...merged.state.wrong,'q1']},400);
 assert.ok(lib.mergeRevision(fixed,again).state.wrong.includes('q1'));
});
test('workbook scores merge as maxima and legacy stored progress is upgraded',()=>{
 const a=lib.snapshot();a.state.labBest.p=2;const b=lib.snapshot();b.state.labBest.p=3;
 assert.equal(lib.mergeRevision(a,b).state.labBest.p,3);assert.equal(lib.mergeRevision(b,a).state.labBest.p,3);
 const legacy={version:1,notes:['n'],cards:{},quizBest:{},wrong:[],questionBest:{},practicals:[],ratings:{}};
 const restored=lib.restoreStored(legacy);assert.deepEqual(restored.state.notes,['n']);assert.deepEqual(restored.state.labBest,{});assert.deepEqual(restored.clocks,{});
 assert.deepEqual(lib.restoreStored(JSON.parse(JSON.stringify(restored))),restored);
});
test('the progress merge migration keeps own-user checks and adds clocked wrong answers',async()=>{
 const sql=await readFile('supabase/migrations/202610270001_revision_progress_merge.sql','utf8');
 assert.match(sql,/uid is distinct from p_user/);assert.match(sql,/for update/);assert.match(sql,/'wrong\.%'/);assert.match(sql,/'labBest'/);assert.match(sql,/revoke all .* from public,anon/);
});
