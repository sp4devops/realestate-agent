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

test.skip('deferred multilingual: Tanglish buyer note works without a model', () => {
  const result = parse('Name is Ravi, Erode la land venum, budget 20 lakh, phone 91234 56789');
  assert.equal(result.kind, 'requirement');
  assert.equal(result.person.name, 'Ravi');
  assert.equal(result.requirement.propertyType, 'land');
  assert.equal(result.requirement.budgetMax, 2000000);
});

test.skip('deferred multilingual: everyday Tanglish BHK request keeps the person, precise locality and monthly budget', () => {
  const result = parse('Ramesh-ku Erode railway station pakkathula 2BHK rent venum. Budget 15k. Family only. Next month move pannuvaaru.');
  assert.equal(result.kind, 'requirement');
  assert.equal(result.person.name, 'Ramesh');
  assert.equal(result.requirement.intent, 'rent');
  assert.equal(result.requirement.propertyType, '2bhk');
  assert.deepEqual(result.requirement.locations, ['Erode Railway Station']);
  assert.equal(result.requirement.budgetMax, 15000);
  assert.deepEqual(result.requirement.preferences, ['Family only']);
  assert.equal(result.requirement.timing, 'Next month');
});

test('budget range and trailing owner language become structured business meaning', () => {
  const demand = parse('Kumar wants plot in Perundurai, budget ₹25–35 lakh, phone 98765 40001');
  assert.equal(demand.requirement.budgetMin, 2500000);
  assert.equal(demand.requirement.budgetMax, 3500000);

  const supply = parse('Nasiyanur side one site available, 7 cent, 38 lakhs, owner Subramani, phone 98765 40002');
  assert.equal(supply.kind, 'property');
  assert.equal(supply.person.name, 'Subramani');
  assert.equal(supply.property.locality, 'Nasiyanur');
  assert.deepEqual(supply.property.size, { value:7, unit:'cent' });
  assert.equal(supply.property.price, 3800000);
});

test('size ranges and per-unit land prices remain explicit instead of corrupting totals', () => {
  const demand=parse('Kumar wants residential plot in Perundurai, size 1,500-2,500 sqft, budget ₹25-35 lakh');
  assert.deepEqual(demand.requirement.size,{minValue:1500,maxValue:2500,unit:'sqft'});

  const supply=parse('2 acre land available near Chennimalai, ₹55 lakh/acre, owner negotiable.');
  assert.equal(supply.kind,'property');
  assert.equal(supply.person.name,'');
  assert.equal(supply.property.price,5500000);
  assert.equal(supply.property.priceBasis,'per_acre');
  assert.deepEqual(supply.property.size,{value:2,unit:'acre'});
  assert.ok(supply.property.attributes.includes('Negotiable'));
});

test('updates, rejection memory and reminders route to explicit structured intents',()=>{
  const price=parse('Price changed to 68 lakhs');
  assert.equal(price.kind,'property_update');
  assert.equal(price.propertyUpdate.price,6800000);
  assert.ok(price.uncertain.includes('targetProperty'));

  const reminder=parse('Call Suresh Tuesday');
  assert.equal(reminder.kind,'followup');
  assert.equal(reminder.person.name,'Suresh');
  assert.equal(reminder.followUp.dueText,'Tuesday');

  const visit=parse('Priya visiting tomorrow');
  assert.equal(visit.kind,'followup');
  assert.equal(visit.person.name,'Priya');
  assert.equal(visit.followUp.channel,'Site visit');

  const rejection=parse('Ramesh rejected this because road too narrow');
  assert.equal(rejection.kind,'interaction');
  assert.deepEqual(rejection.interaction.learnedPreferences,['Wider road required']);
});

test('advisor shorthand infers local-market units and keeps matchable preferences', () => {
  const demand = parse('Ravi wants house in Thindal. Budget max 70. East-facing, minimum 30 ft road. Phone 98765 40003.');
  assert.equal(demand.requirement.budgetMax, 7000000);
  assert.deepEqual(demand.requirement.preferences, ['East facing','30-ft road']);

  const supply = parse('Suresh owner house sale in Thindal, owner 65 solraru, east-facing, 40 ft road, negotiable. Phone 98765 40004.');
  assert.equal(supply.property.price, 6500000);
  assert.deepEqual(supply.property.attributes, ['East facing','40-ft road','Negotiable']);
});

test.skip('deferred multilingual: Tamil property note extracts supply fields and preserves owner phone', () => {
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
