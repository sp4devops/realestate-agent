import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const activity=fs.readFileSync('android/app/src/main/java/ai/propertyassistant/app/MainActivity.java','utf8');
const manifest=fs.readFileSync('android/app/src/main/AndroidManifest.xml','utf8');

test('Android communication bridge uses dialer, external WhatsApp and share sheet',()=>{
 assert.match(activity,/addJavascriptInterface\(new PropertyAssistantHost\(\), "PropertyAssistantHost"\)/);
 assert.match(activity,/@JavascriptInterface public void dial/);
 assert.match(activity,/Intent\.ACTION_DIAL/);
 assert.match(activity,/@JavascriptInterface public void whatsapp/);
 assert.match(activity,/whatsapp:\/\/send/);
 assert.match(activity,/@JavascriptInterface public void shareText/);
 assert.match(activity,/Intent\.ACTION_SEND/);
 assert.match(activity,/Intent\.createChooser/);
});

test('P8 does not request call-log, phone-call or SMS permissions',()=>{
 assert.doesNotMatch(manifest,/READ_CALL_LOG/);
 assert.doesNotMatch(manifest,/WRITE_CALL_LOG/);
 assert.doesNotMatch(manifest,/CALL_PHONE/);
 assert.doesNotMatch(manifest,/READ_PHONE_STATE/);
 assert.doesNotMatch(manifest,/READ_SMS/);
});
