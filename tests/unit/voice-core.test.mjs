import test from 'node:test';
import assert from 'node:assert/strict';

await import('../../web/voice-core.js');
await import('../../web/capture-parser.js');
const { normalizeTranscript, languageHint, createSttService } = globalThis.PropertyAssistantVoice;
const { parse } = globalThis.PropertyAssistantCapture;

test('regional Tamil/Tanglish place and property aliases normalize locally', () => {
  assert.equal(normalizeTranscript('Name is Ravi, erodu la site venum'), 'Name is Ravi, Erode la land venum');
  assert.equal(normalizeTranscript('kovai la veedu venum'), 'Coimbatore la house venum');
});

test('normalized Tanglish transcript extracts useful business meaning', () => {
  const normalized = normalizeTranscript('Name is Ravi, erodu la site venum, budget 20 lakh, phone 91234 56789');
  const result = parse(normalized);
  assert.equal(result.kind, 'requirement');
  assert.equal(result.person.name, 'Ravi');
  assert.deepEqual(result.requirement.locations, ['Erode']);
  assert.equal(result.requirement.propertyType, 'land');
  assert.equal(result.requirement.budgetMax, 2000000);
});

test('input-language preference becomes an STT language hint without changing display language', () => {
  assert.equal(languageHint('ta'), 'ta-IN');
  assert.equal(languageHint('tg'), 'ta-IN');
  assert.equal(languageHint('en'), 'en-IN');
  assert.equal(languageHint('auto'), 'auto');
});

test('STT adapter returns normalized transcript', async () => {
  let hint;
  const service = createSttService(() => ({ transcribe: async (_audio, options) => { hint=options.language; return { transcript:'erodu la site for sale price 20 lakh' }; } }));
  const result = await service.transcribe(new Blob(['audio']), { inputLanguage:'tg' });
  assert.equal(result.ok, true);
  assert.equal(hint, 'ta-IN');
  assert.equal(result.normalized, 'Erode la land for sale price 20 lakh');
});

test('missing or failing STT is recoverable and explicitly keeps typed capture available', async () => {
  const unavailable = await createSttService(() => null).transcribe(new Blob([]));
  assert.equal(unavailable.ok, false);
  assert.equal(unavailable.code, 'stt_unavailable');
  assert.match(unavailable.error, /Type & Save/);

  const failed = await createSttService(() => ({ transcribe: async () => { throw new Error('offline model error'); } })).transcribe(new Blob([]));
  assert.equal(failed.ok, false);
  assert.equal(failed.code, 'stt_failed');
});
