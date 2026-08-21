import test from 'node:test';
import assert from 'node:assert/strict';
await import('../../web/voice-core.js');
await import('../../web/query-core.js');
const {interpret,search}=globalThis.PropertyAssistantQuery;
const snapshot={entities:{people:{u1:{id:'u1',name:'Suresh',role:'buyer',primaryPhone:'+91 9000000001',alternatePhones:[]}},properties:{p1:{id:'p1',intent:'sale',propertyType:'land',locality:'Erode',price:2200000},p2:{id:'p2',intent:'rent',propertyType:'house',locality:'Chennai',price:15000}},requirements:{r1:{id:'r1',personId:'u1'}},matches:{m1:{id:'m1',requirementId:'r1',propertyId:'p1',score:100,reasons:['Exact location: Erode']}}}};

test('interprets natural property query with locality and budget',()=>{
 const q=interpret('show land in Erode under 25 lakh');
 assert.equal(q.entity,'properties'); assert.equal(q.location,'Erode'); assert.equal(q.propertyType,'land'); assert.equal(q.maxPrice,2500000);
});

test('Tanglish/regional aliases normalize before query interpretation',()=>{
 const q=interpret('Kovai la site show');
 assert.equal(q.location,'Coimbatore'); assert.equal(q.propertyType,'land');
});

test('offline local search returns actionable property and person results',()=>{
 const props=search(snapshot,interpret('land in Erode under 25 lakh')); assert.equal(props.length,1); assert.equal(props[0].id,'p1');
 const people=search(snapshot,interpret('find Suresh contact')); assert.equal(people.length,1); assert.equal(people[0].kind,'person');
});

test('match query returns persisted explained match',()=>{
 const results=search(snapshot,interpret('show matches in Erode')); assert.equal(results.length,1); assert.equal(results[0].kind,'match');
});
