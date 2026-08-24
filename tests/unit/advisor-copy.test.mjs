import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = {
  app: await readFile(new URL('../../web/app.js', import.meta.url), 'utf8'),
  capture: await readFile(new URL('../../web/capture-ui.js', import.meta.url), 'utf8'),
  poster: await readFile(new URL('../../web/poster-ui.js', import.meta.url), 'utf8'),
  posterCore: await readFile(new URL('../../web/poster-core.js', import.meta.url), 'utf8'),
  query: await readFile(new URL('../../web/query-ui.js', import.meta.url), 'utf8'),
  queryCore: await readFile(new URL('../../web/query-core.js', import.meta.url), 'utf8'),
  settings: await readFile(new URL('../../web/settings-ui.js', import.meta.url), 'utf8'),
};

const requiredSentences = [
  ['app', /Write what they said\./],
  ['app', /Ramesh needs a 2BHK near Erode Railway Station, rent 18000/],
  ['app', /Type in English, like a WhatsApp note\. It stays on this phone\./],
  ['capture', /I read this as: /],
  ['capture', /Is that right\?/],
  ['capture', />Yes, save</],
  ['capture', />Fix it</],
  ['capture', /Two people named/],
  ['capture', /Which one\?/],
  ['poster', /Call this number/],
  ['query', /See the note/],
  ['app', /Fits what they asked/],
  ['app', /Saved on this phone/],
  ['settings', /Phone copy/],
  ['capture', /field\('They want'/],
  ['capture', /field\('They have'/],
];

test('required advisor-facing sentences are present on glass', () => {
  for (const [fileKey, pattern] of requiredSentences) {
    assert.match(files[fileKey], pattern, `expected ${fileKey} to contain ${pattern}`);
  }
});

test('page/button copy never shows software jargon to the Property Advisor', () => {
  assert.doesNotMatch(files.app, />\s*Contacts\s*</, 'Contacts page title must read People');
  assert.doesNotMatch(files.app, /No contacts yet/i);
  assert.doesNotMatch(files.app, /Back to Contacts/i);
  assert.doesNotMatch(files.app, /aria-label="Add contact"/i);
  assert.doesNotMatch(files.app, /Available sale, rent and lease inventory/i);
  assert.doesNotMatch(files.app, /Smart links/i);
  assert.doesNotMatch(files.app, />\s*Poster lead\s*</, 'poster-lead route title must not read Poster lead');
  assert.doesNotMatch(files.app, /Save poster lead/);

  assert.doesNotMatch(files.poster, /Save poster lead/);
  assert.doesNotMatch(files.poster, /Poster lead could not be saved/);
  assert.doesNotMatch(files.poster, /Review poster lead \$\{/);
  assert.doesNotMatch(files.poster, /text-only lead/i);

  assert.doesNotMatch(files.posterCore, /Local OCR is unavailable/);

  assert.doesNotMatch(files.query, />\s*Open\s*</, 'Ask result cards must not show a bare Open button');

  assert.doesNotMatch(files.queryCore, /'\/acre'|'per_acre'\s*:\s*'\/acre'/);
  assert.doesNotMatch(files.settings, /\.pabackup/);
  assert.match(files.settings, /phone-copy-\$\{/);
});

test('identity resolution copy is unchanged by the wording pass', () => {
  assert.match(files.capture, /Two people named \$\{esc\(personName\)\}\. Which one\?/);
  assert.match(files.capture, /identityCandidates/);
  assert.match(files.capture, /CREATE_PERSON_VALUE/);
});
