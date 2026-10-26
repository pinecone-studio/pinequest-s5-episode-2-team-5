import test from 'node:test';
import assert from 'node:assert/strict';
import { dependentSchools, dependentSoums, validateLocation } from '../src/data/location.ts';
const soums=[{id:'s1',aimag_id:'a1',name:'A soum'},{id:'s2',aimag_id:'a2',name:'B soum'}];
const schools=[{id:'u1',name:'UB sample 1',region_type:'ulaanbaatar',district_id:'bzd',aimag_id:null,soum_id:null,is_sample:true},{id:'u2',name:'UB sample 2',region_type:'ulaanbaatar',district_id:'sbd',aimag_id:null,soum_id:null,is_sample:true},{id:'r1',name:'Rural 1',region_type:'rural',district_id:null,aimag_id:'a1',soum_id:'s1',is_sample:true},{id:'r2',name:'Rural 2',region_type:'rural',district_id:null,aimag_id:'a1',soum_id:'s2',is_sample:true}];
test('validation requires region, rural aimag/soum, and school or other text',()=>{
 assert.equal(validateLocation({region_type:'ulaanbaatar',district_id:null,aimag_id:null,soum_id:null,school_id:null,school_other:null}),'Дүүргээ сонгоно уу.');
 assert.equal(validateLocation({region_type:'ulaanbaatar',district_id:'bzd',aimag_id:null,soum_id:null,school_id:null,school_other:'Шинэ сургууль'}),null);
 assert.equal(validateLocation({region_type:'rural',district_id:null,aimag_id:null,soum_id:null,school_id:null,school_other:null}),'Аймгаа сонгоно уу.');
 assert.equal(validateLocation({region_type:'rural',district_id:null,aimag_id:'a1',soum_id:'s1',school_id:null,school_other:'   '}),'Сургуулиа сонгоно уу эсвэл нэрийг бичнэ үү.');
 assert.equal(validateLocation({region_type:'rural',district_id:null,aimag_id:'a1',soum_id:'s1',school_id:null,school_other:'My school'}),null);
});
test('soums and schools follow the selected rural aimag and soum',()=>{
 assert.deepEqual(dependentSoums(soums,'a1').map(x=>x.id),['s1']);
 assert.deepEqual(dependentSchools(schools,'rural','a1','s1').map(x=>x.id),['r1']);
 assert.deepEqual(dependentSchools(schools,'ulaanbaatar',null,null,'bzd').map(x=>x.id),['u1']);
 assert.deepEqual(dependentSchools(schools,'ulaanbaatar',null,null,'sbd').map(x=>x.id),['u2']);
 assert.deepEqual(dependentSchools(schools,'rural','a2','s2'),[]);
});
