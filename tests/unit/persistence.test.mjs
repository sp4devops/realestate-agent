import test from 'node:test';
import assert from 'node:assert/strict';

await import('../../web/domain-store.js');
const { createRepository, migrate, CURRENT_SCHEMA_VERSION, ENTITY_TYPES } = globalThis.PropertyAssistantPersistence;

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    dump() { return Object.fromEntries(data); }
  };
}

function deterministicRepo(storage) {
  let counter = 0;
  return createRepository(storage, {
    now: () => '2026-08-21T12:00:00.000Z',
    makeId: (type) => `${type}-${++counter}`
  });
}

test('P2 repository exposes every required language-neutral entity collection', () => {
  assert.deepEqual(ENTITY_TYPES, ['people','contacts','requirements','properties','interactions','followUps','matches','posterLeads']);
});

test('person CRUD survives repository restart and preserves primary/alternate phones', () => {
  const storage = memoryStorage();
  let repo = deterministicRepo(storage);
  const created = repo.create('people', {
    name: 'Lakshmi (Demo)', role: 'owner', primaryPhone: '+91 90000 00111', alternatePhones: ['+91 90000 00112']
  });
  repo = deterministicRepo(storage);
  assert.deepEqual(repo.get('people', created.id).alternatePhones, ['+91 90000 00112']);
  assert.equal(repo.get('people', created.id).primaryPhone, '+91 90000 00111');
  repo.update('people', created.id, { name: 'Lakshmi Owner (Demo)' });
  repo = deterministicRepo(storage);
  assert.equal(repo.get('people', created.id).name, 'Lakshmi Owner (Demo)');
  assert.equal(repo.remove('people', created.id), true);
  repo = deterministicRepo(storage);
  assert.equal(repo.get('people', created.id), null);
});

test('duplicate primary/alternate phone identity is rejected', () => {
  const repo = deterministicRepo(memoryStorage());
  assert.throws(() => repo.create('people', {
    name: 'Invalid Demo', role: 'buyer', primaryPhone: '+91 90000 00100', alternatePhones: ['+91 90000 00100']
  }), /primaryPhone cannot also be alternate/);
});

test('same normalized mobile cannot belong to two different people', () => {
  const repo = deterministicRepo(memoryStorage());
  repo.create('people',{id:'p1',name:'First',role:'buyer',primaryPhone:'+91 98765 43210',alternatePhones:[]});
  assert.throws(()=>repo.create('people',{id:'p2',name:'Second',role:'owner',primaryPhone:'98765-43210',alternatePhones:[]}),/already belongs to another person/);
  assert.throws(()=>repo.create('people',{id:'p3',name:'Third',role:'owner',primaryPhone:'+91 91234 56789',alternatePhones:['98765 43210']}),/already belongs to another person/);
});

test('relationships must reference existing local records and referenced records cannot be deleted', () => {
  const repo = deterministicRepo(memoryStorage());
  const buyer = repo.create('people', { id:'person-buyer', name:'Buyer Demo', role:'buyer', primaryPhone:'+91 90000 00301', alternatePhones:[] });
  assert.throws(() => repo.create('requirements', { id:'bad-requirement', personId:'missing-person', intent:'buy', propertyType:'land', locations:['Erode'] }), /personId does not exist/);
  const requirement = repo.create('requirements', { id:'requirement-buyer', personId:buyer.id, intent:'buy', propertyType:'land', locations:['Erode'] });
  assert.throws(() => repo.remove('people', buyer.id), /still referenced/);
  const owner = repo.create('people', { id:'person-owner', name:'Owner Demo', role:'owner', primaryPhone:'+91 90000 00302', alternatePhones:[] });
  const property = repo.create('properties', { id:'property-owner', ownerPersonId:owner.id, intent:'sale', propertyType:'land', locality:'Erode', price:2200000 });
  repo.create('matches', { id:'match-demo', requirementId:requirement.id, propertyId:property.id, score:0.9, reasons:['same locality'] });
  assert.throws(() => repo.remove('requirements', requirement.id), /still referenced/);
  assert.throws(() => repo.remove('properties', property.id), /still referenced/);
});

test('poster follow-ups reference an existing lead and protect it from dangling deletion', () => {
  const repo = deterministicRepo(memoryStorage());
  assert.throws(() => repo.create('followUps', { id:'bad-poster-followup', dueAt:'2026-08-21T12:00:00.000Z', status:'open', title:'Bad poster follow-up', posterLeadId:'missing-poster' }), /posterLeadId does not exist/);
  const lead = repo.create('posterLeads', { id:'poster-demo', phone:'9876543210', imageRef:'poster-image-demo', posterLocation:'Erode', captureLocation:null, capturedAt:'2026-08-21T12:00:00.000Z' });
  repo.create('followUps', { id:'poster-followup', dueAt:'2026-08-21T12:00:00.000Z', status:'open', title:'Review poster lead', posterLeadId:lead.id });
  assert.throws(() => repo.remove('posterLeads', lead.id), /still referenced/);
});

test('migration upgrades legacy array collections to schema version 1', () => {
  const migrated = migrate({ people: [{ id:'legacy-person', name:'Legacy Demo', role:'buyer', primaryPhone:'+91 90000 00999', alternatePhones:[] }], properties: [] });
  assert.equal(migrated.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(migrated.entities.people['legacy-person'].name, 'Legacy Demo');
  for (const type of ENTITY_TYPES) assert.ok(migrated.entities[type]);
});

test('malformed structured local data is rejected during load', () => {
  const storage = memoryStorage({ 'pa.domain.v1': JSON.stringify({ schemaVersion:1, entities:{ people:{ broken:{ id:'broken', role:'buyer', primaryPhone:'+91 90000 00998', alternatePhones:[] } } } }) });
  const repo = deterministicRepo(storage);
  assert.throws(() => repo.list('people'), /name is required/);
});

test('synthetic seed is deterministic and never overwrites an existing database', () => {
  const storage = memoryStorage(); const repo = deterministicRepo(storage);
  assert.equal(repo.seedSynthetic(), true); assert.equal(repo.seedSynthetic(), false);
  assert.equal(repo.get('people', 'person-suresh').primaryPhone, '+91 90000 00001');
  assert.equal(repo.get('people', 'person-suresh').alternatePhones[0], '+91 90000 00002');
  assert.equal(repo.get('properties', 'property-murugan').locality, 'Erode');
});

test('corrupt stored JSON fails safely instead of fabricating records', () => {
  const storage = memoryStorage({ 'pa.domain.v1': '{broken-json' }); const repo = deterministicRepo(storage);
  assert.throws(() => repo.list('people'), /corrupted/);
});
