import test from 'node:test';
import assert from 'node:assert/strict';
await import('../../web/poster-core.js');
const {extractPhones,recoverOcrPhone,extractPosterLocation,extract,createOcrService}=globalThis.PropertyAssistantPoster;

test('phone-first extraction normalizes Indian mobile numbers and preserves order',()=>{
 const phones=extractPhones('Call +91 98765-43210 or 91234 56789');
 assert.deepEqual(phones,['9876543210','9123456789']);
});

test('phone-first extraction accepts common poster punctuation',()=>{
 assert.deepEqual(extractPhones('Contact: (98765) 43210'),['9876543210']);
 assert.deepEqual(extractPhones('Mobile 98765.43210'),['9876543210']);
});

test('OCR-confused phone characters are recovered only when one valid number is unambiguous',()=>{
 assert.equal(recoverOcrPhone('Call: 9B765-43210'),'9876543210');
 const recovered=extract('LAND FOR SALE\nCall: 9B765-43210');
 assert.equal(recovered.primaryPhone,'9876543210');
 assert.equal(recovered.phoneNeedsReview,true);
 assert.equal(recoverOcrPhone('SALE S0123-456-789'),null);
});

test('poster location extraction stays separate from capture GPS',()=>{
 const result=extract('2BHK for rent. Location: Erode. Call 9876543210');
 assert.equal(result.primaryPhone,'9876543210');
 assert.equal(result.posterLocation,'Erode');
 assert.equal('captureLocation' in result,false);
});

test('known locality can be recovered without an explicit location label',()=>{
 assert.equal(extractPosterLocation('Land for sale in Coimbatore call 9876543210'),'Coimbatore');
});

test('local OCR adapter returns extracted poster fields',async()=>{
 globalThis.__PA_LOCAL_OCR__={recognize:async()=>({text:'Plot near Erode. Contact 9876543210'})};
 const result=await createOcrService().recognize(new Blob(['image']));
 assert.equal(result.ok,true); assert.equal(result.primaryPhone,'9876543210'); assert.equal(result.posterLocation,'Erode');
 delete globalThis.__PA_LOCAL_OCR__;
});

test('missing or failing OCR remains recoverable with typed fallback',async()=>{
 delete globalThis.__PA_LOCAL_OCR__;
 assert.equal((await createOcrService().recognize(new Blob(['x']))).ok,false);
 globalThis.__PA_LOCAL_OCR__={recognize:async()=>{throw new Error('offline engine failure')}};
 const failed=await createOcrService().recognize(new Blob(['x']));
 assert.equal(failed.ok,false); assert.match(failed.error,/type the poster text/i);
 delete globalThis.__PA_LOCAL_OCR__;
});
