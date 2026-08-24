import test from 'node:test';
import assert from 'node:assert/strict';
await import('../../web/domain-store.js');
await import('../../web/backup-core.js');
const backup=globalThis.PropertyAssistantBackup;
const persistence=globalThis.PropertyAssistantPersistence;
function storage(initial={}){const values=new Map(Object.entries(initial));return {getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key),dump:()=>Object.fromEntries(values)};}

test('encrypted backup round-trips structured local data, settings and pinned areas',async()=>{
 const source=storage({'pa.displayLanguage':'ta','pa.inputLanguage':'tg','pa.pinnedLocations.v1':'["Perundurai"]'});const repo=persistence.createRepository(source,{now:()=> '2026-08-22T00:00:00.000Z',makeId:()=> 'person-1'});
 repo.create('people',{id:'person-1',name:'Suresh',role:'buyer',primaryPhone:'+91 90000 00001',alternatePhones:[]});
 const payload=await backup.createPayload({repository:repo,imageStore:null,storage:source,now:()=> '2026-08-22T00:30:00.000Z'});
 const encrypted=await backup.encryptPayload(payload,'local-safe-123');
 assert.equal(JSON.parse(encrypted).format,backup.FORMAT);assert.equal(encrypted.includes('Suresh'),false);
 const decoded=await backup.decryptBackup(encrypted,'local-safe-123');
 const target=storage();await backup.restorePayload(decoded,{imageStore:null,storage:target});
 const restored=persistence.createRepository(target).loadSnapshot();
 assert.equal(restored.entities.people['person-1'].name,'Suresh');assert.equal(target.getItem('pa.displayLanguage'),'ta');assert.equal(target.getItem('pa.inputLanguage'),'tg');assert.equal(target.getItem('pa.pinnedLocations.v1'),'["Perundurai"]');
});

test('poster images are included in a produced backup and restored with their bytes',async()=>{
 const source=storage();const repo=persistence.createRepository(source);repo.seedSynthetic();
 const original=new Blob([new Uint8Array([1,2,3,4])],{type:'image/png'});
 const imageStore={list:async()=>[{id:'poster-image-1',blob:original,name:'poster.png',type:'image/png',size:4,createdAt:'2026-08-22T00:00:00.000Z'}]};
 const payload=await backup.createPayload({repository:repo,imageStore,storage:source});
 assert.equal(payload.posterImages.length,1);assert.equal(payload.posterImages[0].data,'AQIDBA==');
 let restored=[];const targetImages={list:async()=>[],replaceAll:async records=>{restored=records;}};
 await backup.restorePayload(payload,{imageStore:targetImages,storage:storage()});
 assert.equal(restored.length,1);assert.equal(restored[0].id,'poster-image-1');assert.equal(restored[0].blob.type,'image/png');assert.deepEqual([...new Uint8Array(await restored[0].blob.arrayBuffer())],[1,2,3,4]);
});

test('wrong password and corrupt or unrelated files fail without replacing current data',async()=>{
 const source=storage();const repo=persistence.createRepository(source);repo.seedSynthetic();
 const encrypted=await backup.encryptPayload(await backup.createPayload({repository:repo,imageStore:null,storage:source}),'correct-123');
 await assert.rejects(()=>backup.decryptBackup(encrypted,'wrong-123'),/wrong or the backup is corrupted/i);
 await assert.rejects(()=>backup.decryptBackup('{bad','correct-123'),/corrupted/i);
 await assert.rejects(()=>backup.decryptBackup(JSON.stringify({format:'other',version:1}),'correct-123'),/not a Property Assistant backup/i);
 const target=storage({[persistence.STORAGE_KEY]:JSON.stringify(repo.loadSnapshot())});const before=target.getItem(persistence.STORAGE_KEY);
 const badDomain=persistence.freshDatabase();badDomain.entities.people['broken']={id:'different-id',name:'Broken',role:'buyer',primaryPhone:'+91 90000 00009',alternatePhones:[]};
 const badPayload={domain:badDomain,settings:{displayLanguage:'en',inputLanguage:'auto'}};
 await assert.rejects(()=>backup.restorePayload(badPayload,{imageStore:null,storage:target}),/record id is inconsistent/i);assert.equal(target.getItem(persistence.STORAGE_KEY),before);
});

test('failed poster-image restore rolls structured settings back to previous values',async()=>{
 const oldStore=storage({'pa.displayLanguage':'en','pa.inputLanguage':'auto'});const oldRepo=persistence.createRepository(oldStore);oldRepo.seedSynthetic();const oldDomain=oldStore.getItem(persistence.STORAGE_KEY);
 const newDomain=persistence.freshDatabase();newDomain.entities.people['new-person']={id:'new-person',name:'New Person',role:'buyer',primaryPhone:'+91 90000 00008',alternatePhones:[],createdAt:'2026-08-22T00:00:00.000Z',updatedAt:'2026-08-22T00:00:00.000Z'};
 let calls=0;const imageStore={list:async()=>[{id:'old-image',blob:new Blob(['old']),name:'old',type:'text/plain'}],replaceAll:async()=>{calls+=1;if(calls===1)throw new Error('disk full');}};
 const payload={domain:newDomain,settings:{displayLanguage:'ta',inputLanguage:'tg'},posterImages:[]};
 await assert.rejects(()=>backup.restorePayload(payload,{imageStore,storage:oldStore}),/previous local data was kept/i);
 assert.equal(oldStore.getItem(persistence.STORAGE_KEY),oldDomain);assert.equal(oldStore.getItem('pa.displayLanguage'),'en');assert.equal(oldStore.getItem('pa.inputLanguage'),'auto');assert.equal(calls,2);
});

test('backup password must be at least eight characters',async()=>{
 await assert.rejects(()=>backup.encryptPayload({domain:{},settings:{}},'short'),/at least 8/i);
});
