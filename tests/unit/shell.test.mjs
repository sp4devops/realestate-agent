import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../../web/app.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../../web/index.html', import.meta.url), 'utf8');
const required = ['splash','onboarding','home','speak','type','review','after-call','ask','people','person','property','matches','match','poster','poster-review','poster-lead','followups','language','settings'];

test('P1 route inventory is represented', () => {
  for (const route of required) assert.match(app, new RegExp(`\\b${route.replace('-','\\-')}\\b`));
});

test('display and input language use separate storage keys', () => {
  assert.match(app, /pa\.displayLanguage/);
  assert.match(app, /pa\.inputLanguage/);
  assert.notEqual('pa.displayLanguage', 'pa.inputLanguage');
});

test('production shell never auto-seeds synthetic business records', () => {
  assert.doesNotMatch(app, /repository\.seedSynthetic\s*\(/);
  assert.match(app, /Local memory needs recovery/);
});

test('web shell has a local-only content security policy', () => {
  assert.match(index, /Content-Security-Policy/);
  assert.match(index, /connect-src 'none'/);
  assert.match(index, /script-src 'self'/);
  assert.match(index, /object-src 'none'/);
});
