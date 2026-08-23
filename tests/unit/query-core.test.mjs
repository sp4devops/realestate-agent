import test from 'node:test';
import assert from 'node:assert/strict';
await import('../../web/query-core.js');
const {interpret,search}=globalThis.PropertyAssistantQuery;
const snapshot={entities:{people:{u1:{id:'u1',name:'Suresh',role:'buyer',primaryPhone:'+91 9000000001',alternatePhones:[]},u2:{id:'u2',name:'Murugan',role:'owner',primaryPhone:'+91 9000000003',alternatePhones:[]},u3:{id:'u3',name:'Kumar',role:'buyer',primaryPhone:'+91 9000000004',alternatePhones:[]},u4:{id:'u4',name:'Wide Budget Buyer',role:'buyer',primaryPhone:'+91 9000000005',alternatePhones:[]}},properties:{p1:{id:'p1',ownerPersonId:'u2',intent:'sale',propertyType:'land',locality:'Erode',price:2200000},p2:{id:'p2',ownerPersonId:'u2',intent:'rent',propertyType:'house',locality:'Chennai',price:15000}},requirements:{r1:{id:'r1',personId:'u1',intent:'buy',propertyType:'land',locations:['Erode'],budgetMin:1800000,budgetMax:2500000},r2:{id:'r2',personId:'u4',intent:'buy',propertyType:'land',locations:['Erode'],budgetMin:2000000,budgetMax:4000000}},matches:{m1:{id:'m1',requirementId:'r1',propertyId:'p1',score:100,reasons:['Exact location: Erode']}}}};

test('interprets natural property query with locality and budget',()=>{
 const q=interpret('show land in Erode under 25 lakh');
 assert.equal(q.entity,'properties'); assert.equal(q.location,'Erode'); assert.equal(q.propertyType,'land'); assert.equal(q.maxPrice,2500000);
});

test('offline local search returns actionable property and person results',()=>{
 const props=search(snapshot,interpret('land in Erode under 25 lakh')); assert.equal(props.length,1); assert.equal(props[0].id,'p1');
 const people=search(snapshot,interpret('find Suresh contact')); assert.equal(people.length,1); assert.equal(people[0].kind,'person');
});

test('property-specific filters do not leak unrelated people',()=>{
 const results=search(snapshot,interpret('Erode under 25 lakh'));
 assert.ok(results.every(r=>r.kind!=='person')); assert.ok(results.some(r=>r.id==='p1'));
});

test('role-only people queries do not invent transaction filters',()=>{
 const buyers=interpret('find buyers');
 assert.equal(buyers.personRole,'buyer'); assert.equal(buyers.intent,null);
 assert.deepEqual(search(snapshot,buyers).map(r=>r.id),['u1','u3','u4']);
 const owners=interpret('find owners');
 assert.equal(owners.personRole,'owner'); assert.equal(owners.intent,null);
 assert.deepEqual(search(snapshot,owners).map(r=>r.id),['u2']);
 assert.deepEqual(search(snapshot,interpret('find sellers')).map(r=>r.id),['u2']);
});

test('explicit buyer queries filter through linked requirements',()=>{
 const q=interpret('find buyers looking for land in Erode under 25 lakh');
 assert.equal(q.entity,'people'); assert.equal(q.personRole,'buyer');
 assert.deepEqual(search(snapshot,q).map(r=>r.id),['u1']);
 assert.deepEqual(search(snapshot,interpret('find buyers looking for house in Chennai under 20000')).map(r=>r.id),[]);
});

test('buyer max-price query evaluates the stated maximum budget, not only the minimum',()=>{
 const under25=search(snapshot,interpret('find buyers looking for land in Erode under 25 lakh')).map(r=>r.id);
 assert.deepEqual(under25,['u1']);
 const under40=search(snapshot,interpret('find buyers looking for land in Erode under 40 lakh')).map(r=>r.id);
 assert.deepEqual(under40,['u1','u4']);
});

test('explicit owner queries filter through owned property supply',()=>{
 const q=interpret('find owners with land in Erode under 25 lakh');
 assert.equal(q.personRole,'owner'); assert.deepEqual(search(snapshot,q).map(r=>r.id),['u2']);
 assert.deepEqual(search(snapshot,interpret('find owners with land in Chennai under 25 lakh')).map(r=>r.id),[]);
});

test('buy intent finds sale inventory while buyer requirements stay buy',()=>{
 assert.deepEqual(search(snapshot,interpret('land in Erode to buy under 25 lakh')).map(r=>r.id),['p1']);
 assert.deepEqual(search(snapshot,interpret('find buyers who want land in Erode under 25 lakh')).map(r=>r.id),['u1']);
});

test('phone lookup targets the matching person instead of all contacts',()=>{
 const q=interpret('find phone 9000000003'); const results=search(snapshot,q);
 assert.equal(q.phoneTerm,'9000000003'); assert.deepEqual(results.map(r=>r.id),['u2']);
});

test('match query returns persisted explained match',()=>{
 const results=search(snapshot,interpret('show matches in Erode')); assert.equal(results.length,1); assert.equal(results[0].kind,'match');
});
