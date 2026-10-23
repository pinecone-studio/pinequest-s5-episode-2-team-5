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
await build({stdin:{contents:`export {snapToSupport} from './src/interaction/supportPlacement.ts'; export {supportSpots} from './src/interaction/bodies.ts'; export {benchUseTarget} from './src/interaction/benchUseTarget.ts'; export {tablePointer} from './src/interaction/heldApi.ts'; export {useBenchView} from './src/experiments/nacl/view.ts'; export {useSandbox} from './src/experiments/nacl/sandbox.ts'; export {interactItem} from './src/interaction/interactItem.ts'; export {interactables} from './src/interaction/registry.ts'; export { useLabStore } from './src/store/useLabStore.ts'; export * from './src/experiments/workbench/session.ts'; export {useInventoryStore,storedIn} from './src/store/useInventoryStore.ts'; export {useChemStore} from './src/store/useChemStore.ts'; export {useGameStore} from './src/store/useGameStore.ts'; export * from './src/lab/reaction-view.ts'; export {registerHolder,seedHolder} from './src/interaction/holders.ts';`,resolveDir:process.cwd()},bundle:true,outfile:join(storeTmp,'stores.mjs'),format:'esm',platform:'node'});
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
