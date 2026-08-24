import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../../web/identity-core.js');
const identity = globalThis.PropertyAssistantIdentity;
const captureUi = await readFile(new URL('../../web/capture-ui.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../../web/index.html', import.meta.url), 'utf8');

test('two same-name people with no phone match do not default to create new', () => {
  assert.equal(identity.defaultIdentityChoice(2, ''), '');
  assert.equal(identity.requiresExplicitIdentityChoice(2, ''), true);
});

test('duplicate-name save without an explicit choice is blocked', () => {
  assert.throws(() => identity.assertIdentityChoice(2, '', ''), /Two people share this name\. Which one\?/);
  assert.throws(() => identity.assertIdentityChoice(2, '', '   '), /Two people share this name\. Which one\?/);
});

test('choosing an existing Ramesh or create new is an explicit allowed choice', () => {
  assert.doesNotThrow(() => identity.assertIdentityChoice(2, '', 'ramesh-erode'));
  assert.doesNotThrow(() => identity.assertIdentityChoice(2, '', identity.CREATE_PERSON_VALUE));
});

test('exact phone match can preselect that person and does not force another choice', () => {
  assert.equal(identity.defaultIdentityChoice(2, 'ramesh-erode'), 'ramesh-erode');
  assert.equal(identity.requiresExplicitIdentityChoice(2, 'ramesh-erode'), false);
  assert.doesNotThrow(() => identity.assertIdentityChoice(2, 'ramesh-erode', 'ramesh-erode'));
});

test('a sole name-only match still defaults to create a new person', () => {
  assert.equal(identity.defaultIdentityChoice(1, ''), identity.CREATE_PERSON_VALUE);
  assert.equal(identity.requiresExplicitIdentityChoice(1, ''), false);
});

test('review save asks for a real identity choice before creating a person', () => {
  assert.match(index, /identity-core\.js/);
  assert.match(captureUi, /requireIdentityChoice\(form, parsed\)/);
  assert.match(captureUi, /defaultIdentityChoice/);
  assert.match(captureUi, /Choose…/);
});
