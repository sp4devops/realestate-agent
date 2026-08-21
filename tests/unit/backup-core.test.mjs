import test from 'node:test';
import assert from 'node:assert/strict';
await import('../../web/domain-store.js');
await import('../../web/backup-core.js');
const backup=globalThis.PropertyAssistantBackup;
const persistence=globalThis.PropertyAssistantPersistence;
function storage(initial={}){const values=new Map(Object.entries(initial));return {getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key),dump:()=>Object.fromEntries(values)};}

test('encrypted backup round-trips structured local data and language settings',async()=>{
 const source=storage({'pa.displayLanguage':'ta','pa.inputLanguage':'tg'});const repo=persistence.createRepository(source,{now:()=> '2026-08-22T00:00:00.000Z',makeId:()=> 'person-1'});
 repo.create('people',{id:'person-1',name:'Suresh',role:'buyer',primaryPhone:'+91 90000 00001',alternatePhones:[]});
 const payload=await backup.createPayload({repository:repo,imageStore:null,storage:source,now:()=> '2026-08-22T00:30:00.000Z'});
 const encrypted=await backup.encryptPayload(payload,'local-safe-123');
 assert.equal(JSON.parse(encrypted).format,backup.FORMAT);assert.equal(encrypted.includes('Suresh'),false);
 const decoded=await backup.decryptBackup(encrypted,'local-safe-123');
 const target=storage();await backup.restorePayload(decoded,{imageStore:null,storage:target});
 const restored=persistence.createRepository(target).loadSnapshot();
 assert.equal(restored.entities.people['person-1'].name,'Suresh');assert.equal(target.getItem('pa.displayLanguage'),'ta');assert.equal(target.getItem('pa.inputLanguage'),'tg');
});

test('wrong password and corrupt or unrelated files fail without replacing current data',async()=>{
 const source=storage();const repo=persistence.createRepository(source);repo.seedSynthetic();
 const encrypted=await backup.encryptPayload(await backup.createPayload({repository:repo,imageStore:null,storage:source}),'correct-123');
 await assert.rejects(()=>backup.decryptBackup(encrypted,'wrong-123'),/wrong or the backup is corrupted/i);
 await assert.rejects(()=>backup.decryptBackup('{bad','correct-123'),/corrupted/i);
 await assert.rejects(()=>backup.decryptBackup(JSON.stringify({format:'other',version:1}),'correct-123'),/not a Property Assistant backup/i);
 const target=storage({[persistence.STORAGE_KEY]:JSON.stringify(repo.loadSnapshot())});const before=target.getItem(persistence.STORAGE_KEY);
 const badPayload={domain:{schemaVersion:1,entities:{}},settings:{displayLanguage:'en',inputLanguage:'auto'}};
 await assert.rejects(()=>backup.restorePayload(badPayload,{imageStore:null,storage:target}));assert.equal(target.getItem(persistence.STORAGE_KEY),before);
});

test('backup password must be at least eight characters',async()=>{
 await assert.rejects(()=>backup.encryptPayload({domain:{},settings:{}},'short'),/at least 8/i);
});
