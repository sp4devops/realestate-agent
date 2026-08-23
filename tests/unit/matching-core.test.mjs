import test from 'node:test';
import assert from 'node:assert/strict';

await import('../../web/matching-core.js');
const { evaluate, rank, effectivePropertyPrice, labelForScore, areNearby } = globalThis.PropertyAssistantMatching;

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
  const result=evaluate(req,{...prop,locality:'Perundurai',price:2650000,attributes:['Negotiable']});
  assert.equal(result.eligible,true);
  assert.ok(result.score<100);
  assert.ok(result.reasons.some(r=>r.includes('Nearby Erode')));
  assert.ok(result.reasons.some(r=>r.includes('above budget')));
});

test('nearby locality relation works in both directions',()=>{
  const reverse=evaluate({...req,locations:['Perundurai']},{...prop,locality:'Erode'});
  assert.equal(reverse.eligible,true);
  assert.ok(reverse.reasons.some(r=>r.includes('Nearby Perundurai')));
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

test('remembered facing and road preferences explain a future match',()=>{
  const result=evaluate(
    {...req,preferences:['East facing','30-ft road']},
    {...prop,attributes:['East facing','40-ft road','Negotiable']}
  );
  assert.ok(result.reasons.includes('East facing'));
  assert.ok(result.reasons.includes('40-ft road meets preference'));
});

test('size ranges are enforced across sqft, cent and acre units',()=>{
  const requirement={...req,size:{minValue:1500,maxValue:2500,unit:'sqft'}};
  assert.equal(evaluate(requirement,{...prop,size:{value:2100,unit:'sqft'}}).eligible,true);
  assert.equal(evaluate(requirement,{...prop,size:{value:3.5,unit:'cent'}}).eligible,true);
  assert.equal(evaluate(requirement,{...prop,size:{value:1200,unit:'sqft'}}).eligible,false);
  assert.equal(evaluate(requirement,{...prop,size:{value:3000,unit:'sqft'}}).eligible,false);
});

test('preference gaps lower confidence and known road-width conflicts are excluded',()=>{
  const requirement={...req,preferences:['East facing','30-ft road']};
  const unknown=evaluate(requirement,{...prop,attributes:[]});
  const strong=evaluate(requirement,{...prop,attributes:['East facing','40-ft road']});
  assert.equal(unknown.eligible,true);
  assert.ok(unknown.score<strong.score);
  assert.equal(labelForScore(unknown.score),'Good Match');
  assert.equal(evaluate(requirement,{...prop,attributes:['West facing','10-ft road']}).eligible,false);
});

test('per-acre rates are converted to transparent total prices for budget matching',()=>{
  const property={...prop,price:5500000,priceBasis:'per_acre',size:{value:2,unit:'acre'},attributes:['Negotiable']};
  assert.equal(effectivePropertyPrice(property),11000000);
  assert.equal(evaluate({...req,budgetMin:null,budgetMax:12000000},property).eligible,true);
  assert.ok(evaluate({...req,budgetMin:null,budgetMax:12000000},property).reasons.includes('Within stated budget'));
});

test('advisor-area landmarks rank as nearby rather than disappearing',()=>{
  assert.equal(areNearby('Erode Railway Station','Erode Bus Stand'),true);
  assert.equal(areNearby('Perundurai','Vijayamangalam'),true);
  assert.equal(areNearby('Thindal','Erode'),true);
});
