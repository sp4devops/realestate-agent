import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

const requiredDocs = [
  'docs/pilot/PILOT_CHECKLIST.md',
  'docs/pilot/PILOT_ONBOARDING.md',
  'docs/pilot/FEEDBACK_TEMPLATE.md',
  'docs/pilot/KNOWN_LIMITATIONS.md',
  'docs/pilot/RECOVERY_AND_ROLLBACK.md'
];

test('pilot kit includes required operational guidance', async () => {
  const content = (await Promise.all(requiredDocs.map(read))).join('\n').toLowerCase();
  for (const phrase of ['property advisor', 'backup', 'privacy', 'feedback', 'recovery', 'critical', 'high']) {
    assert.ok(content.includes(phrase), `pilot kit must mention ${phrase}`);
  }
  assert.ok(content.includes('without developer'), 'pilot checklist must target independent use');
});

test('synthetic demo database is internally consistent', async () => {
  const data = JSON.parse(await read('docs/pilot/DEMO_DATA.json'));
  assert.equal(data.schemaVersion, 1);
  const e = data.entities;
  for (const type of ['people','contacts','requirements','properties','interactions','followUps','matches','posterLeads']) {
    assert.ok(e[type] && typeof e[type] === 'object', `missing entity collection ${type}`);
  }
  assert.ok(Object.keys(e.people).length >= 3, 'demo needs multiple people');
  assert.ok(Object.keys(e.requirements).length >= 2, 'demo needs buyer requirements');
  assert.ok(Object.keys(e.properties).length >= 1, 'demo needs property supply');
  assert.ok(Object.keys(e.matches).length >= 1, 'demo needs at least one match');
  const has = (type, id) => id == null || Boolean(e[type][id]);
  for (const record of Object.values(e.requirements)) assert.ok(has('people', record.personId));
  for (const record of Object.values(e.properties)) assert.ok(has('people', record.ownerPersonId));
  for (const record of Object.values(e.matches)) {
    assert.ok(has('requirements', record.requirementId));
    assert.ok(has('properties', record.propertyId));
  }
  for (const record of Object.values(e.followUps)) {
    assert.ok(has('people', record.personId));
    assert.ok(has('properties', record.propertyId));
  }
});