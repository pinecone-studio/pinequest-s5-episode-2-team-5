import test from 'node:test';
import assert from 'node:assert/strict';
import { MolecularModel } from '../src/experiments/workbench/molecules.ts';
const particle = (species, x, vx) => ({ species, x, y:0, z:0, vx, vy:0, vz:0, hits:0, active:true, locked:false });
test('elastic head-on collision conserves momentum and energy', () => {
  const m = new MolecularModel('acid', 40, () => .5);
  m.particles = [particle('Na', -.09, .3), particle('Cl', .09, -.2)];
  m.advance(.01, 0, 20);
  assert.equal(m.collisions, 1);
  assert.ok(Math.abs(m.particles.reduce((s,p)=>s+p.vx,0) - .1) < 1e-10);
  assert.ok(Math.abs(m.particles.reduce((s,p)=>s+p.vx*p.vx,0) - .13) < 1e-10);
  assert.ok(m.particles[0].vx < 0 && m.particles[1].vx > 0);
});
test('carbonate requires two proton collisions and available macroscopic reaction', () => {
  const m = new MolecularModel('acid', 40, () => .5);
  m.particles = [particle('CO3',0,0),particle('H',-.18,.3)];
  m.advance(.04, 10, 20);
  assert.equal(m.products,0);
  assert.equal(m.particles[0].hits,1);
  m.particles[0].vx=0; m.particles[0].x=0;
  m.particles.push(particle('H', .18, -.3));
  m.advance(.04,10,20);
  assert.equal(m.products,1);
  assert.equal(m.particles.filter(p=>p.active&&p.species==='CO2').length,1);
  assert.equal(m.particles.filter(p=>p.active&&p.species==='H2O').length,1);
  for(let i=0;i<160;i++)m.advance(.04,0,20);
  assert.ok(m.escaped >= 1);
});
test('no macroscopic reaction means no fabricated products',()=>{
  const m = new MolecularModel('acid',40,()=>.5);
  m.particles=[particle('CO3',0,0),particle('H',-.18,.3)];
  m.advance(.04,0,20);
  assert.equal(m.products,0);assert.equal(m.particles[0].hits,0);
});
test('evaporation assembles alternating locked ions and stays bounded',()=>{
  const m=new MolecularModel('evap',40);
  for(let i=0;i<1000;i++)m.advance(.04,.65,95);
  const ions=m.particles.filter(p=>p.locked);
  assert.ok(ions.length>2);assert.equal(m.lattice,ions.length);
  assert.ok(m.particles.length<=40);
  assert.ok(m.particles.every(p=>[p.x,p.y,p.z,p.vx,p.vy,p.vz].every(Number.isFinite)));
});

import { isWorkbenchPosition } from '../src/experiments/workbench/placement.ts';
test('preparation accepts only actual worktop height and footprint',()=>{
  assert.equal(isWorkbenchPosition({x:8.25,y:.91,z:-14.5}),true);
  for(const at of [{x:8.25,y:0,z:-14.5},{x:8.25,y:1.9,z:-14.5},{x:8.25,y:.91,z:-13.6},{x:7,y:.91,z:-14.5}])assert.equal(isWorkbenchPosition(at),false);
});
const spec=(id,count=1,phase)=>({id,count,name:id,formula:id,color:'#ffffff',phase});
for(const [preset,reactants,products] of [
  ['acid',[spec('CO3'),spec('H',2)],[spec('H2O'),spec('CO2',1,'gas')]],
  ['metal',[spec('Zn'),spec('H',2)],[spec('ZnIon'),spec('H2',1,'gas')]],
  ['precipitate',[spec('Ag'),spec('Cl')],[spec('solid-AgCl',1,'solid')]],
  ['neutral',[spec('H'),spec('OH')],[spec('H2O')]],
  ['peroxide',[spec('H2O2',2)],[spec('H2O',2),spec('O2',1,'gas')]],
])test(`${preset}: contacts follow actual stoichiometry, stop at zero rate, remain bounded`,()=>{
  const recipe={preset,reactants,products,rate:.001,temp:22,equation:'test',sentence:'test',effect:'gas',key:preset};
  const m=new MolecularModel(recipe,40,()=>.5),a=reactants[0],b=reactants[1]??reactants[0];
  m.particles=[particle(a.id,0,0),particle(b.id,-.18,.3)];m.advance(.04,0,22);assert.equal(m.products,0);
  m.particles=[particle(a.id,0,0),particle(b.id,-.18,.3)];m.advance(.04,10,22);
  if(b.count===2&&a.id!==b.id){assert.equal(m.products,0);m.particles[0].x=0;m.particles[0].vx=0;m.particles.push(particle(b.id,.18,-.3));m.advance(.04,10,22);}
  assert.equal(m.products,1);
  for(const product of products)assert.equal(m.particles.filter(p=>p.active&&p.species===product.id).length,product.count);
  for(let i=0;i<500;i++)m.advance(.04,1,30);
  assert.ok(m.particles.length<=40);assert.ok(m.particles.every(p=>[p.x,p.y,p.z,p.vx,p.vy,p.vz].every(Number.isFinite)));
  if(products.some(p=>p.phase==='gas'))assert.ok(m.escaped>0);
  if(preset==='precipitate')assert.ok(m.lattice>0);
});

// Bundle the existing pure engine for Node; no browser, stores or mocked chemistry.
import { build } from 'esbuild';
const pure=await build({stdin:{contents:`export * from './src/chemistry/reaction-view.ts'; export * from './src/chemistry/mixture.ts'; export * from './src/chemistry/mix.ts'; export * from './src/chemistry/kinetics.ts'; export * from './src/chemistry/molecules3d.ts';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const chem=await import(`data:text/javascript;base64,${Buffer.from(pure.outputFiles[0].text).toString('base64')}`);
test('actual HCl/NaOH transfer publishes balanced neutralisation, water/water does not',()=>{
  const a=chem.reagentMixture('hcl',5),b=chem.reagentMixture('naoh',5),mix=chem.equilibrateHeat(a,b,100);
  const [r]=chem.mixObservations(a,b,mix.m,mix.neutralized,mix.formed);
  assert.equal(r.preset,'neutral');assert.equal(r.equation,'H⁺ + OH⁻ → H₂O');assert.ok(r.rate>0);assert.match(r.sentence,/ус/);
  const water=chem.reagentMixture('water',5),inert=chem.equilibrateHeat(water,water,100);
  assert.equal(chem.mixObservations(water,water,inert.m,inert.neutralized,inert.formed).length,0);
});
test('actual silver chloride and copper hydroxide formation publish clumping products',()=>{
  for(const [reagent,other,equation] of [['agno3','nacl','Ag⁺ + Cl⁻ → AgCl↓'],['cuso4','naoh','Cu²⁺ + 2OH⁻ → Cu(OH)₂↓']]){
    const a=chem.reagentMixture(reagent,5),b=chem.reagentMixture(other,5),mix=chem.equilibrateHeat(a,b,100);
    const [r]=chem.mixObservations(a,b,mix.m,mix.neutralized,mix.formed);
    assert.equal(r.preset,'precipitate');assert.equal(r.equation,equation);assert.equal(r.products[0].phase,'solid');assert.ok(r.rate>0);
  }
});
test('actual peroxide/KI, carbonate and zinc gas rates drive matching real-species views',()=>{
  for(const [a,b,preset,gas] of [['h2o2','ki','peroxide','O2'],['na2co3','hcl','acid','CO2'],['s_zn','hcl','metal','H2']]){
    let before=chem.equilibrateHeat(chem.reagentMixture(a,a==='s_zn'?.2:10),chem.reagentMixture(b,10),100).m;
    let found;
    for(let i=0;i<100&&!found;i++){const result=chem.step(before,.1,chem.DEFAULT_ENV);found=chem.stepObservations(before,result,.1).find(r=>r.preset===preset);before=result.m;}
    assert.ok(found,`${a} + ${b} must publish ${preset}`);assert.ok(found.rate>0);assert.ok(found.products.some(s=>s.id===gas&&s.phase==='gas'));assert.ok(found.equation.includes('→'));if(preset==='peroxide'){assert.match(found.equation,/KI/);assert.doesNotMatch(found.sentence,/Саван/);}
  }
});

// Preparation gates guide credit, while observations/measurement counters still work.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const storeTmp=await mkdtemp(join(tmpdir(),'openlab-preparation-test-'));
test.after(()=>rm(storeTmp,{recursive:true,force:true}));
await build({stdin:{contents:`export * from '../src/lib/textbook-investigations.ts'; export {INVESTIGATIONS as inquiryDefinitions} from '../src/lib/textbook-investigations.ts'; export {TEXTBOOK_EXPERIMENTS} from './src/experiments/workbench/textbook.ts'; export {getExperiments,applyRemoteExperiments} from './src/lab/experiments.ts'; export {useInquiry,clearInquiry} from './src/experiments/workbench/inquiry-store.ts'; export * from './src/lab/quantity-guidance.ts'; export * from './src/lab/measurements.ts'; export {transfer} from './src/interaction/actions.ts'; export {vesselObservation} from './src/lab/container-observation.ts'; export {snapToSupport} from './src/interaction/supportPlacement.ts'; export {supportSpots} from './src/interaction/bodies.ts'; export {benchUseTarget} from './src/interaction/benchUseTarget.ts'; export {tablePointer} from './src/interaction/heldApi.ts'; export {useBenchView} from './src/experiments/nacl/view.ts'; export {useSandbox,labUse,labSpace,simulateLab} from './src/experiments/nacl/sandbox.ts'; export {usePortableStore} from './src/interaction/portable.ts'; export {interactItem} from './src/interaction/interactItem.ts'; export {interactables} from './src/interaction/registry.ts'; export { useLabStore } from './src/store/useLabStore.ts'; export * from './src/experiments/workbench/session.ts'; export {useInventoryStore,storedIn} from './src/store/useInventoryStore.ts'; export {useChemStore} from './src/store/useChemStore.ts'; export {useGameStore} from './src/store/useGameStore.ts'; export * from './src/lab/reaction-view.ts'; export {registerHolder,seedHolder} from './src/interaction/holders.ts';`,resolveDir:process.cwd()},bundle:true,outfile:join(storeTmp,'stores.mjs'),format:'esm',platform:'node'});
globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const stores=await import(pathToFileURL(join(storeTmp,'stores.mjs')).href);
test('guide starts after preparation; earlier real observations are still recorded',()=>{
  const pending={found:[],objects:{},ready:false,stepOverride:null};
  stores.useLabStore.setState({active:'titration',progress:{},seen:[],measurements:0});
  stores.useWorkbench.setState({sessions:{titration:pending}});
  assert.equal(stores.useLabStore.getState().record({key:'neutralization',title:'Бодит урвал'}).length,0);
  assert.ok(stores.useLabStore.getState().seen.includes('neutralization'));
  stores.useLabStore.getState().record({key:'measure:thermometer'});
  assert.equal(stores.useLabStore.getState().measurements,1);
  stores.useWorkbench.setState({sessions:{titration:{...pending,ready:true}}});
  assert.equal(stores.useLabStore.getState().record({key:'neutralization'}).length,1);
  assert.ok(stores.useLabStore.getState().progress.titration.includes('neutral'));
});

test('soap no-change observations preserve the actual near-zero peroxide rate',()=>{
  const peroxide=chem.reagentMixture('h2o2',30),soap=chem.reagentMixture('soap',2);
  const mix=chem.equilibrateHeat(peroxide,soap,100), [info]=chem.mixObservations(peroxide,soap,mix.m,mix.neutralized,mix.formed);
  assert.equal(info.info,true);assert.match(info.sentence,/Саван бол катализатор биш/);assert.equal(info.rate,0);
  const step=chem.step(mix.m,.1,chem.DEFAULT_ENV), [slow]=chem.stepObservations(mix.m,step,.1);
  assert.equal(slow.info,true);assert.equal(slow.rate,step.gas.O2);assert.ok(Math.abs(slow.rate - mix.m.aq.H2O2*(1-Math.exp(-.0008*.1))/.2)<1e-12);
  assert.doesNotMatch(chem.incompletePeroxide(peroxide).sentence,/Саван/);
  const absent=chem.equilibrateHeat(soap,chem.reagentMixture('ki',3),100).m;
  assert.equal(chem.incompletePeroxide(absent).sentence,'H₂O₂ байхгүй тул урвал явахгүй.');
});
test('KI addition rekeys the published episode and boosts the actual O2 rate',()=>{
  const before=chem.reagentMixture('h2o2',30),slowStep=chem.step(before,.1,chem.DEFAULT_ENV);
  const [slow]=chem.stepObservations(before,slowStep,.1);
  const afterKI=chem.equilibrateHeat(before,chem.reagentMixture('ki',5),100).m;
  const fastStep=chem.step(afterKI,.1,chem.DEFAULT_ENV),[fast]=chem.stepObservations(afterKI,fastStep,.1);
  assert.notEqual(slow.key,fast.key);assert.equal(fast.catalyst,'iodide');assert.ok(fast.rate>slow.rate*100);
  assert.deepEqual(fast.spectators.map(s=>s.id),['K','I']);
  stores.publishReaction('test-vessel',slow);const episode=stores.useReactionView.getState().vessels['test-vessel'].episode;
  stores.publishReaction('test-vessel',fast);assert.notEqual(stores.useReactionView.getState().vessels['test-vessel'].episode,episode);
});
test('iodide collision cycle makes IO then regenerates I, leaving K untouched',()=>{
  const recipe={preset:'peroxide',catalyst:'iodide',reactants:[spec('H2O2',2)],products:[spec('H2O',2),spec('O2',1,'gas')],spectators:[spec('K'),spec('I')]};
  const m=new MolecularModel(recipe,40,()=>.5);
  m.particles=[particle('I',0,0),particle('H2O2',-.18,.3),particle('K',.7,0)];m.advance(.04,10,22);
  assert.equal(m.intermediates,1);assert.equal(m.turnovers,0);assert.equal(m.particles[0].species,'IO');
  m.particles[0].x=0;m.particles[0].vx=0;m.particles.push(particle('H2O2',-.18,.3));m.advance(.04,10,22);
  assert.equal(m.turnovers,1);assert.equal(m.particles[0].species,'I');assert.equal(m.particles.filter(p=>p.active&&p.species==='O2').length,1);
  assert.equal(m.particles.filter(p=>p.active&&p.species==='H2O').length,2);assert.equal(m.particles.filter(p=>p.active&&p.species==='K').length,1);
});
test('pickup immediately marks found; placement separately marks worktop; restart is fresh',()=>{
  globalThis.requestAnimationFrame=()=>0;
  stores.resetWorkbench();stores.useLabStore.setState({active:'elephant',progress:{elephant:['h2o2']}});
  stores.beginPreparation();const stop=stores.startWorkbenchTracking();
  const inv=stores.useInventoryStore.getState(),id=inv.spawn('graduatedCylinder',[4,.9,-10]);
  assert.equal(stores.currentSession().found.length,0);
  inv.pickUp(id);assert.deepEqual(stores.currentSession().found,['graduatedCylinder']);assert.deepEqual(stores.currentSession().placed,[]);
  assert.match(stores.useGameStore.getState().toast.title,/олдлоо \(1\/4\)/);
  stores.useInventoryStore.getState().place([8.25,.915,-14.5],0);assert.deepEqual(stores.currentSession().placed,['graduatedCylinder']);
  stores.useChemStore.getState().setMixtures({[id]:chem.reagentMixture('h2o2',20)});
  stores.publishReaction(id,chem.incompletePeroxide(chem.reagentMixture('h2o2',20)));
  stores.useChemStore.getState().addPuddle({x:4,y:0,z:-9,ml:5,color:'#ffffff',hazardous:false,sourceIds:[id]});
  stores.useChemStore.getState().addPuddle({x:1,y:0,z:-9,ml:5,color:'#ffffff',hazardous:false,sourceIds:['unrelated']});
  const previous=stores.currentSession();stores.selectBenchExperiment('elephant');assert.equal(stores.currentSession(),previous);
  stores.selectBenchExperiment('elephant',true);
  assert.deepEqual(stores.currentSession().found,[]);assert.deepEqual(stores.currentSession().placed,[]);assert.deepEqual(stores.currentSession().objects,{});assert.equal(stores.currentSession().ready,false);
  assert.deepEqual(stores.useLabStore.getState().progress.elephant,[]);
  assert.ok(!stores.useInventoryStore.getState().worldItems.some(w=>w.id===id));assert.ok(!stores.useChemStore.getState().mixtures[id]);assert.ok(!stores.useReactionView.getState().vessels[id]);assert.ok(!stores.useChemStore.getState().puddles.some(p=>p.sourceIds?.includes(id)));assert.ok(stores.useChemStore.getState().puddles.some(p=>p.sourceIds?.includes('unrelated')));stop();
});
test('restart returns room inventory to its shelf origin and keeps unrelated equipment',()=>{
  stores.resetWorkbench();stores.useInventoryStore.getState().reset();stores.useLabStore.setState({active:'elephant'});stores.beginPreparation();const stop=stores.startWorkbenchTracking();
  const origin=stores.useInventoryStore.getState().worldItems.find(w=>w.kind==='graduatedCylinder');assert.ok(origin);
  const unrelated=stores.useInventoryStore.getState().worldItems.find(w=>w.id!==origin.id);
  stores.useInventoryStore.getState().pickUp(origin.id);stores.useInventoryStore.getState().place([8.25,.915,-14.5],0);
  stores.selectBenchExperiment('elephant',true);
  assert.deepEqual(stores.useInventoryStore.getState().worldItems.find(w=>w.id===origin.id),origin);
  assert.deepEqual(stores.useInventoryStore.getState().worldItems.find(w=>w.id===unrelated.id),unrelated);stop();
});

test('water has a 104.5 degree bend; peroxide is non-planar; oxygen has a double bond',()=>{
  const water=chem.moleculeGeometry('H2O'),o=water.atoms[0].at;
  const v=water.atoms.slice(1).map(a=>a.at.map((n,i)=>n-o[i]));
  const angle=Math.acos(v[0].reduce((sum,n,i)=>sum+n*v[1][i],0)/(Math.hypot(...v[0])*Math.hypot(...v[1])))*180/Math.PI;
  assert.ok(Math.abs(angle-104.5)<1e-9);
  const peroxide=chem.moleculeGeometry('H2O2');assert.deepEqual(peroxide.atoms.map(a=>a.element),['O','O','H','H']);assert.ok(Math.abs(peroxide.atoms[3].at[2])>.5);
  assert.equal(chem.moleculeGeometry('O2').bonds[0].order,2);assert.equal(chem.moleculeGeometry('K').atoms[0].charge,'+');assert.equal(chem.moleculeGeometry('I').atoms[0].charge,'-');
  assert.equal(chem.moleculeGeometry('unknown','X').atoms.length,1);assert.match(chem.moleculeGeometry('unknown','X').note,/геометр биш/);
});
test('zero-rate info is publishable but inert observations cannot fabricate an episode',()=>{
  const info=chem.incompletePeroxide(chem.reagentMixture('h2o2',20));stores.publishReaction('zero-info',info);
  assert.equal(stores.useReactionView.getState().vessels['zero-info'].rate,0);
  stores.publishReaction('not-real',{...info,info:false});assert.ok(!stores.useReactionView.getState().vessels['not-real']);
});
test('restart restores apparatus to the original seeded drawer slot',()=>{
  stores.resetWorkbench();stores.useInventoryStore.getState().reset();stores.useLabStore.setState({active:'titration'});stores.beginPreparation();
  stores.registerHolder('round4-drawer','glassware');const seeded=stores.seedHolder('round4-drawer'),item=seeded.find(x=>x.kind==='erlenmeyer');assert.ok(item);
  const stop=stores.startWorkbenchTracking();stores.useInventoryStore.getState().takeStored('round4-drawer',item.id);
  assert.ok(stores.currentSession().found.includes('erlenmeyer'));stores.useInventoryStore.getState().place([8,.915,-14.5],0);
  stores.selectBenchExperiment('titration',true);assert.deepEqual(stores.storedIn(stores.useInventoryStore.getState().storage,'round4-drawer'),seeded);stop();
});

test('standing and seated primary interaction preserve switches; grab remains a separate action', () => {
  let uses = 0, grabs = 0;
  const id = 'test-shared-switch';
  stores.interactables.set(id, { enabled: true, onInteract: () => uses++, onGrab: () => grabs++ });
  try {
    for (const mode of ['walk', 'bench']) {
      stores.useGameStore.setState({ mode });
      assert.equal(stores.interactItem(id), true);
      assert.equal(stores.interactItem(id, true), true);
    }
    assert.equal(uses, 2);
    assert.equal(grabs, 2);
    stores.interactables.get(id).enabled = false;
    assert.equal(stores.interactItem(id), false);
    assert.equal(stores.interactItem(id, true), false);
    assert.equal(uses, 2);
    assert.equal(grabs, 2);
  } finally { stores.interactables.delete(id); }
});

test('receiver cues distinguish a vessel from placement and preserve selection over UI', () => {
  const before = stores.useInventoryStore.getState();
  stores.useInventoryStore.setState({held:{id:'cue-source',kind:'reagentBottle'},worldItems:[{id:'cue-target',kind:'beaker',position:[0,0,0],rotY:0}]});
  try {
    stores.tablePointer.active = true;
    stores.useSandbox.setState({hovered:'cue-target'});
    assert.equal(stores.benchUseTarget(),'cue-target');
    stores.useSandbox.setState({hovered:null});
    stores.useBenchView.setState({selected:'cue-target'});
    assert.equal(stores.benchUseTarget(),null, 'empty canvas means placement');
    stores.tablePointer.active = false;
    assert.equal(stores.benchUseTarget(),'cue-target', 'moving onto controls retains receiver');
    stores.useSandbox.setState({hovered:'cue-source'});
    assert.equal(stores.benchUseTarget(),null, 'a held bottle cannot receive from itself');
  } finally {
    stores.useInventoryStore.setState({held:before.held,worldItems:before.worldItems});
    stores.useSandbox.setState({hovered:null}); stores.useBenchView.setState({selected:null});
    stores.tablePointer.active = false;
  }
});

import { Ray, Vector3 } from 'three';
test('support snapping tolerates aiming beside a thin ring and preserves the apparatus mounting height', () => {
  const ray = new Ray(new Vector3(0,2,0),new Vector3(0,-1,0));
  const spot = {id:'funnel-holder',aim:new Vector3(.04,1.1,0),point:new Vector3(.04,1.02,0),radius:.055};
  assert.equal(stores.snapToSupport(ray,[spot],3),spot);
  assert.equal(stores.snapToSupport(ray,[spot],.5),null);
  assert.equal(stores.snapToSupport(ray,[{...spot,aim:new Vector3(.1,1.1,0)}],3),null);
  assert.equal(stores.snapToSupport(ray,[{...spot,aim:new Vector3(0,3,0)}],3),null);
});
test('raised placement follows a moved tripod and rejects an incompatible held item', () => {
  const item={id:'test-moved-tripod',kind:'tripod',position:[2,.9,3],rotY:Math.PI/2};
  const spot=stores.supportSpots([item],'evaporatingDish')[0];
  assert.ok(Math.abs(spot.point.y-1.105)<1e-8);
  assert.equal(spot.point.x,2);
  assert.equal(spot.point.z,3);
  assert.deepEqual(stores.supportSpots([item],'tripod'),[]);
  assert.deepEqual(stores.supportSpots([item],'reagentBottle'),[]);
});

test('fitting filter paper frees the hand and records a completed attachment', () => {
  stores.useSandbox.setState({scope:false,paperIn:false,heldId:'nacl-paper',operating:false});
  stores.usePortableStore.setState({held:{id:'nacl-paper',label:'paper',footprint:.025,move:()=>{}}});
  stores.labUse.start('nacl-funnel');
  assert.equal(stores.useSandbox.getState().paperIn,true);
  assert.equal(stores.useSandbox.getState().heldId,null);
  assert.equal(stores.usePortableStore.getState().held,null);
  assert.equal(stores.useSandbox.getState().operating,false);
  assert.equal(stores.labUse.source,null);
});
test('lined funnel finds its collecting flask, retains solids and stops when the flask moves away', () => {
  const oldPosition=stores.labSpace.position;
  let moved=false;
  stores.labSpace.position=(id)=>id==='nacl-funnel'?new Vector3(0,1.1,0):id==='nacl-flask'?new Vector3(moved?2:0,.95,0):new Vector3(10,0,10);
  const distance=(a,b)=>stores.labSpace.position(a).distanceTo(stores.labSpace.position(b));
  stores.interactables.set('nacl-flask',{enabled:true});
  const liquid=chem.reagentMixture('water',6);
  liquid.s=chem.reagentMixture('s_caco3',.4).s;
  stores.useChemStore.getState().setMixtures({'nacl-funnel':liquid,'nacl-flask':chem.emptyMixture()});
  stores.useSandbox.setState({paperIn:true,receiver:null,lit:false});
  try {
    stores.simulateLab(.1,distance); stores.simulateLab(.1,distance); stores.simulateLab(.1,distance);
    assert.equal(stores.useSandbox.getState().receiver,'nacl-flask');
    const collected=stores.useChemStore.getState().mixtures['nacl-flask'];
    assert.ok(collected.water>0);
    assert.ok(Object.values(stores.useChemStore.getState().mixtures['nacl-funnel'].s).some(n=>n>0));
    assert.ok(Object.values(collected.s).every(n=>n<1e-9));
    const before=collected.water;
    moved=true; stores.simulateLab(.1,distance); stores.simulateLab(.1,distance);
    assert.equal(stores.useSandbox.getState().receiver,null);
    assert.equal(stores.useChemStore.getState().mixtures['nacl-flask'].water,before);
  } finally {stores.labSpace.position=oldPosition;stores.interactables.delete('nacl-flask');stores.labUse.end();}
});

import { reactionIntensity, bubblePose, foamOverflowHeight, foamPose, collapsedFoam } from '../src/lab/reaction-animation.ts';
test('dramatic reaction visuals stay bounded and cannot invent intensity or foam', () => {
  for (const rate of [0,-1,NaN,Infinity]) assert.equal(reactionIntensity(rate),0);
  assert.ok(reactionIntensity(.001)>reactionIntensity(.00001));
  assert.equal(reactionIntensity(1),1);
  assert.equal(foamOverflowHeight(20,40,.02,true),0);
  assert.equal(foamOverflowHeight(100,20,.02,false),0);
  assert.equal(foamOverflowHeight(100,20,NaN,true),0);
  assert.ok(foamOverflowHeight(1000,0,.01,true)<=.75);
  for (const reduced of [false,true]) for (let i=0;i<100;i++) {
    const p=bubblePose(i,i*.37,.03,.004,.08,.9,reduced);
    assert.ok(p.y>=.004&&p.y<=.08);
    assert.ok(Math.hypot(p.x,p.z)<.03);
    assert.ok(p.size>0&&p.size<=.03*.16);
  }
});

test('foam descends before pooling, stays attached to the rim and remains spatially bounded', () => {
  const n=24, radius=.014, height=.25;
  assert.equal(foamPose(23,n,0,radius,height,1),null);
  assert.equal(foamPose(23,n,100,radius,height,.05),null,'foam cannot pool before reaching the supporting surface');
  assert.ok(foamPose(23,n,100,radius,height,1),'a pool appears after descent');
  for (const age of [.01,.1,.3,1,10]) for(let i=0;i<n;i++) {
    const p=foamPose(i,n,100,radius,height,age);
    if(!p)continue;
    assert.ok(Object.values(p).every(Number.isFinite));
    assert.ok(p.y>=0&&p.y<=height+.14);
    assert.ok(Math.hypot(p.x,p.z)<.2);
    assert.ok(p.sx>0&&p.sy>0&&p.sz>0);
  }
});

test('foam retains a substantial body while gravity still controls its descent',()=>{
  const top=foamPose(0,24,100,.014,.25,.05);
  assert.ok(top.sx>.014&&top.sz>.014,'foam has a full opaque crown');
  const pool=foamPose(23,24,100,.014,.25,1);
  assert.ok(pool.sy>=.004,'settled foam keeps a thick mound');
  assert.equal(foamPose(23,24,100,.014,.25,.05),null,'bulk does not bypass gravity');
});

test('narrow-neck overflow forms overlapping bulky lobes instead of thin separate lines',()=>{
  const n=24,r=.014,h=.25;
  const a=foamPose(8,n,100,r,h,1),b=foamPose(9,n,100,r,h,1);
  assert.ok(a.sx>r*1.8&&a.sz>r*1.8);
  assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<a.sx+b.sx,'adjacent folds join into a continuous body');
  const pool=foamPose(23,n,100,r,h,1);
  assert.ok(pool.sy>.01,'overflow piles up rather than becoming a flat film');
});

test('foam overflows evenly around the cylinder and pools centrally at both quality levels',()=>{
  for(const count of [24,72]) {
    const sides=count<48?4:8,start=Math.ceil(count*.3),sections=Math.ceil(count*.4/sides)*sides;
    for(let row=0;row<sections/sides;row++) {
      const ring=Array.from({length:sides},(_,i)=>foamPose(start+row*sides+i,count,100,.014,.25,.15));
      assert.ok(Math.abs(ring.reduce((sum,p)=>sum+p.x,0))<1e-10);
      assert.ok(Math.abs(ring.reduce((sum,p)=>sum+p.z,0))<1e-10);
      for(const p of ring){assert.equal(p.sx,ring[0].sx);assert.equal(p.sz,ring[0].sz);assert.equal(p.y,ring[0].y);}
    }
    const pools=Array.from({length:count-start-sections},(_,i)=>foamPose(start+sections+i,count,100,.014,.25,1));
    assert.ok(Math.abs(pools.reduce((sum,p)=>sum+p.x,0))<1e-10);
    assert.ok(Math.abs(pools.reduce((sum,p)=>sum+p.z,0))<1e-10);
  }
});

test('foam begins flush at the rim and gradually widens toward a joined base mound',()=>{
  for(const n of [24,72])for(const ml of [100,300]) {
    const crown=foamPose(0,n,ml,.014,.25,1);
    const sides=n<48?4:8,start=Math.ceil(n*.3),count=Math.ceil(n*.4/sides)*sides;
    let previous=crown.sx;
    for(let row=0;row<count/sides;row++) {
      const p=foamPose(start+row*sides,n,ml,.014,.25,1);
      const outer=Math.hypot(p.x,p.z)+p.sx;
      if(row===0)assert.ok(Math.abs(outer-crown.sx)<1e-10,'no abrupt widening at the rim');
      assert.ok(outer>=previous-1e-10&&outer<=crown.sx*1.5+1e-10);
      previous=outer;
    }
    const pool=foamPose(n-1,n,ml,.014,.25,1);
    assert.ok(Math.hypot(pool.x,pool.z)+pool.sx>=previous,'base mound joins the widened spill');
    const early=foamPose(start+count-sides,n,ml,.014,.25,.05);
    assert.ok(Math.hypot(early.x,early.z)+early.sx<crown.sx*1.01,'width follows actual descent');
  }
});

test('collapsed foam leaves a slowly spreading wet film which lingers before drying',()=>{
  const fresh=collapsedFoam(6,0),settled=collapsedFoam(6,20),late=collapsedFoam(6,70);
  assert.ok(fresh.opacity>0&&settled.opacity>0);
  assert.ok(settled.radius>=fresh.radius);
  assert.ok(late.opacity<settled.opacity&&late.thickness<settled.thickness);
  assert.ok(settled.thickness<.003);
  assert.equal(collapsedFoam(6,90).opacity,0);
  assert.equal(collapsedFoam(0,0).opacity,0);
});

test('foam drains quickly after gas production stops without changing the liquid amount',()=>{
  let m=chem.reagentMixture('water',40);m.foam=100;m.aq.soap=.001;
  for(let i=0;i<40;i++)m=chem.step(m,.1,chem.DEFAULT_ENV).m;
  assert.ok(m.foam<7,'most foam collapses within four seconds');
  assert.ok(Math.abs(m.water-40)<1e-6,'drain animation does not invent or remove liquid');
});

test('repeat prepares clean supplies without repeating collection or disturbing unrelated items',()=>{
  globalThis.requestAnimationFrame=()=>0;
  stores.resetWorkbench();stores.useInventoryStore.getState().reset();
  stores.useLabStore.setState({active:'elephant',progress:{elephant:['h2o2','soap','catalyst']}});
  stores.beginPreparation();
  const unrelated=stores.useInventoryStore.getState().spawn('beaker',[4,.9,-10]);
  stores.repeatBenchExperiment('elephant');
  const first=stores.currentSession();
  assert.equal(first.ready,true);assert.equal(first.teacher,false);
  assert.equal(first.previouslyComplete,false);
  assert.equal(first.placed.length,stores.suppliesFor('elephant').length);
  assert.deepEqual(stores.useLabStore.getState().progress.elephant,[]);
  const oldIds=Object.values(first.objects);
  stores.useChemStore.getState().setMixtures({[first.objects.graduatedCylinder]:chem.reagentMixture('h2o2',20)});
  stores.repeatBenchExperiment('elephant');
  assert.equal(stores.currentSession().ready,true);
  assert.ok(oldIds.every(id=>!stores.useInventoryStore.getState().worldItems.some(w=>w.id===id)));
  assert.ok(!stores.useChemStore.getState().mixtures[first.objects.graduatedCylinder]);
  assert.ok(stores.useInventoryStore.getState().worldItems.some(w=>w.id===unrelated));
});


test('individual container models show current liquid and solid contents instead of stale reaction products',()=>{
  stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();
  const id=stores.useInventoryStore.getState().spawn('beaker',[8.25,.915,-14.5]);
  const m=chem.reagentMixture('water',20);m.aq.H2O2=.001;m.s.NaCl=.002;
  stores.useChemStore.getState().setMixtures({[id]:m});
  stores.publishReaction(id,chem.incompletePeroxide(chem.reagentMixture('h2o2',20)));
  const contents=stores.vesselObservation(id);
  assert.equal(contents.info,true);assert.equal(contents.rate,0);assert.deepEqual(contents.products,[]);
  assert.ok(contents.reactants.some(s=>s.id==='H2O'));
  assert.ok(contents.reactants.some(s=>s.id==='H2O2'));
  assert.ok(contents.reactants.some(s=>s.phase==='solid'));
  stores.useChemStore.getState().setMixtures({[id]:chem.emptyMixture()});
  assert.deepEqual(stores.vesselObservation(id).reactants,[]);
  assert.match(stores.vesselObservation(id).sentence,/хоосон/);
});

test('live contents lens does not invent water in empty or dry containers and keeps solids settled',()=>{
  const empty={preset:'generic',key:'empty',reactants:[],products:[],info:true,rate:0,temp:22,equation:'',sentence:'',effect:'water'};
  assert.equal(new MolecularModel(empty,40).particles.length,0);
  const dry=new MolecularModel({...empty,reactants:[spec('solid-NaCl',1,'solid')]},40);
  assert.ok(dry.particles.length>0);
  assert.ok(dry.particles.every(p=>p.species==='solid-NaCl'&&p.locked));
  dry.advance(.04,0,22);
  assert.equal(dry.products,0);
});

test('automatic lens shows ongoing nearby chemistry but excludes contents, ended and dismissed reactions',()=>{
  const rx={key:'reaction:test',vesselId:'glass',episode:9,until:200,rate:.01,info:false};
  const pick=(r,dismissed=null,eligible=()=>true)=>stores.automaticReaction({glass:r},100,dismissed,eligible);
  assert.equal(pick(rx),rx);
  const mixing={...rx,key:'mixing:H2O',info:true,rate:0};
  assert.equal(pick(mixing),mixing);
  assert.equal(pick(mixing,9),null);
  assert.equal(pick({...rx,info:true}),null);
  assert.equal(pick({...rx,rate:0}),null);
  assert.equal(pick({...rx,until:99}),null);
  assert.equal(pick(rx,9),null);
  assert.equal(pick(rx,null,()=>false),null);
});


test('pouring water publishes physical mixing without fabricated products',()=>{
  stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();
  const inv=stores.useInventoryStore.getState();
  const source=inv.spawn('beaker',[8,.915,-14.5]),target=inv.spawn('beaker',[8.3,.915,-14.5]);
  stores.useChemStore.getState().setMixtures({[source]:chem.reagentMixture('water',30)});
  stores.transfer({id:source,kind:'beaker'},{id:target,kind:'beaker'},10);
  const rx=stores.useReactionView.getState().vessels[target];
  assert.ok(rx.key.startsWith('mixing:'));assert.equal(rx.info,true);assert.equal(rx.rate,0);
  assert.deepEqual(rx.products,[]);assert.ok(rx.reactants.some(s=>s.id==='H2O'));
});


test('measurement notebook counts actual received volume, handles partial pours and clears scoped attempts',()=>{
  stores.clearMeasurements();stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();
  const inv=stores.useInventoryStore.getState();
  const source=inv.spawn('beaker',[8,.915,-14.5]),target=inv.spawn('beaker',[8.3,.915,-14.5]);
  stores.useChemStore.getState().setMixtures({[source]:chem.reagentMixture('water',7)});
  stores.transfer({id:source,kind:'beaker'},{id:target,kind:'beaker'},5);
  stores.transfer({id:source,kind:'beaker'},{id:target,kind:'beaker'},5);
  assert.ok(Math.abs(stores.useMeasurements.getState().transfers[0].ml-7)<1e-6);
  stores.recordTransfer('other','other-target','Ус',2);
  stores.recordTransfer(source,target,'Ус',NaN);
  stores.recordTransfer(source,target,'Ус',-1);
  assert.equal(stores.useMeasurements.getState().transfers.length,2);
  stores.clearMeasurements([target]);
  assert.equal(stores.useMeasurements.getState().transfers.length,1);
  assert.equal(stores.useMeasurements.getState().transfers[0].target,'other-target');
  stores.resetWorkbench();assert.deepEqual(stores.useMeasurements.getState().transfers,[]);
});


test('textbook catalyst mass is converted using the actual KI stock concentration',()=>{
  assert.ok(Math.abs(stores.KI_DOSE_ML-1.2048)<.001);
  assert.ok(Math.abs(stores.kiEquivalentMl(.1,1)*2-stores.KI_DOSE_ML)<1e-9);
  assert.equal(stores.kiEquivalentMl(.1,0),null);
  assert.equal(stores.kiEquivalentMl(NaN,.5),null);
  assert.equal(stores.ELEPHANT_AMOUNTS[0].min,20);
  assert.equal(stores.ELEPHANT_AMOUNTS[0].max,30);
  assert.equal(stores.ELEPHANT_AMOUNTS[1].min,null,'the book does not give a detergent volume');
});
test('quantity feedback supports exploration without enforcing a recipe gate',()=>{
  assert.match(stores.amountFeedback(5,20,30),/нэмж/);
  assert.match(stores.amountFeedback(25,20,30),/хүрлээ/);
  assert.match(stores.amountFeedback(35,20,30),/харьцуулж/);
});


test('all textbook practical summaries have valid executable lab mappings and recipes',async()=>{
  const {readFile}=await import('node:fs/promises');
  const pack=JSON.parse(await readFile(new URL('../../src/data/revision-hub/g8-chem/content.json',import.meta.url),'utf8'));
  const catalog=stores.getExperiments();
  for(const p of pack.topics.flatMap(t=>t.practicals)){
    const id=stores.labForPractical(p.id);assert.ok(id,`missing ${p.id}`);assert.ok(catalog.some(x=>x.id===id));
  }
  assert.equal(new Set(catalog.map(x=>x.id)).size,catalog.length);
  for(const d of stores.inquiryDefinitions){
    const supplies=stores.suppliesFor(d.id);
    assert.equal(supplies.length,d.supplies.length);
    assert.ok(supplies.every(s=>s.kind&&s.name));
    if(d.mode==='model')assert.equal(supplies.length,0);
  }
});
test('all model controls produce finite results within their domain and preserve provenance',()=>{
  for(const d of stores.inquiryDefinitions.filter(x=>x.mode==='model')){
    for(const params of [{},Object.fromEntries(d.controls.map(c=>[c.id,c.max??c.options[c.options.length-1].value]))]){
      const result=stores.runModel(d,params,123);
      assert.equal(result.source,'model');assert.equal(result.at,123);assert.ok(result.readings.length>0);
      assert.ok(result.readings.every(r=>Number.isFinite(r.value)),d.id);
    }
  }
  assert.throws(()=>stores.runModel(stores.inquiryDefinitions.find(x=>x.mode==='bench'),{}));
});
test('rate comparisons respect concentration, temperature, surface area and limiting reagent',()=>{
  const d=stores.investigationById('rate-concentration');
  const base={time:30,concentration:.5,temperature:25,surface:1};
  const value=p=>stores.runModel(d,p).readings[0].value;
  assert.equal(value({...base,time:0}),0);
  assert.ok(value({...base,concentration:1})>value(base));
  assert.ok(value({...base,temperature:45})>value(base));
  assert.ok(value({...base,surface:4})>value(base));
  assert.ok(value({...base,time:180,surface:4})<=60);
});
test('halogen model displaces only a less reactive halide; photosynthesis has a dark control',()=>{
  const d=stores.investigationById('halogens');
  for(let a=0;a<3;a++)for(let b=0;b<3;b++)assert.equal(stores.runModel(d,{halogen:a,halide:b}).readings[0].value,a<b?1:0);
  const plant=stores.investigationById('photosynthesis');
  assert.equal(stores.runModel(plant,{light:0,time:10}).readings[0].value,0);
  assert.ok(stores.runModel(plant,{light:100,time:10}).readings[0].value>0);
});
test('investigation restore rejects malformed readings and cannot reveal an unwritten observation',()=>{
  const a=stores.restoreAttempt({trials:[{source:'model',at:2,parameters:{},readings:[{label:'x',unit:'ml',value:Infinity}]}],revealed:true});
  assert.deepEqual(a.trials,[]);assert.equal(a.revealed,false);
  assert.equal(stores.restoreAttempt({observation:'Хий',revealed:true}).revealed,true,'short genuine observations stay revealed after reload');
  const atom=stores.investigationById('atom-builder');assert.equal(stores.parameterValues(atom,{protons:6.7}).protons,7);
  const trials=[{readings:[{label:'T',unit:'°C',value:-3}]},{readings:[{label:'V',unit:'ml',value:5}]},{readings:[{label:'T',unit:'°C',value:7}]}];
  assert.deepEqual(stores.measurementSeries(trials,'T|°C').points,[{trial:1,value:-3},{trial:3,value:7}]);
});
test('KCl dissolution cools water and zinc sulphate can crystallise from concentrated solution',()=>{
  let cold=chem.emptyMixture();cold.water=25;cold.s.KCl=.01;cold.temp=22;
  for(let i=0;i<100;i++)cold=chem.step(cold,.1,{...chem.DEFAULT_ENV,lossWK:0,stir:1}).m;
  assert.ok(cold.temp<22);assert.ok(cold.aq.K>0&&cold.aq.Cl>0);
  let zinc=chem.emptyMixture();zinc.water=1;zinc.aq.Zn=.01;zinc.aq.SO4=.01;
  zinc=chem.step(zinc,.1,chem.DEFAULT_ENV).m;
  assert.ok(zinc.s.ZnSO4>0);
});
test('copper carbonate dissolves in acid, filtered excess stays behind, and copper sulfate crystallises',()=>{
  stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();
  const inv=stores.useInventoryStore.getState();
  const acid=inv.spawn('beaker',[8,.915,-14.5]),powder=inv.spawn('reagentJar',[8.3,.915,-14.5]),flask=inv.spawn('erlenmeyer',[8.5,.915,-14.5]);
  stores.useChemStore.getState().setMixtures({[acid]:chem.reagentMixture('h2so4',10),[powder]:chem.reagentMixture('s_cuco3',2)});
  stores.transfer({id:powder,kind:'reagentJar'},{id:acid,kind:'beaker'},2);
  let m=stores.useChemStore.getState().mixtures[acid];
  for(let i=0;i<600;i++)m=chem.step(m,.1,chem.DEFAULT_ENV).m;
  stores.useChemStore.getState().setMixtures({[acid]:m});
  assert.ok(m.aq.Cu>0,'acid dissolves carbonate');assert.ok(m.s.CuCO3>0,'excess carbonate stays solid');
  stores.transfer({id:acid,kind:'beaker'},{id:flask,kind:'erlenmeyer'},8,'test-funnel');
  const filtrate=stores.useChemStore.getState().mixtures[flask];assert.ok((filtrate.s.CuCO3??0)<1e-7,JSON.stringify(filtrate));assert.ok(filtrate.aq.Cu>0);
  filtrate.water=.1;const crystals=chem.step(filtrate,.1,chem.DEFAULT_ENV).m;assert.ok(crystals.s.CuSO4_5>0,JSON.stringify(crystals));
});
test('remote catalogs retain local textbook investigations even before database publication',()=>{
  assert.equal(stores.applyRemoteExperiments([]),true);
  assert.ok(stores.inquiryDefinitions.every(x=>stores.getExperiments().some(e=>e.id===x.id)));
  for(const id of ['nacl','metals','elephant'])assert.ok(stores.getExperiments().some(x=>x.id===id),'linked baseline guide remains available');
});
