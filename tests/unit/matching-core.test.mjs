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

test('messy rent requirement matches the same-area rent house', () => {
  const requirement={id:'r-ramesh',intent:'rent',propertyType:'2bhk',locations:['Erode Railway Station'],budgetMax:18000,preferences:['Family only']};
  const property={id:'p-murugan',intent:'rent',propertyType:'2bhk',locality:'Erode Railway Station',price:17500,priceBasis:'per_month'};
  const result=evaluate(requirement,property);
  assert.equal(result.eligible,true);
  assert.ok(result.reasons.some(reason=>reason.includes('Exact location')));
  assert.ok(result.reasons.some(reason=>reason.includes('Within stated budget')));
  assert.ok(result.reasons.some(reason=>/Family only/i.test(reason)));
});

test('priced Ramesh want does not match a same-area house with no rent or price', () => {
  const requirement={id:'r-ramesh-unpriced',intent:'rent',propertyType:'2bhk',locations:['Erode Railway Station'],budgetMax:18000};
  const property={id:'p-unpriced-house',intent:'rent',propertyType:'2bhk',locality:'Erode Railway Station'};
  const result=evaluate(requirement,property);
  assert.equal(result.eligible,false);
  assert.equal(result.score,0);
  assert.ok(result.reasons.includes('The house has no rent or price, so it cannot fit this budget'));
});

test('both sides without money numbers stay unmatched', () => {
  const requirement={id:'r-no-budget',intent:'rent',propertyType:'2bhk',locations:['Erode Railway Station']};
  const property={id:'p-no-price',intent:'rent',propertyType:'2bhk',locality:'Erode Railway Station'};
  const result=evaluate(requirement,property);
  assert.equal(result.eligible,false);
  assert.equal(result.score,0);
});

test('matching only pairs requirements against properties', () => {
  const first={id:'r1',intent:'rent',propertyType:'2bhk',locations:['Erode Railway Station'],budgetMax:18000};
  const second={id:'r2',intent:'rent',propertyType:'2bhk',locations:['Erode Railway Station'],budgetMax:17500};
  assert.deepEqual(rank([first,second],[]),[]);
  assert.equal(evaluate(first,second).eligible,false);
});

test('incomplete demand without location or budget does not match any 2bhk rent',()=>{
  const incomplete={id:'r-blank',intent:'rent',propertyType:'2bhk',locations:[]};
  const otherCity={id:'p-chennai',intent:'rent',propertyType:'2bhk',locality:'Chennai',price:12000,priceBasis:'per_month'};
  const anyRent={id:'p-erode',intent:'rent',propertyType:'2bhk',locality:'Erode Railway Station',price:17500,priceBasis:'per_month'};
  assert.equal(evaluate(incomplete,otherCity).eligible,false);
  assert.equal(evaluate(incomplete,anyRent).eligible,false);
  assert.equal(evaluate({...incomplete,locations:['Erode Railway Station']},anyRent).eligible,false);
  assert.equal(evaluate({...incomplete,budgetMax:18000},anyRent).eligible,false);
});

test('complete Ramesh and Murugan pair still matches when location and budget are present',()=>{
  const requirement={id:'r-ramesh-complete',intent:'rent',propertyType:'2bhk',locations:['Erode Railway Station'],budgetMax:18000};
  const property={id:'p-murugan-complete',intent:'rent',propertyType:'2bhk',locality:'Erode Railway Station',price:17500,priceBasis:'per_month'};
  const result=evaluate(requirement,property);
  assert.equal(result.eligible,true);
  assert.ok(result.reasons.some(reason=>reason.includes('Exact location')));
  assert.ok(result.reasons.some(reason=>reason.includes('Within stated budget')));
});
