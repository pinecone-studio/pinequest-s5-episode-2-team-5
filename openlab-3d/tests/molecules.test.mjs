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
await build({stdin:{contents:`export * from './src/equipment/liquid-plane.ts';export {PROFILES} from './src/equipment/profiles.ts';export * from './src/experiments/workbench/guidance/pour-physics.ts';export * from './src/experiments/workbench/guidance/operation.ts';export * from './src/chemistry/appearance.ts';export * from './src/experiments/grade9/chamber-view.ts';export * from './src/experiments/workbench/guidance/conditions.ts';export * from './src/experiments/workbench/guidance/endpoint.ts';export * from './src/experiments/workbench/guidance/results.ts';export * from './src/experiments/workbench/guidance/clock.ts';export * from './src/chemistry/advance.ts';export {DEFAULT_ENV} from './src/chemistry/kinetics.ts';export {CATALOG} from './src/equipment/equipmentCatalog.ts';export {emptyMixture} from './src/chemistry/mixture.ts';export * from './src/experiments/workbench/guidance/definitions.ts';export * from './src/experiments/workbench/guidance/overlays.ts'; export * from './src/experiments/workbench/guidance/prepare.ts'; export * from './src/experiments/workbench/guidance/showcase.ts'; export * from './src/experiments/workbench/guidance/plans.ts'; export * from './src/experiments/workbench/guidance/runtime.ts'; export * from './src/experiments/grade9/process.ts'; export {useGrade9Apparatus} from './src/experiments/grade9/store.ts'; export * from '../src/lib/textbook-investigations.ts'; export {INVESTIGATIONS as inquiryDefinitions} from '../src/lib/textbook-investigations.ts'; export {TEXTBOOK_EXPERIMENTS} from './src/experiments/workbench/textbook.ts'; export {getExperiments,applyRemoteExperiments} from './src/lab/experiments.ts'; export {useInquiry,clearInquiry} from './src/experiments/workbench/inquiry-store.ts'; export * from './src/lab/quantity-guidance.ts'; export * from './src/lab/measurements.ts'; export {transfer,heldHeat,resolveTarget,underFunnel} from './src/interaction/actions.ts'; export {vesselObservation} from './src/lab/container-observation.ts'; export {snapToSupport} from './src/interaction/supportPlacement.ts'; export {supportSpots,supportHeightAt} from './src/interaction/bodies.ts'; export {benchUseTarget} from './src/interaction/benchUseTarget.ts'; export {tablePointer} from './src/interaction/heldApi.ts'; export {useBenchView} from './src/experiments/nacl/view.ts'; export {useSandbox,labUse,labSpace,simulateLab} from './src/experiments/nacl/sandbox.ts'; export {usePortableStore} from './src/interaction/portable.ts'; export {interactItem} from './src/interaction/interactItem.ts'; export {interactables} from './src/interaction/registry.ts'; export { useLabStore } from './src/store/useLabStore.ts'; export * from './src/experiments/workbench/session.ts'; export {useInventoryStore,storedIn} from './src/store/useInventoryStore.ts'; export {useChemStore} from './src/store/useChemStore.ts'; export {useGameStore} from './src/store/useGameStore.ts'; export * from './src/lab/reaction-view.ts'; export {registerHolder,seedHolder} from './src/interaction/holders.ts';`,resolveDir:process.cwd()},bundle:true,outfile:join(storeTmp,'stores.mjs'),format:'esm',platform:'node'});
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
    const overlay=stores.GUIDED_OVERLAYS[d.id];
    // A test tube always comes with a rack to stand it in.
    const listed=overlay?.supplies??d.supplies,rack=listed.includes('testTube')&&!listed.includes('testTubeRack')?1:0;
    assert.equal(supplies.length,listed.length+rack);if(rack)assert.ok(supplies.some(s=>s.kind==='testTubeRack'));
    assert.ok(supplies.every(s=>s.kind&&s.name));
    if(d.mode==='model'&&!overlay)assert.equal(supplies.length,0);
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

test('Grade 9 stocks support endothermic dissolution, KOH neutralisation and copper hydroxide precipitation',()=>{
 let m=chem.equilibrateHeat(chem.reagentMixture('water',30),chem.reagentMixture('s_nh4cl',1),10).m;
 const start=m.temp;
 for(let i=0;i<120;i++)m=chem.step(m,.1,chem.DEFAULT_ENV).m;
 assert.ok(m.temp<start,'NH4Cl dissolves endothermically');assert.ok(m.aq.Cl>0);
 const neutral=chem.equilibrateHeat(chem.reagentMixture('hcl',10),chem.reagentMixture('koh',10),10);
 assert.ok(neutral.neutralized>0);assert.ok(neutral.m.temp>20);
 const precip=chem.equilibrateHeat(chem.reagentMixture('cuso4',5),chem.reagentMixture('naoh',15),10);
 assert.ok(precip.m.s.CuOH2>0);
 const acid=chem.equilibrateHeat(chem.reagentMixture('s_mgoh2',.1),chem.reagentMixture('hcl',10),10).m;
 assert.ok(acid.aq.Mg>0,'magnesium hydroxide reacts with acid');
});

const loadPort=(r,port,reagent,amount)=>stores.loadRig({...r,port},chem.reagentMixture(reagent,amount));
const advance=(r,seconds)=>{for(let i=0;i<seconds*10;i++)r=stores.tickRig(r,.1);return r;};
test('every Grade 9 activity has dedicated physical supplies, with no notebook-only model entry',()=>{
 const all=stores.inquiryDefinitions.filter(d=>d.grade===9);assert.equal(all.length,32);
 for(const d of all){assert.equal(d.mode,'bench');assert.ok(d.supplies.length,d.id);assert.equal(d.controls.length,0);assert.ok(stores.suppliesFor(d.id).every(s=>s.kind&&s.name));}
});
test('gas syringe needs air, expands using Kelvin, and copper uptake is oxygen- and copper-limited',()=>{
 let r=stores.createRig('g9-gas-expansion','gasSyringe');assert.equal(stores.startRig(r).running,false);
 r=stores.startRig({...r,initialAir:10,gas:10,heating:true});r=advance(r,40);assert.ok(r.gas>10);assert.ok(Math.abs(r.gas-10*(r.temperature+273.15)/295.15)<1e-9);
 let oxygen=loadPort(stores.createRig('g9-air-oxygen','gasSyringe'),0,'s_cu',1);
 oxygen=advance(stores.startRig({...oxygen,initialAir:100,heating:true}),100);assert.ok(oxygen.extent>20.9&&oxygen.extent<=21);assert.ok(oxygen.chambers[0].s.CuO>0);
 let tiny=loadPort(stores.createRig('g9-air-oxygen','gasSyringe'),0,'s_cu',.001);tiny=advance(stores.startRig({...tiny,initialAir:100,heating:true}),100);assert.ok(tiny.extent<.2,'tiny copper cannot remove all oxygen');
});
test('gas train has no free reaction, captures measured gas and conserves closed-system mass',()=>{
 let r=stores.createRig('g9-mass-conservation','gasTrain');assert.equal(stores.startRig(r).running,false);
 r=loadPort(r,0,'s_na2co3',1);r=loadPort(r,1,'hcl',1);r=advance(stores.startRig(r),60);
 assert.ok(r.gas>0);assert.ok(r.gas<=24.01,'1 ml 2 M HCl limits carbonate gas to 24 ml');
 assert.equal(stores.rigReadings(r).find(x=>x.label==='Системийн масс өөрчлөлт').value,0);
 assert.ok(stores.rigReadings({...r,closed:false}).find(x=>x.label==='Системийн масс өөрчлөлт').value<0);
 const stop=advance(r,60);assert.ok(stop.gas-r.gas<.1,'limiting acid cannot create unlimited gas');
});
test('NH3/HCl gas diffusion requires separate correct reagents and forms the ring nearer HCl',()=>{
 let r=stores.createRig('g9-gas-diffusion','diffusionTube');r=loadPort(r,0,'nh3',2);r=loadPort(r,1,'nacl',2);assert.equal(stores.startRig(r).running,false);
 r={...r,chambers:r.chambers.map((m,i)=>i===1?chem.emptyMixture():m)};r=loadPort(r,1,'hcl',2);r=advance(stores.startRig(r),30);assert.ok(r.extent>0);
 const distance=stores.rigReadings(r).find(x=>x.label==='Цагираг HCl талаас').value;assert.ok(distance<15&&distance>10);
});
test('chromatography needs paper, ink and unsubmerged baseline; bands separate as solvent rises',()=>{
 let r=stores.createRig('g9-chromatography','chromatographyTank');r=loadPort(r,0,'water',30);r=loadPort(r,1,'inkA',.1);assert.equal(stores.startRig(r).running,false);
 r=loadPort(r,2,'s_paper',.1);r=advance(stores.startRig(r),20);assert.equal(r.bands.length,3);assert.ok(r.bands.every(x=>x>0&&x<r.extent));
 const excess=loadPort(r,0,'water',50);assert.equal(stores.startRig(excess).running,false);
});
test('convection orientation, graphite conductivity and diffusion grinding change observable results',()=>{
 let r=loadPort(stores.createRig('g9-liquid-motion','convectionCell'),0,'hot_water',40);r=loadPort(r,1,'cold_water',40);
 const below=advance(stores.startRig(r),20),above=advance(stores.startRig({...r,hotAbove:true}),20);assert.ok(below.extent>above.extent);
 let graphite=loadPort(stores.createRig('g9-element-types','conductivityTester'),0,'s_graphite',.5);graphite=advance(stores.startRig(graphite),1);assert.equal(graphite.extent,1);
 let sulfur=loadPort(stores.createRig('g9-element-types','conductivityTester'),0,'s_s',.5);sulfur=advance(stores.startRig(sulfur),1);assert.equal(sulfur.extent,0);
 let d=loadPort(stores.createRig('g9-diffusion-surface','diffusionCell'),0,'water',50);d=loadPort(d,1,'s_cuso4',5);const fine=structuredClone(d);fine.chambers[1].fine=true;assert.ok(advance(stores.startRig(fine),30).extent>advance(stores.startRig(d),30).extent);
});
test('citric/bicarbonate reaction retains citrate and obeys stoichiometry without pretending to be acetate',()=>{
 let r=loadPort(stores.createRig('g9-citric-endotherm','gasTrain'),0,'water',50);r=loadPort(r,0,'s_citric',1);r=loadPort(r,1,'s_nahco3',.1);r=advance(stores.startRig(r),30);
 assert.ok(r.gas>20&&r.gas<=.1/84.01*24000+.01);assert.ok(r.chambers[0].aq.Cit>0);assert.equal(r.chambers[0].aq.Ac,undefined);assert.ok(r.temperature<22);
});
test('corrosion comparison responds to water, copper, zinc and intact versus scratched coatings',()=>{
 let r=stores.createRig('g9-corrosion','corrosionRack');for(let i=0;i<5;i++){r=loadPort(r,i,'s_fe',1);if(i<4)r=loadPort(r,i,'water',5);}
 r=loadPort(r,1,'s_cu',.1);r=loadPort(r,2,'s_zn',.1);r=loadPort(r,3,'paint',.5);
 const result=advance(stores.startRig(r),10);assert.ok(result.rust[1]>result.rust[0]);assert.ok(result.rust[2]<result.rust[0]);assert.ok(result.rust[3]<result.rust[0]);assert.equal(result.rust[4],0);
 assert.ok(advance(stores.startRig({...r,scratched:true}),10).rust[3]>result.rust[3]);assert.ok(result.chambers[0].s.FeOH3>0);
});
test('halogen displacement and cobalt hydration occur in actual vessel chemistry',()=>{
 let m=chem.equilibrateHeat(chem.reagentMixture('chlorine',2),chem.reagentMixture('kbr',2),20).m;for(let i=0;i<100;i++)m=chem.step(m,.1,chem.DEFAULT_ENV).m;assert.ok(m.aq.Br2>0);assert.ok(m.aq.Cl>0);
 let no=chem.equilibrateHeat(chem.reagentMixture('bromine',2),chem.reagentMixture('nacl',2),20).m;no=chem.step(no,1,chem.DEFAULT_ENV).m;assert.ok(!no.aq.Cl2);
 let cobalt=chem.equilibrateHeat(chem.reagentMixture('s_cocl2anh',.1),chem.reagentMixture('water',.1),20).m;for(let i=0;i<40;i++)cobalt=chem.step(cobalt,.1,chem.DEFAULT_ENV).m;assert.ok(cobalt.s.CoCl2_6>0||cobalt.aq.Co>0);
});
test('pouring into dedicated apparatus depletes the source, respects the selected chamber, and resets in isolation',()=>{
 stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();stores.useGrade9Apparatus.getState().reset();
 stores.useLabStore.setState({active:'g9-gas-diffusion'});const inv=stores.useInventoryStore.getState();const src=inv.spawn('reagentBottle',[8,.915,-14.5],{reagent:'hcl'}),dst=inv.spawn('diffusionTube',[8.2,.915,-14.5]);
 stores.useGrade9Apparatus.getState().ensure(dst,'g9-gas-diffusion','diffusionTube');stores.useGrade9Apparatus.getState().change(dst,{port:1});
 stores.useChemStore.getState().setMixtures({[src]:chem.reagentMixture('hcl',10)});const moved=stores.transfer({id:src,kind:'reagentBottle',variant:{reagent:'hcl'}},{id:dst,kind:'diffusionTube'},2);
 assert.equal(moved.moved,2);assert.equal(chem.liquidMl(stores.useChemStore.getState().mixtures[src]),8);assert.equal(stores.useGrade9Apparatus.getState().rigs[dst].chambers[1].water,2);assert.equal(stores.useGrade9Apparatus.getState().rigs[dst].chambers[0].water,0);
 stores.useGrade9Apparatus.getState().ensure('unrelated','g9-air-oxygen','gasSyringe');stores.useGrade9Apparatus.getState().clear(dst);assert.ok(stores.useGrade9Apparatus.getState().rigs.unrelated);assert.ok(!stores.useGrade9Apparatus.getState().rigs[dst]);
});

test('Grade 9 supplies ignore a removed item that is awaiting React registry cleanup',()=>{
 stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();stores.resetWorkbench();
 stores.selectBenchExperiment('g9-diffusion-temperature',true);stores.demonstratePreparation();
 const prior=stores.currentSession().objects.diffusionCell;
 const object={visible:true,parent:null};
 stores.interactables.set(prior,{id:prior,object,enabled:true,inspectKind:'diffusionCell',useTarget:{type:'item',id:prior,kind:'diffusionCell'}});
 stores.selectBenchExperiment('g9-diffusion-surface',true);stores.demonstratePreparation();
 const next=stores.currentSession().objects.diffusionCell;
 assert.notEqual(next,prior);assert.ok(stores.useInventoryStore.getState().worldItems.some(x=>x.id===next));assert.ok(stores.currentSession().ready);stores.interactables.delete(prior);
});
test('ice absorbs latent heat, and the calorimeter cannot heat water without fuel',()=>{
 let m=chem.reagentMixture('s_ice',1);m.temp=0;
 m=chem.step(m,.1,{...chem.DEFAULT_ENV,heatW:100,lossWK:0,glassJK:20}).m;
 assert.ok(m.s.ice>0&&m.water>0);assert.ok(Math.abs(m.temp)<1e-6);
 let no=loadPort(stores.createRig('g9-fuel-energy','calorimeter'),0,'water',100);assert.equal(stores.startRig({...no,heating:true}).running,false);
 let fuel=loadPort(no,1,'ethanol',1);fuel=advance(stores.startRig({...fuel,heating:true}),10);assert.ok(fuel.temperature>22);assert.ok(fuel.chambers[1].ethanol<1);assert.ok(fuel.extent>0);
});
test('lemon sample uses triprotic citrate chemistry rather than an acetate substitute',()=>{
 const lemon=chem.reagentMixture('lemon',10);assert.ok(lemon.aq.Cit>0);assert.equal(lemon.aq.Ac,undefined);
 let r=loadPort(stores.createRig('g9-citric-endotherm','gasTrain'),0,'water',50);r=loadPort(r,0,'s_citric',.1);r=loadPort(r,1,'s_nahco3',.5);r=advance(stores.startRig(r),30);
 assert.ok(r.chambers[0].aq.Cit>0);assert.ok((r.chambers[0].aq.Na??0)>0);
});

test('withdrawing liquid from a Grade 9 compartment cannot duplicate its contents',()=>{
 const rig='drainable-rig',beaker='receiving-beaker';stores.useGrade9Apparatus.getState().ensure(rig,'g9-liquid-diffusion','diffusionCell');stores.useGrade9Apparatus.getState().load(rig,chem.reagentMixture('water',10));stores.useChemStore.getState().setMixtures({[rig]:chem.reagentMixture('water',10),[beaker]:chem.emptyMixture()});
 const src={id:rig,kind:'diffusionCell'},dst={id:beaker,kind:'beaker'};
 assert.equal(stores.transfer(src,dst,7).moved,7);assert.equal(stores.transfer(src,dst,7).moved,3);assert.equal(stores.transfer(src,dst,7).moved,0);
 assert.equal(stores.useGrade9Apparatus.getState().rigs[rig].chambers[0].water,0);assert.equal(chem.liquidMl(stores.useChemStore.getState().mixtures[beaker]),10);
});

test('the transfer ledger separates solid grams from liquid millilitres',()=>{
 stores.clearMeasurements();stores.recordTransfer('mixed-source','receiver','Дээж',5,'ml');stores.recordTransfer('mixed-source','receiver','Дээж',.5,'g');
 const records=stores.useMeasurements.getState().transfers;assert.equal(records.length,2);assert.equal(records.find(x=>x.unit==='g').ml,.5);assert.equal(records.find(x=>x.unit==='ml').ml,5);
});

test('lemon apparatus explains missing inputs and mixes later staged additions',()=>{
 let r=stores.createRig('g9-citric-endotherm','gasTrain');
 assert.match(stores.startRig(r).message,/ус нэм/);
 r=loadPort(r,0,'water',10);assert.match(stores.startRig(r).message,/хүчил нэм/);
 r=loadPort(r,0,'s_citric',1);assert.match(stores.startRig(r).message,/сод/);
 r=loadPort(r,1,'s_nahco3',.1);r=stores.startRig(r);
 assert.equal(r.running,true);assert.equal(chem.solidMassG(r.chambers[1]),0);
 r=advance(r,5);const before=r.gas;assert.ok(before>0);assert.ok(r.temperature<22);
 r=loadPort(r,1,'s_nahco3',.1);r=stores.startRig(r);
 assert.equal(chem.solidMassG(r.chambers[1]),0);
 r=advance(r,5);assert.ok(r.gas>before);
});

test('all Grade 10 guides prepare valid scoped supplies and keep model evidence separate',()=>{
 const activities=stores.inquiryDefinitions.filter(d=>d.grade===10);
 assert.equal(activities.length,45);
 for(const d of activities){
  stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();stores.resetWorkbench();
  stores.selectBenchExperiment(d.id,true);stores.demonstratePreparation();
  const session=stores.useWorkbench.getState().sessions[d.id];
  assert.ok(session?.ready,d.id);
  const listed=stores.GUIDED_OVERLAYS[d.id]?.supplies??d.supplies,rack=listed.includes('testTube')&&!listed.includes('testTubeRack')?1:0;
  assert.equal(stores.suppliesFor(d.id).length,listed.length+rack,d.id);
  for(const supply of stores.suppliesFor(d.id))assert.ok(supply.kind&&supply.name,d.id);
  if(d.mode==='model')assert.equal(d.supplies.length,0);
 }
 stores.resetWorkbench();stores.useInventoryStore.getState().reset();
});
test('Grade 10 acid gas bench uses actual limiting reagent and does not create gas from water',()=>{
 let r=loadPort(stores.createRig('g10-carbonate','gasTrain'),0,'s_caco3',.1);
 r=loadPort(r,1,'hcl',1);r=advance(stores.startRig(r),180);
 assert.ok(r.gas>0);assert.ok(r.gas<=12.001,'1 ml of 1 M HCl supplies at most 0.5 mmol CO2');
 let empty=loadPort(stores.createRig('g10-carbonate','gasTrain'),0,'water',20);
 empty=loadPort(empty,1,'water',10);empty=advance(stores.startRig(empty),60);assert.equal(empty.gas,0);
});

test('all Grade 7 guides prepare valid supplies and preserve Grade 8–10 fallback guides',()=>{
 const activities=stores.inquiryDefinitions.filter(d=>d.grade===7);
 assert.equal(activities.length,32);
 for(const d of activities){
  stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();stores.resetWorkbench();
  stores.selectBenchExperiment(d.id,true);stores.demonstratePreparation();
  assert.ok(stores.useWorkbench.getState().sessions[d.id]?.ready,d.id);
  const listed=stores.GUIDED_OVERLAYS[d.id]?.supplies??d.supplies,rack=listed.includes('testTube')&&!listed.includes('testTubeRack')?1:0;
  assert.equal(stores.suppliesFor(d.id).length,listed.length+rack,d.id);
  for(const supply of stores.suppliesFor(d.id))assert.ok(supply.kind&&supply.name,d.id);
  if(d.mode==='model')assert.equal(d.supplies.length,0);
 }
 stores.resetWorkbench();stores.useInventoryStore.getState().reset();
});
test('Grade 7 chloride and sulfate benches produce bounded hydrogen from actual portions',()=>{
 for(const [id,acid] of [['g7-chloride','hcl'],['g7-sulfate','h2so4']]){
  let r=loadPort(stores.createRig(id,'gasTrain'),0,'s_mg',.1);
  r=loadPort(r,1,acid,1);r=advance(stores.startRig(r),180);
  assert.ok(r.gas>0,id);assert.ok(r.gas<=12.001,id);
  const blank=advance(stores.startRig(loadPort(stores.createRig(id,'gasTrain'),0,'water',20)),60);assert.equal(blank.gas,0);
 }
});
test('new Grade 7 bench guides require bench evidence while legacy Grade 8 event IDs stay stable',()=>{
 for(const d of stores.inquiryDefinitions){
  const guide=stores.TEXTBOOK_EXPERIMENTS.find(e=>e.id===d.id);
  const physical=d.mode==='bench'&&d.grade!==8;
  for(const step of guide.steps)assert.equal(step.id.endsWith('-bench'),physical,d.id);
 }
});

test('every Grade 7 and 10 activity now has physical stock and a working device, without outcome sliders',()=>{
 const all=stores.inquiryDefinitions.filter(d=>d.grade===7||d.grade===10);assert.equal(all.length,77);
 for(const d of all){assert.equal(d.mode,'bench',d.id);assert.equal(d.controls.length,0,d.id);assert.ok(d.supplies.length>=2,d.id);assert.ok(stores.suppliesFor(d.id).every(s=>s.kind&&s.name),d.id);}
});
test('new gas cylinders and organic stocks transfer finite portions with correct units and no free products',()=>{
 const gas=chem.reagentMixture('gas_o2',100),portion=chem.takeLiquid(gas,25);
 assert.ok(Math.abs(portion.taken.g.O2*24000-25)<1e-9);assert.ok(Math.abs(portion.rest.g.O2*24000-75)<1e-9);
 const acetone=chem.reagentMixture('acetone',10);assert.ok(Math.abs(chem.liquidMl(acetone)-10)<1e-9);assert.equal(acetone.water,0);
 const part=chem.takeLiquid(acetone,2.5);assert.ok(Math.abs(chem.contentMassG(part.taken)+chem.contentMassG(part.rest)-chem.contentMassG(acetone))<1e-10);
 const soil=chem.reagentMixture('soil_clay',1);assert.ok(Math.abs(chem.solidMassG(soil)-1)<1e-8);
 for(const d of stores.inquiryDefinitions.filter(d=>[7,10].includes(d.grade)&&d.labRig)){
  const r=stores.startRig(stores.createRig(d.id,d.labRig));assert.equal(r.running,false,d.id);
 }
});
test('iron/sulfur furnace consumes actual stock, conserves mass, and magnet extracts excess Fe',()=>{
 let r=loadPort(stores.createRig('g7-iron-sulfur-reaction','magneticReactor'),0,'s_fe',1.12);r=loadPort(r,1,'s_s',.32);
 r=stores.startRig({...r,heating:true,targetTemperature:350});r=advance(r,90);
 const m=r.chambers[0];assert.ok(m.s.FeS>0);assert.ok(m.s.Fe>0);
 assert.ok(Math.abs(chem.solidMassG(m)-1.44)<.0001);
 const left=m.s.Fe;r=advance({...r,operation:'magnet'},1);assert.ok(r.chambers[2].s.Fe>=left);assert.ok(r.chambers[0].s.FeS>0);
});
test('loaded oxygen bounds metal combustion and methane can form complete or incomplete products',()=>{
 let r=loadPort(stores.createRig('g7-magnesium-burning','combustionFurnace'),0,'s_mg',.1);r=loadPort(r,1,'gas_o2',20);
 r=advance(stores.startRig({...r,heating:true,targetTemperature:700}),90);assert.ok(r.chambers[0].s.MgO>0);assert.ok(r.chambers[0].s.MgO<=20/24000*2+1e-9);
 for(const [oxygen,expected] of [[100,'CO2'],[75,'CO']]){
  let r=loadPort(stores.createRig('g10-combustion','combustionFurnace'),0,'gas_ch4',50);r=loadPort(r,1,'gas_o2',oxygen);r=advance(stores.startRig({...r,operation:'ignite'}),20);assert.ok(r.chambers[0].g[expected]>0,expected);
 }
});
test('acetone distillation collects actual liquid and hydrated salt cycles keep finite material',()=>{
 let r=loadPort(stores.createRig('g10-boiling','refluxBath'),0,'acetone',5);r=advance(stores.startRig({...r,heating:true,targetTemperature:70}),90);
 assert.ok(chem.liquidMl(r.chambers[1])>0);assert.ok(Math.abs(chem.liquidMl(r.chambers[0])+chem.liquidMl(r.chambers[1])-5)<1e-8);
 let salt=loadPort(stores.createRig('g10-hydrate','dryingOven'),0,'s_cuso4',1);salt=advance(stores.startRig({...salt,heating:true,targetTemperature:180}),100);assert.ok(salt.chambers[0].s.CuSO4>0);assert.ok(salt.chambers[2].water>0);
});
test('thiosulfate sulfur, hot acid copper and ethene bromination consume the real limiting reagents',()=>{
 let r=loadPort(stores.createRig('g10-thiosulfate','opticalBench'),0,'thiosulfate',10);r=loadPort(r,1,'hcl',5);r=advance(stores.startRig(r),80);assert.ok(r.chambers[0].s.S>0);assert.ok(r.chambers[0].g.SO2>0);assert.equal(r.data.crossVisible,0);
 let copper=loadPort(stores.createRig('g10-sulfur-acid','refluxReactor'),0,'s_cu',.1);copper=loadPort(copper,1,'h2so4_conc',1);copper=advance(stores.startRig({...copper,heating:true,targetTemperature:90}),100);assert.ok(copper.chambers[0].aq.Cu>0);assert.ok(copper.chambers[0].g.SO2>0);
 let ethene=loadPort(stores.createRig('g10-alkene','gasWashTrain'),0,'bromine',5);ethene=loadPort(ethene,1,'gas_ethene',20);ethene=advance(stores.startRig(ethene),30);assert.ok(ethene.chambers[0].aq.dibromoethane>0);assert.ok(ethene.chambers[0].g.C2H4>=0);
});
test('electrolysis uses current and electrode material; galvanic current requires its load circuit',()=>{
 let r=loadPort(stores.createRig('g10-electroplating','electrolysisCell'),0,'niso4',20);r=loadPort(r,1,'s_fe',1);r=loadPort(r,2,'s_nickel',1);
 const off=advance(stores.startRig({...r,current:0}),10);assert.equal(off.data.deposited??0,0);
 const on=advance(stores.startRig({...r,timeScale:60}),20);assert.ok(on.chambers[1].s.Ni>0);assert.ok(on.chambers[2].s.Ni<r.chambers[2].s.Ni);assert.ok(on.data.charge>0);
 let cell=loadPort(stores.createRig('g10-galvanic','galvanicCell'),0,'s_zn',1);cell=loadPort(cell,0,'znso4',10);cell=loadPort(cell,1,'s_cu',1);cell=loadPort(cell,1,'cuso4',10);cell=loadPort(cell,2,'nacl',5);
 cell=advance(stores.startRig(cell),1);assert.ok(cell.data.cellVoltage>0);assert.equal(cell.data.cellCurrent,0);const zn=cell.chambers[0].s.Zn;cell=advance({...cell,connected:true},10);assert.ok(cell.chambers[0].s.Zn<zn);
});
test('ester, fermentation and nylon produce withdrawable material only from loaded reactants',()=>{
 let ester=loadPort(stores.createRig('g10-esterification','refluxReactor'),0,'glacial_acetic',5);ester=loadPort(ester,0,'ethanol',5);ester=loadPort(ester,1,'h2so4_conc',.1);ester=advance(stores.startRig({...ester,heating:true,targetTemperature:75}),100);assert.ok(ester.chambers[0].aq.ethylAcetate>0);
 let ferment=loadPort(stores.createRig('g10-fermentation','fermenter'),0,'glucose',10);ferment=loadPort(ferment,0,'s_yeast',.1);ferment=advance(stores.startRig({...ferment,timeScale:3600}),20);assert.ok(ferment.chambers[0].ethanol>0);assert.ok(ferment.chambers[2].g.CO2>0);
 let nylon=loadPort(stores.createRig('g10-nylon','interfacialBath'),0,'diamine',10);nylon=loadPort(nylon,1,'sebacoyl',10);const initial=nylon.chambers.reduce((s,m)=>s+chem.contentMassG(m),0);nylon=advance(stores.startRig(nylon),40);assert.ok(nylon.chambers[2].s.nylon610>0);assert.ok(nylon.data.hcl>0);const final=nylon.chambers.reduce((s,m)=>s+chem.contentMassG(m),0);assert.ok(Math.abs(initial-final)<.01,`${initial} vs ${final}`);nylon=advance({...nylon,operation:'draw'},1);assert.ok(nylon.chambers[3].s.nylon610>0);
});
test('oil fractions, soil filtration and molecular kits have real material-dependent results',()=>{
 let oil=loadPort(stores.createRig('g10-oil-distillation','oilColumn'),0,'crude_oil',10);oil=advance(stores.startRig({...oil,heating:true,targetTemperature:320}),200);assert.ok(oil.chambers.slice(1).some(m=>chem.liquidMl(m)>0));assert.ok(Math.abs(oil.chambers.reduce((s,m)=>s+chem.liquidMl(m),0)-10)<1e-7);
 let soil=loadPort(stores.createRig('g7-soil-retention','soilBench'),0,'soil_clay',1);soil=loadPort(soil,0,'oil',20);const mass=soil.chambers.reduce((s,m)=>s+chem.contentMassG(m),0);soil=advance(stores.startRig({...soil,operation:'filter'}),100);assert.ok(chem.liquidMl(soil.chambers[2])>0);assert.ok(chem.solidMassG(soil.chambers[0])>.99);assert.ok(Math.abs(soil.chambers.reduce((s,m)=>s+chem.contentMassG(m),0)-mass)<1e-8);
 let kit=loadPort(stores.createRig('g10-isomers','molecularKit'),0,'model_carbon',6);kit=loadPort(kit,1,'model_hydrogen',14);kit=advance(stores.startRig({...kit,bonds:[[0,1],[1,2],[2,3],[3,4],[4,5]]}),1);assert.equal(kit.data.kitComplete,1);assert.equal(kit.data.isomer,0);
});
test('stale published Grade 7/10 model guides cannot hide stock or restore notebook-only completion',()=>{
 for(const id of ['g7-iron-sulfur-reaction','g10-electrolysis']){
  const local=stores.TEXTBOOK_EXPERIMENTS.find(e=>e.id===id),old={...local,title:'Published title',materials:['Виртуал загвар'],steps:local.steps.map((s,i)=>({...s,id:['predict','measure','explain'][i],completion:{events:[`inquiry:${id}:${['predict','measure','explain'][i]}`]}}))};
  assert.equal(stores.applyRemoteExperiments([{id,schema_version:1,content:old}]),true);
  const current=stores.getExperiments().find(e=>e.id===id);assert.equal(current.title,'Published title');assert.deepEqual(current.materials,local.materials);assert.ok(current.steps.every(s=>s.id.endsWith('-bench')));
 }
});

test('closed gas equilibria conserve loaded atoms and respond to piston compression',()=>{
 let r=loadPort(stores.createRig('g10-no2-equilibrium','pressureCell'),0,'gas_n2o4',100);
 const atoms=m=>2*(m.g?.N2O4??0)+(m.g?.NO2??0);
 const initial=atoms(r.chambers[0]);r=advance(stores.startRig({...r,volumeMl:1000}),150);
 assert.ok(r.chambers[0].g.NO2>0);assert.ok(Math.abs(atoms(r.chambers[0])-initial)<1e-10);
 const before=r.chambers[0].g.NO2;r=advance({...r,volumeMl:100},150);
 assert.ok(r.chambers[0].g.NO2<before);assert.ok(Math.abs(atoms(r.chambers[0])-initial)<1e-10);
 let haber=loadPort(stores.createRig('g10-haber','pressureCell'),0,'gas_n2',50);haber=loadPort(haber,1,'gas_h2',150);haber=loadPort(haber,0,'s_fe',.1);
 haber=advance(stores.startRig(haber),150);assert.ok(haber.chambers[0].g.NH3>0);
 const m=haber.chambers[0];assert.ok(Math.abs(2*(m.g.N2??0)+(m.g.NH3??0)-100/24000)<1e-10);assert.ok(Math.abs(2*(m.g.H2??0)+3*(m.g.NH3??0)-300/24000)<1e-10);
});
test('phase baths, viscosity and sealed corrosion depend on actual loaded material',()=>{
 let wax=loadPort(stores.createRig('g7-wax-water','phaseBath'),0,'s_wax',1);wax=advance(stores.startRig({...wax,heating:true,targetTemperature:90}),100);assert.ok(wax.chambers[0].aq.waxLiquid>0);
 const timeFor=reagent=>{let r=loadPort(stores.createRig('g10-viscosity','fallingBallViscometer'),0,reagent,10);r=loadPort(r,0,'s_glass_beads',.01);return advance(stores.startRig(r),20).data.fallTime;};
 assert.ok(timeFor('oil')>timeFor('water'));
 let dry=loadPort(stores.createRig('g7-rust-conditions','exposureRack'),0,'s_fe',1);dry=loadPort(dry,0,'deoxygenated_water',5);dry=advance(stores.startRig({...dry,covers:dry.covers.map(()=>true),timeScale:86400}),10);assert.equal(dry.rust[0],0);
});


test('every experiment-specific demo uses its own supplied stock and valid finite transfers across grades 7–10',()=>{
 const defs=Object.keys(stores.GUIDED_PLANS).map(id=>stores.guideDefinition(id));assert.ok(defs.every(Boolean));
 for(const g of [7,8,9,10])assert.ok(defs.some(d=>d.grade===g));
 assert.ok(stores.inquiryDefinitions.filter(d=>d.grade===9).every(d=>stores.guidedPlan(d.id)));
 for(const d of defs){
  stores.resetWorkbench();stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();
  stores.selectBenchExperiment(d.id,true);stores.demonstratePreparation();stores.prepareShowcaseEquipment(d);const session=stores.currentSession();assert.ok(session.ready,d.id);
  for(const [i,step] of stores.GUIDED_PLANS[d.id].entries()){
   assert.ok(stores.focusGuideStep(d,step),`${d.id} step ${i}`);
   if(step.type==='dose'){assert.ok(d.supplies.includes(`reagent:${step.reagent}`),d.id);assert.ok(step.amount>0);const rig=stores.useGrade9Apparatus.getState().rigs[session.objects[stores.guideTargetKind(d,step)]];if(rig)assert.ok(step.port<rig.chambers.length,d.id);}
   const result=stores.executeGuideStep(d,step);assert.ok(result.ok,`${d.id} step ${i}: ${result.message}`);
  }
 }
 stores.clearGuideCue();stores.resetWorkbench();
});
test('guide refuses missing or depleted stock and preparation keeps saved notebook evidence',()=>{
 const d=stores.inquiryDefinitions.find(d=>d.id==='g10-nylon'),step=stores.guidedPlan(d.id)[0];
 stores.useLabStore.setState({active:d.id});stores.resetWorkbench();
 assert.equal(stores.executeGuideStep(d,step).ok,false);
 stores.beginPreparation();stores.demonstratePreparation();const source=stores.currentSession().objects['reagent-diamine'];
 stores.useChemStore.getState().setMixtures({[source]:chem.emptyMixture()});assert.equal(stores.executeGuideStep(d,step).ok,false);
 stores.useInquiry.getState().put(d.id,{...stores.newAttempt(),prediction:'Saved prediction survives demonstration'});
 stores.clearExperimentSession(d.id);stores.beginPreparation();stores.demonstratePreparation();
 assert.equal(stores.useInquiry.getState().attempts[d.id].prediction,'Saved prediction survives demonstration');
 stores.clearGuideCue();stores.resetWorkbench();
});


import {Object3D} from 'three';
test('physical showcase lifts real stock before pouring, pauses quantities and restores its pose',()=>{
 stores.resetWorkbench();stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();
 const def=stores.inquiryDefinitions.find(d=>d.id==='g10-nylon');stores.selectBenchExperiment(def.id,true);stores.demonstratePreparation();stores.useGameStore.setState({mode:'bench'});
 const source=stores.currentSession().objects['reagent-diamine'],target=stores.currentSession().objects.interfacialBath,object=new Object3D();object.position.set(8,.915,-14.5);const original=object.position.clone();
 stores.interactables.set(source,{id:source,object,enabled:true});const step=stores.guidedPlan(def.id)[0];stores.beginShowcase(def,step,'motion-test');
 for(let i=0;i<20;i++)stores.tickShowcase(.1);
 assert.ok(object.position.distanceTo(original)>.1);assert.equal(stores.useShowcase.getState().source,source);assert.ok(stores.useShowcase.getState().cap);assert.equal(stores.useShowcase.getState().delivered,0);assert.equal(stores.useGrade9Apparatus.getState().rigs[target].chambers[0].water,0);
 for(let i=0;i<20;i++)stores.tickShowcase(.1);
 const partial=stores.useShowcase.getState().delivered;assert.ok(partial>0&&partial<5);const stopped=object.position.clone();stores.pauseShowcase();for(let i=0;i<100;i++)stores.tickShowcase(.1);
 assert.equal(stores.useShowcase.getState().delivered,partial);assert.ok(object.position.equals(stopped));
 stores.beginShowcase(def,step,'motion-test');for(let i=0;i<40;i++)stores.tickShowcase(.1);
 assert.equal(stores.useShowcase.getState().status,'done');assert.ok(Math.abs(stores.useShowcase.getState().delivered-5)<1e-9);assert.ok(object.position.equals(original));assert.ok(Math.abs(stores.useGrade9Apparatus.getState().rigs[target].chambers[0].water-5)<1e-9);
 object.position.x+=.2;const takenOver=object.position.clone();stores.cancelShowcase();assert.ok(object.position.equals(takenOver));stores.interactables.delete(source);stores.resetWorkbench();
});
test('physical showcase cancellation returns a moving container and cannot deliver after leaving the bench',()=>{
 stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();const def=stores.inquiryDefinitions.find(d=>d.id==='g10-nylon');stores.selectBenchExperiment(def.id,true);stores.demonstratePreparation();stores.useGameStore.setState({mode:'bench'});
 const source=stores.currentSession().objects['reagent-diamine'],object=new Object3D();object.position.set(8,.915,-14.5);const original=object.position.clone();stores.interactables.set(source,{id:source,object,enabled:true});stores.beginShowcase(def,stores.guidedPlan(def.id)[0],'cancel-motion');for(let i=0;i<15;i++)stores.tickShowcase(.1);
 stores.useGameStore.setState({mode:'walk'});stores.tickShowcase(.1);assert.equal(stores.useShowcase.getState().status,'idle');assert.ok(object.position.equals(original));stores.interactables.delete(source);stores.cancelShowcase();stores.resetWorkbench();
});
test('full physical showcase includes reaction observation and collection rather than stopping after setup',()=>{
 const nylon=stores.physicalShowcasePlan('g10-nylon');assert.ok(nylon.some(s=>s.type==='observe'&&(s.until?.timeout??stores.showcaseDuration(s))>=20));assert.ok(nylon.some(s=>s.type==='configure'&&s.change.operation==='draw'));assert.equal(nylon.at(-1).type,'finish');
 const combustion=stores.physicalShowcasePlan('g10-combustion');assert.ok(combustion.some(s=>s.type==='configure'&&s.change.operation==='ignite'));
 for(const def of stores.inquiryDefinitions.filter(d=>[7,10].includes(d.grade)&&d.labRig))for(const step of stores.physicalShowcasePlan(def.id)){if(step.type==='dose')assert.ok((stores.GUIDED_OVERLAYS[def.id]?.supplies??def.supplies).includes(`reagent:${step.reagent}`),def.id);assert.ok(stores.showcaseDuration(step)>0);}
});


test('Grade 8 demo equipment is scoped to its own experiment and does not rewrite model activities',()=>{
 stores.resetWorkbench();stores.useInventoryStore.getState().reset();const original=stores.inquiryDefinitions.find(d=>d.id==='reaction-timing');assert.equal(original.mode,'model');
 stores.selectBenchExperiment(original.id,true);stores.demonstratePreparation();const def=stores.guideDefinition(original.id);stores.prepareShowcaseEquipment(def);const ids=Object.values(stores.currentSession().objects);assert.ok(ids.length>=3);assert.equal(stores.useLabStore.getState().active,original.id);assert.equal(original.mode,'model');
 stores.clearExperimentSession(original.id);assert.ok(!stores.useInventoryStore.getState().worldItems.some(w=>ids.includes(w.id)));
});


test('Grade 8 ordinary-vessel demo transfers actual portions and Grade 9 precipitation makes real solid',()=>{
 stores.resetWorkbench();stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();
 const def=stores.guideDefinition('elephant');stores.selectBenchExperiment(def.id,true);stores.demonstratePreparation();stores.prepareShowcaseEquipment(def);stores.useGameStore.setState({mode:'bench'});
 const source=stores.currentSession().objects['reagent-h2o2'],target=stores.currentSession().objects.graduatedCylinder,object=new Object3D();object.position.set(8,.915,-14.5);stores.interactables.set(source,{id:source,object,enabled:true});stores.beginShowcase(def,stores.guidedPlan(def.id)[0],'grade8-ordinary');for(let i=0;i<75;i++)stores.tickShowcase(.1);
 assert.equal(stores.useShowcase.getState().status,'done');assert.ok(Math.abs(chem.liquidMl(stores.useChemStore.getState().mixtures[target])-25)<1e-8);assert.ok(stores.useChemStore.getState().mixtures[target].aq.H2O2>0);assert.equal(stores.useLabStore.getState().active,'elephant');stores.cancelShowcase();stores.interactables.delete(source);
 const ninth=stores.guideDefinition('g9-precipitation');stores.selectBenchExperiment(ninth.id,true);stores.demonstratePreparation();stores.prepareShowcaseEquipment(ninth);for(const step of stores.guidedPlan(ninth.id))assert.ok(stores.executeGuideStep(ninth,step).ok);
 const sample=stores.currentSession().objects.watchGlass;assert.ok(stores.useChemStore.getState().mixtures[sample].s.CuOH2>0);assert.equal(stores.useLabStore.getState().active,'g9-precipitation');stores.resetWorkbench();
});


function advanceProtocolWorld(dt,speed=1){
 const session=stores.currentSession();const entries=Object.entries(session.objects).filter(([key,id])=>!key.startsWith('reagent-')&&!id.startsWith('nacl-'));
 stores.setProtocolClock(entries.map(([,id])=>id),speed);
 for(const [kind,id] of entries){const rig=stores.useGrade9Apparatus.getState().rigs[id];if(rig){stores.useGrade9Apparatus.getState().tick(id,dt);continue;}
  const base=stores.CATALOG[kind.split('#')[0]];// beaker#2 is a beaker
  if(!base?.capacityMl)continue;const m=stores.useChemStore.getState().mixtures[id];if(!m)continue;
  const env={...stores.DEFAULT_ENV,glassJK:base.heatJK??100,lossWK:1.2+5*((base.capacityMl??50)/250)**(2/3),heatW:stores.heldHeat?.id===id?1300:0,stir:1};
  stores.useChemStore.getState().setMixtures({[id]:stores.advanceChemistry(m,dt,env,speed).m});
 }
 stores.clearProtocolClock();
}
test('every complete demonstration reaches its measured final result without skipped stages',()=>{
 const failures=[];
 for(const id of Object.keys(stores.GUIDED_PLANS)){
  stores.resetWorkbench();stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();stores.clearProtocolClock();stores.beginProtocolResults(id);
  const def=stores.guideDefinition(id);stores.selectBenchExperiment(id,true);stores.demonstratePreparation();stores.prepareShowcaseEquipment(def);
  const plan=stores.physicalShowcasePlan(id);assert.equal(plan.at(-1).type,'finish',id);
  for(const [index,stage] of plan.entries()){
   stores.focusGuideStep(def,stage);
   if(stage.type==='observe'&&stage.until){
    let elapsed=0;while(elapsed<(stage.until.timeout??120)){
     advanceProtocolWorld(.2,stage.until.speed??1);elapsed+=.2;
     if(elapsed>=(stage.until.minimum??1)&&stores.endpointResult(def,stage,stage.until).ok)break;
    }
    const result=stores.endpointResult(def,stage,stage.until);if(result.ok)stores.settleEndpoint(def,stage,stage.until);if(!result.ok){failures.push(`${id} stage ${index} ${stage.label}: ${JSON.stringify(result.measurements)}`);break;}
   }else{const result=stores.executeGuideStep(def,stage);if(!result.ok){failures.push(`${id} stage ${index}: ${result.message}`);break;}for(let t=0;t<stores.showcaseDuration(stage);t+=.2)advanceProtocolWorld(.2);}
  }
  if(!stores.useProtocolResults.getState().complete&&!failures.some(f=>f.startsWith(id+' ')))failures.push(id+' never finished');
 }
 assert.deepEqual(failures,[]);stores.resetWorkbench();stores.clearProtocolClock();
});

test('an unperformed experiment cannot report completion or reuse another experiment result',()=>{
 stores.resetWorkbench();stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();
 const def=stores.guideDefinition('nacl');stores.selectBenchExperiment('nacl',true);stores.demonstratePreparation();stores.prepareShowcaseEquipment(def);stores.beginProtocolResults('nacl');
 const final=stores.physicalShowcasePlan('nacl').at(-1);
 assert.equal(stores.executeGuideStep(def,final).ok,false);
 assert.equal(stores.useProtocolResults.getState().complete,false);
 stores.beginProtocolResults('g10-nylon');stores.useProtocolResults.setState({records:[{label:'foreign',readings:[{label:'x',value:1,unit:''}]}]});
 assert.equal(stores.executeGuideStep(def,{type:'finish',label:'wrong experiment',until:{label:'water',checks:[{metric:'water',min:0}]}}).ok,false);
 stores.beginProtocolResults('nacl');
 const impossible={type:'observe',label:'impossible',until:{label:'impossible',checks:[{metric:'solid',species:'NaCl',min:100,target:'watchGlass'}],timeout:.3}};
 stores.useGameStore.setState({mode:'bench'});stores.focusGuideStep(def,impossible);stores.beginShowcase(def,impossible,'impossible');
 for(let i=0;i<10;i++)stores.tickShowcase(.1);
 assert.equal(stores.useShowcase.getState().status,'failed');assert.equal(stores.useProtocolResults.getState().complete,false);
 stores.cancelShowcase();stores.resetWorkbench();
});

test('animated decanting delivers the final sub-0.005 ml portion without changing phase',()=>{
 stores.resetWorkbench();stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();
 const def=stores.guideDefinition('nacl');stores.selectBenchExperiment('nacl',true);stores.demonstratePreparation();stores.prepareShowcaseEquipment(def);
 const source=stores.currentSession().objects.erlenmeyer,target=stores.currentSession().objects.evaporatingDish;
 stores.useChemStore.getState().setMixtures({[source]:chem.reagentMixture('water',3)});
 let delivered=0;while(delivered<3-1e-8){const amount=Math.min(.007,3-delivered);assert.equal(stores.executeGuideStep(def,{type:'move',from:'erlenmeyer',to:'evaporatingDish',amount,label:'decant'}).ok,true);delivered+=amount;}
 assert.ok(chem.liquidMl(stores.useChemStore.getState().mixtures[source])<1e-8);assert.ok(Math.abs(chem.liquidMl(stores.useChemStore.getState().mixtures[target])-3)<1e-6);stores.resetWorkbench();
});

test('all complete protocols also finish with incremental animated transfers',()=>{
 const failures=[];
 for(const id of Object.keys(stores.GUIDED_PLANS)){
  stores.cancelShowcase();stores.resetWorkbench();stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();stores.beginProtocolResults(id);
  const def=stores.guideDefinition(id);stores.selectBenchExperiment(id,true);stores.demonstratePreparation();stores.prepareShowcaseEquipment(def);stores.useGameStore.setState({mode:'bench'});
  const ids=Object.values(stores.currentSession().objects);for(const objectId of ids){const object=new Object3D();object.position.set(8,.915,-14.5);stores.interactables.set(objectId,{id:objectId,object,enabled:true});}
  for(const [index,stage] of stores.physicalShowcasePlan(id).entries()){
   stores.focusGuideStep(def,stage);stores.beginShowcase(def,stage,`${id}-${index}`);
   for(let elapsed=0;elapsed<(stage.until?.timeout??120)+10&&stores.useShowcase.getState().status==='playing';elapsed+=.1){stores.tickShowcase(.1);advanceProtocolWorld(.1,stage.type==='observe'?(stage.until?.speed??1):1);}
   if(stores.useShowcase.getState().status!=='done'){failures.push(`${id} stage ${index}: ${stores.useShowcase.getState().message}`);break;}
  }
  for(const objectId of ids)stores.interactables.delete(objectId);
 }
 stores.cancelShowcase();stores.resetWorkbench();assert.deepEqual(failures,[]);
});


test('observed liquid layers preserve loaded phase volumes and exclude miscible ethanol',()=>{
 const water=chem.reagentMixture('water',10),ethanol=chem.reagentMixture('ethanol',5),oil=chem.reagentMixture('oil',5);
 const miscible=stores.appearanceOf(chem.equilibrateHeat(water,ethanol,0).m);assert.equal(miscible.layered,false);
 const m=chem.equilibrateHeat(water,oil,0).m,a=stores.appearanceOf(m);
 assert.equal(a.layered,true);assert.ok(Math.abs(a.organicMl-5)<1e-8);assert.ok(Math.abs(a.aqueousMl-10)<1e-8);assert.ok(Math.abs(a.organicMl+a.aqueousMl-chem.liquidMl(m))<1e-8);
 assert.equal(stores.appearanceOf(oil).layered,false);assert.equal(stores.appearanceOf(water).precipitateGrams,0);
 const trace=chem.reagentMixture('water',10);trace.s.CuOH2=1e-10;trace.cloud=1;assert.equal(stores.appearanceOf(trace).visiblePrecipitate,false);
});
test('fresh copper hydroxide stays suspended before settling without invented gas',()=>{
 let m=chem.equilibrateHeat(chem.reagentMixture('cuso4',5),chem.reagentMixture('naoh',5),20).m;
 const before=stores.appearanceOf(m);assert.ok(before.precipitateGrams>0);assert.ok(before.suspension>.9);
 for(let i=0;i<50;i++){const r=chem.step(m,.2,chem.DEFAULT_ENV);assert.equal(r.gas.CO2+r.gas.O2+r.gas.H2,0);m=r.m;}
 const later=stores.appearanceOf(m);assert.ok(later.suspension>.5);assert.ok(later.suspension<before.suspension);assert.ok(Math.abs(later.precipitateGrams-before.precipitateGrams)<1e-8);
});
test('nylon visual combines two monomer feeds in one beaker without mutating the engine',()=>{
 const r=loadPort(loadPort(stores.createRig('g10-nylon','interfacialBath'),0,'diamine',5),1,'sebacoyl',5);
 const before=structuredClone(r),view=stores.chamberView(r,0);assert.deepEqual(r,before);assert.ok(chem.liquidMl(view.mixture)>9.9);assert.equal(stores.appearanceOf(view.mixture).layered,true);assert.equal(view.capacityMl,25);
});


test('pouring falls with gravity and viscosity/stock colours use the actual substance',()=>{
 assert.deepEqual(stores.fallingPoint([0,1,0],[1,0,0],.5),[.5,.75,0]);assert.ok(Math.abs(stores.fallTime([0,.04905,0],[0,0,0])-.1)<1e-8);
 assert.ok(stores.transferAppearance(chem.reagentMixture('oil',1)).viscosity>stores.transferAppearance(chem.reagentMixture('water',1)).viscosity);
 assert.equal(stores.transferAppearance(chem.reagentMixture('phph',1)).color,'#e2f0fa');assert.equal(stores.transferAppearance(chem.reagentMixture('gas_o2',1)).phase,'gas');
});
test('a level gravity plane preserves volume through vessel tilts and adapts the pour angle to fill',()=>{
 const p=stores.PROFILES.reagentBottle;
 for(const angle of [0,.3,.8,1.3])for(const ml of [10,75,200]){const n=[-Math.sin(angle),Math.cos(angle),0],h=stores.liquidPlane(p,n,ml);assert.ok(Math.abs(stores.volumeBelow(p,n,h)-ml)<.001,`${angle} ${ml}`);}
 assert.ok(stores.pourTilt(p,25)>stores.pourTilt(p,200));
});
test('measured tools reserve actual stock and cancellation returns only the unused sample',()=>{
 stores.cancelShowcase();stores.resetWorkbench();stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();
 const d=stores.guideDefinition('g10-titration');stores.selectBenchExperiment(d.id,true);stores.demonstratePreparation();stores.prepareShowcaseEquipment(d);stores.useGameStore.setState({mode:'bench'});
 const step=stores.GUIDED_PLANS[d.id].find(s=>s.type==='dose'&&s.reagent==='phph'),source=stores.currentSession().objects['reagent-phph'],target=stores.currentSession().objects.erlenmeyer,object=new Object3D();object.position.set(8,.915,-14.5);stores.interactables.set(source,{id:source,object,enabled:true});stores.useChemStore.getState().setMixtures({[source]:chem.reagentMixture('phph',5)});
 stores.focusGuideStep(d,step);stores.beginShowcase(d,step,'reserve-test');for(let i=0;i<10;i++)stores.tickShowcase(.1);
 assert.ok(Math.abs(chem.liquidMl(stores.useChemStore.getState().mixtures[source])-4.9)<1e-8);assert.equal(chem.liquidMl(stores.useChemStore.getState().mixtures[target]??chem.emptyMixture()),0);
 stores.cancelShowcase();assert.ok(Math.abs(chem.liquidMl(stores.useChemStore.getState().mixtures[source])-5)<1e-8);
 stores.focusGuideStep(d,step);stores.beginShowcase(d,step,'partial-reserve-test');for(let i=0;i<43;i++)stores.tickShowcase(.1);stores.cancelShowcase();
 const held=chem.liquidMl(stores.useChemStore.getState().mixtures[source]),received=chem.liquidMl(stores.useChemStore.getState().mixtures[target]);assert.ok(received>0&&received<.1);assert.ok(Math.abs(held+received-5)<1e-8);assert.ok(!Object.keys(stores.useChemStore.getState().mixtures).some(id=>id.startsWith('showcase-carried-')));stores.interactables.delete(source);stores.resetWorkbench();
});
test('device actions distinguish leads, gas hoses, nylon winding and gentle mixing',()=>{
 const start={type:'start',label:'start'};assert.equal(stores.operationFor('galvanicCell',start),'connect-electric');assert.equal(stores.operationFor('gasTrain',start),'connect-gas');assert.equal(stores.operationFor('interfacialBath',start),'measure');assert.equal(stores.operationFor('beaker',start),'stir');assert.equal(stores.operationFor('interfacialBath',{type:'configure',label:'draw',change:{operation:'draw'}}),'wind');
});

test('a drop of base into acid with phenolphthalein flashes pink where it lands while the bulk stays colourless',async()=>{
 const out=await build({stdin:{contents:`export * from './src/visuals/drop-flash.ts'; export * from './src/chemistry/mixture.ts'; export {mixtureLook} from './src/chemistry/color.ts';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
 const fx=await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
 const acid=fx.merge(fx.reagentMixture('hcl',20),fx.reagentMixture('phph',.1));
 const dropped=fx.merge(acid,fx.reagentMixture('naoh',.05));
 const hex=fx.dropFlash(acid,dropped);
 assert.ok(hex,'the drop has a visible local colour');
 const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 assert.ok(r>g+40&&b>g+20,`local pocket is magenta, got ${hex}`);
 const bulk=fx.mixtureLook(dropped).liquid,[br,bg]=[1,3].map(i=>parseInt(bulk.slice(i,i+2),16));
 assert.ok(Math.abs(br-bg)<30,`bulk stays nearly colourless, got ${bulk}`);
 assert.equal(fx.dropFlash(fx.reagentMixture('water',20),fx.merge(fx.reagentMixture('water',20),fx.reagentMixture('water',.05))),null,'plain water shows no flash');
});

test('liquid poured into a loose test tube first stands it in the nearest rack, so it cannot spill',()=>{
 stores.resetWorkbench();stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();
 const inv=stores.useInventoryStore.getState();
 const tube=inv.spawn('testTube',[8,.915,-14.5]),rack=stores.useInventoryStore.getState().spawn('testTubeRack',[8.6,.915,-14.5]),bottle=stores.useInventoryStore.getState().spawn('reagentBottle',[9.2,.915,-14.5],0,{reagent:'hcl'});
 const {moved}=stores.transfer({id:bottle,kind:'reagentBottle',variant:{reagent:'hcl'}},{id:tube,kind:'testTube'},5);
 const s=stores.useInventoryStore.getState();
 assert.equal(moved,5);assert.ok(!s.worldItems.some(w=>w.id===tube));assert.ok(stores.storedIn(s.storage,rack).some(it=>it.id===tube));
 assert.ok(Math.abs(chem.liquidMl(stores.useChemStore.getState().mixtures[tube])-5)<1e-9);
 stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();
});

test('a tilted vessel keeps only what lies below its lower lip; knocked over it empties',()=>{
 const p=stores.PROFILES.beaker,full=stores.volumeBelow(p,[0,1,0],stores.rimHeight?.(p)??.092);
 assert.equal(stores.heldAtTilt(p,1),Infinity);assert.equal(stores.heldAtTilt(p,-.2),0);
 const at30=stores.heldAtTilt(p,Math.cos(Math.PI/6)),at60=stores.heldAtTilt(p,Math.cos(Math.PI/3));
 assert.ok(at30<full&&at60<at30&&at60>0,`${full} ${at30} ${at60}`);
 // Half full: a 20° nudge spills nothing.
 assert.ok(stores.heldAtTilt(p,Math.cos(20*Math.PI/180))>full/2);
});

test('the tools drawer at the worktop gives another test tube instead of pointing at the one already there',()=>{
 stores.resetWorkbench();stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();
 const tube={key:'testTube',kind:'testTube',name:'tube',use:''};
 const count=()=>stores.useInventoryStore.getState().worldItems.filter(w=>w.kind==='testTube'&&w.id.startsWith('spawn-')).length;
 assert.ok(stores.collectSupply(tube));const one=count();
 assert.ok(stores.collectSupply(tube));assert.equal(count(),one,'preparation reuses the bench item');
 assert.ok(stores.collectSupply(tube,false,true));assert.ok(stores.collectSupply(tube,false,true));assert.equal(count(),one+2,'the drawer adds new ones');
 stores.resetWorkbench();stores.useInventoryStore.getState().reset();
});

test('clearing an experiment removes the tubes standing in its rack, so nothing keeps reacting unseen',()=>{
 stores.resetWorkbench();stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();
 stores.selectBenchExperiment('g9-zinc-hcl',true);stores.demonstratePreparation();
 const session=stores.currentSession(),rack=session.objects.testTubeRack,tube=session.objects.testTube,acid=session.objects['reagent-hcl'],zinc=session.objects['reagent-s_zn'];
 assert.ok(rack&&tube&&acid&&zinc);
 stores.transfer({id:acid,kind:'reagentBottle',variant:{reagent:'hcl'}},{id:tube,kind:'testTube'},5);
 stores.transfer({id:zinc,kind:'reagentJar',variant:{reagent:'s_zn'}},{id:tube,kind:'testTube'},.1);
 assert.ok(stores.storedIn(stores.useInventoryStore.getState().storage,rack).some(it=>it.id===tube));
 stores.clearExperimentSession('g9-zinc-hcl');
 assert.equal(stores.useChemStore.getState().mixtures[tube],undefined);
 assert.ok(!stores.useInventoryStore.getState().storage[rack]);
 stores.resetWorkbench();stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();
});

test('gas from a cylinder fills only the space above the contents; the rest escapes without a puddle',()=>{
 stores.resetWorkbench();stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();
 const inv=stores.useInventoryStore.getState();
 const beaker=inv.spawn('beaker',[8,.915,-14.5]),cylinder=stores.useInventoryStore.getState().spawn('gasCylinder',[8.6,.915,-14.5],0,{reagent:'gas_co2'});
 stores.useChemStore.getState().setMixtures({[beaker]:chem.reagentMixture('limewater',200)});
 const puddles=stores.useChemStore.getState().puddles.length;
 const {moved,overflow}=stores.transfer({id:cylinder,kind:'gasCylinder',variant:{reagent:'gas_co2'}},{id:beaker,kind:'beaker'},500);
 assert.ok(Math.abs(moved-50)<1e-6,`${moved}`);assert.equal(overflow,false);assert.equal(stores.useChemStore.getState().puddles.length,puddles);
 assert.ok(Math.abs(chem.gasMl(stores.useChemStore.getState().mixtures[beaker])-50)<1e-6);
 stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();
});

test('a filter stand: the funnel sits in the retort-stand ring, a beaker stands on the base under it, and pouring filters into the beaker',()=>{
 stores.resetWorkbench();stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();
 const inv=()=>stores.useInventoryStore.getState(),Y=.915,X=8,Z=-14.5,RING=[.03,.23];
 const stand=inv().spawn('retortStand',[X,Y,Z]);
 // Holding a funnel offers the ring; holding a beaker offers the base under the ring (not the solid block it used to be).
 const ring=stores.supportSpots(inv().worldItems,'funnel').find(s=>s.id===`support-${stand}`),base=stores.supportSpots(inv().worldItems,'beaker').find(s=>s.id.startsWith(`support-${stand}`));
 assert.ok(ring&&base,'stand spots');assert.ok(Math.abs(ring.point.y-(Y+RING[1]-.06))<1e-9);assert.ok(Math.abs(base.point.y-(Y+.024))<1e-9);
 assert.ok(Math.abs(stores.supportHeightAt(X+RING[0],Z,inv().worldItems,'beaker')-(Y+.024))<1e-9,'a beaker is not lifted onto the ring');
 const beaker=inv().spawn('beaker',[X+RING[0],base.point.y,Z]),funnel=inv().spawn('funnel',[X+RING[0],ring.point.y,Z]);
 const w=(id)=>inv().worldItems.find(x=>x.id===id);
 assert.ok(stores.underFunnel(w(beaker),w(funnel)),'beaker catches the funnel');
 const target=stores.resolveTarget({type:'item',id:funnel,kind:'funnel'});assert.equal(target.id,beaker);assert.equal(target.via,funnel);
 // Muddy salt water through the paper: clear filtrate below, sand on the paper.
 const mud=inv().spawn('beaker',[X+.3,Y,Z]);stores.useChemStore.getState().setMixtures({[mud]:{...chem.reagentMixture('nacl',20),s:{sand:.05}}});
 stores.transfer({id:mud,kind:'beaker'},{id:beaker,kind:'beaker'},20,funnel);
 const below=stores.useChemStore.getState().mixtures[beaker],paper=stores.useChemStore.getState().mixtures[funnel];
 assert.ok(Math.abs(chem.liquidMl(below)-20)<1e-6&&!(below.s.sand>0),'clear filtrate');assert.ok(paper.s.sand>0,'sand stays on the paper');
 // A funnel can also be set straight on a flask's mouth.
 const flask=inv().spawn('erlenmeyer',[X+.6,Y,Z]);
 const mouth=stores.supportSpots(inv().worldItems,'funnel').find(s=>s.id===`support-${flask}`);
 assert.ok(mouth&&Math.abs(mouth.point.y-(Y+.14))<1e-9,'flask mouth');
 const f2=inv().spawn('funnel',[X+.6,mouth.point.y,Z]);assert.ok(stores.underFunnel(w(flask),w(f2)));
 stores.useInventoryStore.getState().reset();stores.useChemStore.getState().reset();
});
