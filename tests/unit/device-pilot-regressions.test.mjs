import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mainActivity = await readFile(new URL('../../android/app/src/main/java/ai/propertyassistant/app/MainActivity.java', import.meta.url), 'utf8');
const manifest = await readFile(new URL('../../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
const extractionRules = await readFile(new URL('../../android/app/src/main/res/xml/data_extraction_rules.xml', import.meta.url), 'utf8');
const releaseWorkflow = await readFile(new URL('../../.github/workflows/release-candidates.yml', import.meta.url), 'utf8');
const app = await readFile(new URL('../../web/app.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../../web/styles.css', import.meta.url), 'utf8');
const voiceUi = await readFile(new URL('../../web/voice-ui.js', import.meta.url), 'utf8');
const queryUi = await readFile(new URL('../../web/query-ui.js', import.meta.url), 'utf8');

test('Android shell uses secure local asset origin, navigation lock and system-bar insets', () => {
  assert.match(mainActivity, /WebViewAssetLoader/);
  assert.match(mainActivity, /appassets\.androidplatform\.net/);
  assert.match(mainActivity, /shouldOverrideUrlLoading/);
  assert.match(mainActivity, /isTrustedAppUri/);
  assert.match(mainActivity, /isTrustedOrigin/);
  assert.match(mainActivity, /MIXED_CONTENT_NEVER_ALLOW/);
  assert.match(mainActivity, /WindowInsetsCompat\.Type\.systemBars\(\)/);
  assert.match(manifest, /windowSoftInputMode="adjustResize"/);
});

test('Android exposes local on-device speech recognition for capture and Ask', () => {
  assert.match(mainActivity, /createOnDeviceSpeechRecognizer/);
  assert.match(mainActivity, /EXTRA_PREFER_OFFLINE/);
  assert.match(mainActivity, /startOnDeviceQuerySpeech/);
  assert.match(voiceUi, /__PA_ON_DEVICE_STT_RESULT__/);
  assert.match(queryUi, /__PA_ON_DEVICE_QUERY_STT_RESULT__/);
});

test('Android OS backup and device transfer are disabled for private local memory', () => {
  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:fullBackupContent="false"/);
  assert.match(manifest, /android:dataExtractionRules="@xml\/data_extraction_rules"/);
  assert.match(extractionRules, /<cloud-backup/);
  assert.match(extractionRules, /<device-transfer>/);
  assert.match(extractionRules, /exclude domain="database"/);
  assert.match(extractionRules, /exclude domain="sharedpref"/);
});

test('CI release candidates derive isolated package identity from VERSION', () => {
  assert.match(releaseWorkflow, /VERSION must end in -rc\.N/);
  assert.match(releaseWorkflow, /PA_APPLICATION_ID=ai\.propertyassistant\.app\.rc\$\{rc\}/);
  assert.match(releaseWorkflow, /PA_APPLICATION_LABEL=Property Assistant RC\$\{rc\}/);
  assert.doesNotMatch(releaseWorkflow, /PA_APPLICATION_ID:\s*ai\.propertyassistant\.app\.rc3/);
});

test('user-facing shell contains no phase-development placeholder copy', () => {
  assert.doesNotMatch(app, /Phase-owned workflow|owning phase|will be added in Phase|will be implemented in Phase/);
});

test('mobile layout protects fixed navigation and hides it while editing', () => {
  assert.match(styles, /safe-area-inset-bottom/);
  assert.match(styles, /keyboard-open/);
});
