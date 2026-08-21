import test from 'node:test';
import assert from 'node:assert/strict';

await import('../../web/matching-core.js');
const { evaluate, rank } = globalThis.PropertyAssistantMatching;

const req={id:'r1',intent:'buy',propertyType:'land',locations:['Erode'],budgetMin:1800000,budgetMax:2500000};
const prop={id:'p1',intent:'sale',propertyType:'land',locality:'Erode',price:2200000};

test('exact Suresh-style demand and Murugan-style supply is a strong match',()=>{
  const result=evaluate(req,prop);
  assert.equal(result.eligible,true);
  assert.equal(result.score,100);
  assert.ok(result.reasons.some(r=>r.includes('Exact location')));
  assert.ok(result.reasons.some(r=>r.includes('Within stated budget')));
});

test('property type and transaction intent are hard requirements',()=>{
  assert.equal(evaluate(req,{...prop,propertyType:'house'}).eligible,false);
  assert.equal(evaluate(req,{...prop,intent:'rent'}).eligible,false);
});

test('nearby locality and modest over-budget price remain explainable preferences',()=>{
  const result=evaluate(req,{...prop,locality:'Perundurai',price:2650000});
  assert.equal(result.eligible,true);
  assert.ok(result.score<100);
  assert.ok(result.reasons.some(r=>r.includes('Nearby Erode')));
  assert.ok(result.reasons.some(r=>r.includes('above budget')));
});

test('far location or price beyond tolerance is excluded',()=>{
  assert.equal(evaluate(req,{...prop,locality:'Chennai'}).eligible,false);
  assert.equal(evaluate(req,{...prop,price:3000000}).eligible,false);
});

test('ranking sorts higher scoring matches first',()=>{
  const ranked=rank([req],[prop,{...prop,id:'p2',locality:'Perundurai',price:2400000}]);
  assert.equal(ranked[0].propertyId,'p1');
  assert.equal(ranked.length,2);
});
