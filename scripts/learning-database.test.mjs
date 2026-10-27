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
await build({stdin:{contents:"export * from './src/lib/revision-sync.ts';export * from './src/lib/investigation-sync.ts';export * from './src/lib/catalyst-sync.ts';export * from './src/lib/element-sync.ts';export * from './src/lib/learning-content.ts';export * from './src/data/revision-hub/index.ts';export * from './src/lib/textbook-investigations.ts';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:join(dir,'content.mjs')});
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
test('wrong answers stay on this device so a corrected question is not restored by the server',()=>{
 const local=lib.snapshot();local.state.wrong=['q2'];local.state.notes=['a'];
 assert.deepEqual(lib.outgoingRevision(local).state.wrong,[]);assert.deepEqual(lib.outgoingRevision(local).state.notes,['a']);
 const remote=lib.snapshot();remote.state.wrong=['q1','q2'];remote.state.notes=['b'];remote.state.ratings.o='green';remote.clocks['ratings.o']=300;
 const merged=lib.applyRemoteRevision(local,remote);assert.deepEqual(merged.state.wrong,['q2']);assert.deepEqual(merged.state.notes,['a','b']);assert.equal(merged.state.ratings.o,'green');assert.equal(merged.clocks['ratings.o'],300);
});
test('investigation notebooks keep the newest answers and every trial from both devices',()=>{
 const trial=(at)=>({parameters:{},readings:[{label:'T',value:at,unit:'°C'}],observation:'',source:'manual',at});
 const phone=lib.changedAttempt(lib.restoreAttemptSnapshot(null),{prediction:'old guess',observation:'bubbles',conclusion:'',trials:[trial(1)],revealed:true},100);
 const laptop={attempt:{prediction:'new guess',observation:'',conclusion:'gas forms',trials:[trial(2)],revealed:false},clocks:{prediction:200,conclusion:200,revealed:50}};
 const merged=lib.mergeAttempt(phone,laptop);
 assert.equal(merged.attempt.prediction,'new guess');assert.equal(merged.attempt.observation,'bubbles');assert.equal(merged.attempt.conclusion,'gas forms');
 assert.equal(merged.attempt.revealed,true);assert.deepEqual(merged.attempt.trials.map((t)=>t.at),[1,2]);assert.deepEqual(lib.mergeAttempt(merged,laptop),merged);
});
test('a save stamps only changed answers and never drops a stored trial',()=>{
 const trial=(at)=>({parameters:{},readings:[],observation:'',source:'bench',at});
 const before={attempt:{prediction:'p',observation:'o',conclusion:'',trials:[trial(1),trial(2)],revealed:false},clocks:{prediction:10,observation:10}};
 const saved=lib.changedAttempt(before,{...before.attempt,conclusion:'c',trials:[trial(3)]},500);
 assert.deepEqual(saved.clocks,{prediction:10,observation:10,conclusion:500});assert.deepEqual(saved.attempt.trials.map((t)=>t.at),[1,2,3]);
 const many=lib.changedAttempt(before,{...before.attempt,trials:Array.from({length:40},(_,i)=>trial(i+10))},600);assert.equal(many.attempt.trials.length,30);assert.equal(many.attempt.trials[29].at,49);
});
test('catalyst journey: start over on one device clears older answers elsewhere but keeps the best score',()=>{
 const empty=lib.restoreJourneySnapshot(null);
 const done={...empty.state,step:4,prediction:0,source:'lab',observation:'Хөөс хурдан гарлаа',reflection:'Катализатор зам өөрчилнө',revealed:true,answers:{'3.2-mcq3':1,'3.2-mcq7':0,'3.2-mcq5':2},best:3,completed:true};
 const laptop=lib.changedJourney(empty,done,100);
 const phone=lib.changedJourney(laptop,{...lib.restoreJourneySnapshot(null).state,best:3},200);
 assert.equal(phone.clocks.answers,200);assert.equal(phone.clocks.step,200);
 const onLaptop=lib.mergeJourney(laptop,phone);
 assert.equal(onLaptop.state.step,0);assert.deepEqual(onLaptop.state.answers,{});assert.equal(onLaptop.state.completed,false);assert.equal(onLaptop.state.best,3);
 const newer=lib.changedJourney(onLaptop,{...onLaptop.state,prediction:2},300);
 assert.equal(lib.mergeJourney(phone,newer).state.prediction,2,'an edit after the reset wins');
});
test('element memory: un-marking syncs, newest rating per element wins',()=>{
 const memory={version:1,known:[1,2],attempts:{1:{correct:1,total:2}}};
 const clocks=lib.changedKnown({version:1,known:[1,2,3],attempts:{}},memory,{1:10,2:10,3:10},500);
 assert.deepEqual(clocks,{1:10,2:10,3:500});
 const out=lib.outgoingKnown(memory,clocks);assert.deepEqual(out.known,{1:true,2:true,3:false});
 const remote={known:{1:false,2:true,8:true},clocks:{1:600,2:5,8:700}};
 const merged=lib.applyRemoteKnown(memory,clocks,remote);
 assert.deepEqual(merged.memory.known.sort((a,b)=>a-b),[2,8]);assert.equal(merged.clocks[2],10);assert.deepEqual(merged.memory.attempts,memory.attempts);
 assert.deepEqual(lib.restoreKnownSnapshot({known:{0:true,119:true,'5':'yes',6:true},clocks:{6:1,x:2}}),{known:{6:true},clocks:{6:1}});
 const sync=lib.restoreMemorySync(null);assert.match(sync.device,/^[A-Za-z0-9-]{8,64}$/);assert.equal(lib.restoreMemorySync(sync).device,sync.device);
});
test('only changed ratings receive a new timestamp',()=>{
 const before=lib.snapshot();before.state.cards.a='known';before.clocks['cards.a']=100;
 const after=structuredClone(before.state);after.ratings.o='green';const changed=lib.changedRevision(before,after,200);
 assert.equal(changed.clocks['cards.a'],100);assert.equal(changed.clocks['ratings.o'],200);
});
test('import includes both grades and preserves existing dashboard edits',async()=>{
 const sql=await readFile('supabase/learning-content.sql','utf8');assert.match(sql,/g9-citric-endotherm/);assert.match(sql,/g8-chem/);assert.match(sql,/on conflict\(id\) do nothing/);assert.doesNotMatch(sql,/service_role_key|EXPO_PUBLIC_SUPABASE_ANON_KEY/);
});
