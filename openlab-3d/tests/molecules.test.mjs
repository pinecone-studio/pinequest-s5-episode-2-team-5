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
const pure=await build({stdin:{contents:`export * from './src/chemistry/reaction-view.ts'; export * from './src/chemistry/mixture.ts'; export * from './src/chemistry/mix.ts'; export * from './src/chemistry/kinetics.ts';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
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
await build({stdin:{contents:`export { useLabStore } from './src/store/useLabStore.ts'; export { useWorkbench } from './src/experiments/workbench/session.ts';`,resolveDir:process.cwd()},bundle:true,outfile:join(storeTmp,'stores.mjs'),format:'esm',platform:'node'});
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
