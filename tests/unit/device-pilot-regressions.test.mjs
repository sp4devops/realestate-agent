import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mainActivity = await readFile(new URL('../../android/app/src/main/java/ai/propertyassistant/app/MainActivity.java', import.meta.url), 'utf8');
const manifest = await readFile(new URL('../../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
const extractionRules = await readFile(new URL('../../android/app/src/main/res/xml/data_extraction_rules.xml', import.meta.url), 'utf8');
const releaseWorkflow = await readFile(new URL('../../.github/workflows/release-candidates.yml', import.meta.url), 'utf8');
const qualityWorkflow = await readFile(new URL('../../.github/workflows/quality-gates.yml', import.meta.url), 'utf8');
const app = await readFile(new URL('../../web/app.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../../web/index.html', import.meta.url), 'utf8');
const styles = await readFile(new URL('../../web/styles.css', import.meta.url), 'utf8');
const queryUi = await readFile(new URL('../../web/query-ui.js', import.meta.url), 'utf8');
const settingsUi = await readFile(new URL('../../web/settings-ui.js', import.meta.url), 'utf8');
const androidBuild = await readFile(new URL('../../android/app/build.gradle', import.meta.url), 'utf8');
const desktopBuild = await readFile(new URL('../../scripts/build_desktop_rc.py', import.meta.url), 'utf8');

test('Android shell uses secure local asset origin, navigation lock and system-bar insets', () => {
  assert.match(mainActivity, /WebViewAssetLoader/);
  assert.match(mainActivity, /appassets\.androidplatform\.net/);
  assert.match(mainActivity, /shouldOverrideUrlLoading/);
  assert.match(mainActivity, /isTrustedAppUri/);
  assert.match(mainActivity, /isTrustedOrigin/);
  assert.match(mainActivity, /MIXED_CONTENT_NEVER_ALLOW/);
  assert.match(mainActivity, /WindowInsetsCompat\.Type\.systemBars\(\)/);
  assert.match(mainActivity, /WindowInsetsCompat\.Type\.displayCutout\(\)/);
  assert.match(mainActivity, /--native-safe-bottom/);
  assert.match(mainActivity, /androidx\.core\.graphics\.Insets/);
  assert.doesNotMatch(mainActivity, /android\.graphics\.Insets|toPlatformInsets\(/);
  assert.match(qualityWorkflow, /lintDebug/);
  assert.match(manifest, /windowSoftInputMode="adjustResize"/);
});

test('English typing pilot excludes voice runtime and microphone permission', () => {
  assert.doesNotMatch(manifest, /RECORD_AUDIO/);
  assert.doesNotMatch(mainActivity, /SpeechRecognizer|RecognizerIntent|startOnDeviceSpeech|startOnDeviceQuerySpeech/);
  assert.doesNotMatch(index, /voice-core\.js|voice-ui\.js/);
  assert.doesNotMatch(queryUi, /MediaRecorder|getUserMedia|query-voice|speech/i);
  assert.match(androidBuild, /tasks\.register\('syncWebAssets', Sync\)/);
  assert.match(androidBuild, /exclude 'voice-core\.js', 'voice-ui\.js'/);
  assert.match(desktopBuild, /ignore_patterns\("voice-core\.js", "voice-ui\.js"\)/);
  assert.match(releaseWorkflow, /Deferred voice runtime was packaged/);
});

test('Android exports encrypted backups through a user-selected document with no storage permission', () => {
  assert.match(mainActivity, /ACTION_CREATE_DOCUMENT/);
  assert.match(mainActivity, /exportBackup/);
  assert.match(mainActivity, /__PA_BACKUP_EXPORT_RESULT__/);
  assert.match(settingsUi, /PropertyAssistantHost\.exportBackup/);
  assert.match(settingsUi, /__PA_BACKUP_EXPORT_RESULT__/);
  assert.doesNotMatch(manifest, /WRITE_EXTERNAL_STORAGE|READ_EXTERNAL_STORAGE|MANAGE_EXTERNAL_STORAGE/);
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
  assert.match(styles, /--native-safe-bottom/);
  assert.match(styles, /left:var\(--safe-left\)/);
  assert.match(styles, /keyboard-open/);
});
