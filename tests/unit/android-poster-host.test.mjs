import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const activity=readFileSync('android/app/src/main/java/ai/propertyassistant/app/MainActivity.java','utf8');
const manifest=readFileSync('android/app/src/main/AndroidManifest.xml','utf8');
const paths=readFileSync('android/app/src/main/res/xml/file_paths.xml','utf8');
const build=readFileSync('android/app/build.gradle','utf8');
const posterCore=readFileSync('web/poster-core.js','utf8');

test('Android WebView host supports poster camera/gallery file input',()=>{
 assert.match(activity,/onShowFileChooser/);
 assert.match(activity,/ACTION_IMAGE_CAPTURE/);
 assert.match(activity,/FileProvider\.getUriForFile/);
 assert.match(activity,/FILE_CHOOSER_REQUEST/);
 assert.match(manifest,/androidx\.core\.content\.FileProvider/);
 assert.match(paths,/cache-path/);
});

test('Android poster location bridge is one-shot capable without broad app permissions',()=>{
 assert.match(activity,/onGeolocationPermissionsShowPrompt/);
 assert.match(activity,/ACCESS_COARSE_LOCATION/);
 assert.match(manifest,/android\.permission\.ACCESS_COARSE_LOCATION/);
 assert.doesNotMatch(manifest,/android\.permission\.ACCESS_FINE_LOCATION/);
 assert.doesNotMatch(manifest,/android\.permission\.CAMERA/);
 assert.doesNotMatch(manifest,/android\.permission\.INTERNET/);
});

test('Android release bundles an offline OCR engine and connects it to the web adapter',()=>{
 assert.match(build,/com\.google\.mlkit:text-recognition:16\.0\.1/);
 assert.match(activity,/recognizePoster/);
 assert.match(activity,/TextRecognition\.getClient\(TextRecognizerOptions\.DEFAULT_OPTIONS\)/);
 assert.match(activity,/InputImage\.fromBitmap/);
 assert.match(activity,/__PA_POSTER_OCR_RESULT__/);
 assert.match(posterCore,/recognizeWithAndroid/);
 assert.match(posterCore,/prepareImageDataUrl/);
 assert.doesNotMatch(manifest,/android\.permission\.INTERNET/);
});
