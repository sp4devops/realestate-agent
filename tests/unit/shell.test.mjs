import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../../web/app.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../../web/index.html', import.meta.url), 'utf8');
const productMode = await readFile(new URL('../../web/product-mode.js', import.meta.url), 'utf8');
const required = ['splash','onboarding','home','requirements','properties','type','review','after-call','ask','people','person','property','matches','match','poster','poster-review','poster-lead','followups','settings'];

test('P1 route inventory is represented', () => {
  for (const route of required) assert.match(app, new RegExp(`\\b${route.replace('-','\\-')}\\b`));
});

test('pilot mode exposes English typing and explicitly defers voice and multilingual support', () => {
  assert.match(productMode, /id:'english-typing-pilot'/);
  assert.match(productMode, /typedCapture:true/);
  assert.match(productMode, /typedSearch:true/);
  assert.match(productMode, /voiceCapture:false/);
  assert.match(productMode, /multilingualUi:false/);
  assert.doesNotMatch(index, /src="voice-(?:core|ui)\.js"/);
});

test('production shell never auto-seeds synthetic business records', () => {
  assert.doesNotMatch(app, /repository\.seedSynthetic\s*\(/);
  assert.match(app, /Saved on this phone needs a copy/);
});

test('primary shell presents a property second brain instead of a CRM pipeline', () => {
  assert.match(app, /local property second brain/i);
  assert.match(app, /Write what they said\./);
  assert.doesNotMatch(app, /sales pipeline|deal stage|lead funnel/i);
});

test('web shell has a local-only content security policy', () => {
  assert.match(index, /Content-Security-Policy/);
  assert.match(index, /connect-src 'none'/);
  assert.match(index, /script-src 'self'/);
  assert.match(index, /object-src 'none'/);
});
