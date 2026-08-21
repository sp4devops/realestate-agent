import test from 'node:test';
import assert from 'node:assert/strict';

await import('../../web/capture-parser.js');
const { parse, createExtractor } = globalThis.PropertyAssistantCapture;

test('English buyer note extracts structured requirement', () => {
  const result = parse('Arun wants land in Erode, budget 25 lakh, phone 98765 43210');
  assert.equal(result.kind, 'requirement');
  assert.equal(result.person.name, 'Arun');
  assert.equal(result.person.primaryPhone, '+91 98765 43210');
  assert.equal(result.requirement.propertyType, 'land');
  assert.deepEqual(result.requirement.locations, ['Erode']);
  assert.equal(result.requirement.budgetMax, 2500000);
});

test('short advisor note does not parse Perundurai as the Tanglish name marker', () => {
  const result = parse('Tsk wants 5 acre in perundurai');
  assert.equal(result.kind, 'requirement');
  assert.equal(result.person.name, 'Tsk');
  assert.equal(result.requirement.propertyType, 'land');
  assert.deepEqual(result.requirement.locations, ['Perundurai']);
  assert.deepEqual(result.requirement.size, { value:5, unit:'acre' });
  assert.ok(result.uncertain.includes('primaryPhone'));
  assert.ok(result.uncertain.includes('budgetMax'));
  assert.ok(!result.uncertain.includes('locality'));
  assert.ok(!result.uncertain.includes('propertyType'));
});

test('common Indian mobile separators normalize to one structured phone', () => {
  assert.equal(parse('Arun wants site in Pollachi budget 25L phone 987 654 3210').person.primaryPhone, '+91 98765 43210');
  assert.equal(parse('Arun wants site in Tambaram budget 25 lakh phone +91-98765-43210').person.primaryPhone, '+91 98765 43210');
});

test('Tanglish buyer note works without a model', () => {
  const result = parse('Name is Ravi, Erode la land venum, budget 20 lakh, phone 91234 56789');
  assert.equal(result.kind, 'requirement');
  assert.equal(result.person.name, 'Ravi');
  assert.equal(result.requirement.propertyType, 'land');
  assert.equal(result.requirement.budgetMax, 2000000);
});

test('Tamil property note extracts supply fields and preserves owner phone', () => {
  const result = parse('பெயர் Murugan, Erode நிலம் விற்பனை price 2200000 phone 93456 78901');
  assert.equal(result.kind, 'property');
  assert.equal(result.person.name, 'Murugan');
  assert.equal(result.person.role, 'owner');
  assert.equal(result.person.primaryPhone, '+91 93456 78901');
  assert.equal(result.property.intent, 'sale');
  assert.equal(result.property.propertyType, 'land');
  assert.equal(result.property.locality, 'Erode');
  assert.equal(result.property.price, 2200000);
});

test('missing details are surfaced as uncertainty instead of invented', () => {
  const result = parse('Need a land');
  assert.equal(result.ok, true);
  assert.ok(result.uncertain.includes('locality'));
  assert.ok(result.uncertain.includes('primaryPhone'));
  assert.ok(result.uncertain.includes('name'));
});

test('empty capture is rejected', () => {
  assert.equal(parse('   ').ok, false);
});

test('extractor accepts a valid replaceable model adapter result', async () => {
  const candidate = {
    ok:true,
    source:'model candidate',
    kind:'property',
    confidence:0.9,
    uncertain:[],
    person:{ name:'Meena', role:'owner', primaryPhone:'+91 90000 00444', alternatePhones:[] },
    requirement:null,
    property:{ intent:'sale', propertyType:'house', locality:'Chennai', price:5000000, ownerPersonId:null }
  };
  const extractor = createExtractor({ extract: async () => candidate });
  assert.deepEqual(await extractor.extract('ignored by valid adapter'), candidate);
});

test('extractor falls back to deterministic rules when adapter throws or is invalid', async () => {
  const note = 'Arun wants land in Erode, budget 25 lakh, phone 98765 43210';
  const throwing = createExtractor({ extract: async () => { throw new Error('model unavailable'); } });
  assert.equal((await throwing.extract(note)).requirement.budgetMax, 2500000);

  const invalid = createExtractor({ extract: async () => ({ ok:true, kind:'property', uncertain:[], person:null, property:{} }) });
  assert.equal((await invalid.extract(note)).person.name, 'Arun');
});
