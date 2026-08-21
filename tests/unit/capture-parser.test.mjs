import test from 'node:test';
import assert from 'node:assert/strict';

await import('../../web/capture-parser.js');
const { parse } = globalThis.PropertyAssistantCapture;

test('English buyer note extracts structured requirement', () => {
  const result = parse('Arun wants land in Erode, budget 25 lakh, phone 98765 43210');
  assert.equal(result.kind, 'requirement');
  assert.equal(result.person.name, 'Arun');
  assert.equal(result.person.primaryPhone, '+91 98765 43210');
  assert.equal(result.requirement.propertyType, 'land');
  assert.deepEqual(result.requirement.locations, ['Erode']);
  assert.equal(result.requirement.budgetMax, 2500000);
});

test('Tanglish buyer note works without a model', () => {
  const result = parse('Name is Ravi, Erode la land venum, budget 20 lakh, phone 91234 56789');
  assert.equal(result.kind, 'requirement');
  assert.equal(result.person.name, 'Ravi');
  assert.equal(result.requirement.propertyType, 'land');
  assert.equal(result.requirement.budgetMax, 2000000);
});

test('Tamil property note extracts supply fields', () => {
  const result = parse('ஈரோடு Erode நிலம் விற்பனை price 2200000 phone 93456 78901');
  assert.equal(result.kind, 'property');
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
