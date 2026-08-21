import test from 'node:test';
import assert from 'node:assert/strict';
await import('../../web/after-call-core.js');
const core=globalThis.PropertyAssistantAfterCall;

test('recap builds a call interaction and optional open follow-up',()=>{
 const {interaction,followUp}=core.buildRecords({phone:'+91 98765 43210',summary:'Buyer wants to see the property Saturday',dueAt:'2026-08-23T10:30',personId:'person-1'},()=> '2026-08-22T00:00:00.000Z');
 assert.equal(interaction.kind,'call');
 assert.equal(interaction.phone,'9876543210');
 assert.deepEqual(interaction.personIds,['person-1']);
 assert.equal(followUp.status,'open');
 assert.equal(followUp.personId,'person-1');
 assert.match(followUp.title,/9876543210/);
});

test('recap does not require phone or follow-up',()=>{
 const {interaction,followUp}=core.buildRecords({summary:'Owner will confirm price tomorrow'});
 assert.equal(interaction.phone,null);
 assert.deepEqual(interaction.personIds,[]);
 assert.equal(followUp,null);
});

test('invalid phone and empty summary are rejected',()=>{
 assert.throws(()=>core.buildRecords({summary:'',phone:'9876543210'}),/short call recap/i);
 assert.throws(()=>core.buildRecords({summary:'ok',phone:'123'}),/valid 10-digit/i);
});

test('follow-up lifecycle only permits explicit transitions',()=>{
 assert.equal(core.transition('open','done'),'done');
 assert.equal(core.transition('open','cancel'),'cancelled');
 assert.equal(core.transition('done','reopen'),'open');
 assert.equal(core.transition('cancelled','reopen'),'open');
 assert.throws(()=>core.transition('done','cancel'),/cannot cancel/i);
});

test('pending after-call marker stores only number launched by the app and expires when stale',()=>{
 const values=new Map();
 const storage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)||null,removeItem:k=>values.delete(k)};
 core.markPendingAfterCall(storage,{phone:'+91 90000 00001',personId:'person-suresh'},()=> '2026-08-22T00:00:00.000Z');
 assert.deepEqual(core.readPendingAfterCall(storage,()=>Date.parse('2026-08-22T01:00:00.000Z')),{phone:'9000000001',personId:'person-suresh',launchedAt:'2026-08-22T00:00:00.000Z'});
 assert.equal(core.readPendingAfterCall(storage,()=>Date.parse('2026-08-22T03:00:00.000Z')),null);
 assert.equal(storage.getItem(core.PENDING_KEY),null);
});

test('recent-number lookup is unavailable unless a platform adapter explicitly provides it',async()=>{
 const env={localStorage:{setItem(){},getItem(){return null},removeItem(){}},location:{},navigator:{}};
 assert.equal(await core.createCommunicationService(env).recentNumber(),null);
 env.__PA_RECENT_NUMBER__=async()=>'+91 91234 56789';
 assert.equal(await core.createCommunicationService(env).recentNumber(),'9123456789');
});
