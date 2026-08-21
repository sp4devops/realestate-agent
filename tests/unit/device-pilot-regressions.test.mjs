import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mainActivity = await readFile(new URL('../../android/app/src/main/java/ai/propertyassistant/app/MainActivity.java', import.meta.url), 'utf8');
const manifest = await readFile(new URL('../../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
const app = await readFile(new URL('../../web/app.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../../web/styles.css', import.meta.url), 'utf8');
const voiceUi = await readFile(new URL('../../web/voice-ui.js', import.meta.url), 'utf8');

test('Android shell uses secure local asset origin and system-bar insets', () => {
  assert.match(mainActivity, /WebViewAssetLoader/);
  assert.match(mainActivity, /https:\/\/appassets\.androidplatform\.net\/assets\/index\.html#\/splash/);
  assert.match(mainActivity, /WindowInsetsCompat\.Type\.systemBars\(\)/);
  assert.match(manifest, /windowSoftInputMode="adjustResize"/);
});

test('Android exposes local on-device speech recognition bridge', () => {
  assert.match(mainActivity, /createOnDeviceSpeechRecognizer/);
  assert.match(mainActivity, /EXTRA_PREFER_OFFLINE/);
  assert.match(mainActivity, /startOnDeviceSpeech/);
  assert.match(voiceUi, /__PA_ON_DEVICE_STT_RESULT__/);
});

test('user-facing shell contains no phase-development placeholder copy', () => {
  assert.doesNotMatch(app, /Phase-owned workflow|owning phase|will be added in Phase|will be implemented in Phase/);
});

test('mobile layout protects fixed navigation and hides it while editing', () => {
  assert.match(styles, /safe-area-inset-bottom/);
  assert.match(styles, /keyboard-open/);
});
