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
    name: 'Lakshmi (Demo)',
    role: 'owner',
    primaryPhone: '+91 90000 00111',
    alternatePhones: ['+91 90000 00112']
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

test('migration upgrades legacy array collections to schema version 1', () => {
  const migrated = migrate({
    people: [{ id:'legacy-person', name:'Legacy Demo', role:'buyer', primaryPhone:'+91 90000 00999', alternatePhones:[] }],
    properties: []
  });
  assert.equal(migrated.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(migrated.entities.people['legacy-person'].name, 'Legacy Demo');
  for (const type of ENTITY_TYPES) assert.ok(migrated.entities[type]);
});

test('synthetic seed is deterministic and never overwrites an existing database', () => {
  const storage = memoryStorage();
  const repo = deterministicRepo(storage);
  assert.equal(repo.seedSynthetic(), true);
  assert.equal(repo.seedSynthetic(), false);
  assert.equal(repo.get('people', 'person-suresh').primaryPhone, '+91 90000 00001');
  assert.equal(repo.get('people', 'person-suresh').alternatePhones[0], '+91 90000 00002');
  assert.equal(repo.get('properties', 'property-murugan').locality, 'Erode');
});

test('corrupt stored JSON fails safely instead of fabricating records', () => {
  const storage = memoryStorage({ 'pa.domain.v1': '{broken-json' });
  const repo = deterministicRepo(storage);
  assert.throws(() => repo.list('people'), /corrupted/);
});
