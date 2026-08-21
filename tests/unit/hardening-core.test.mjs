import test from 'node:test';
import assert from 'node:assert/strict';

await import('../../web/domain-store.js');
await import('../../web/voice-core.js');
await import('../../web/query-core.js');
await import('../../web/backup-core.js');

const persistence=globalThis.PropertyAssistantPersistence;
const query=globalThis.PropertyAssistantQuery;
const backup=globalThis.PropertyAssistantBackup;

function memoryStorage(initial={}){
  const values=new Map(Object.entries(initial));
  return {
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>values.set(key,String(value)),
    removeItem:key=>values.delete(key),
    dump:()=>Object.fromEntries(values)
  };
}

test('repository transaction does not persist partial multi-record changes when final save fails',()=>{
  const values=new Map();let fail=false;
  const storage={
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>{if(fail)throw new Error('disk full');values.set(key,String(value));}
  };
  const repo=persistence.createRepository(storage,{now:()=> '2026-08-22T00:00:00.000Z'});
  repo.create('people',{id:'existing',name:'Existing',role:'buyer',primaryPhone:'+91 90000 00001',alternatePhones:[]});
  const before=storage.getItem(persistence.STORAGE_KEY);fail=true;
  assert.throws(()=>repo.transact(tx=>{
    const p=tx.create('people',{id:'new-person',name:'New',role:'buyer',primaryPhone:'+91 90000 00002',alternatePhones:[]});
    tx.create('requirements',{id:'new-req',personId:p.id,intent:'buy',propertyType:'land',locations:['Erode']});
  }),/disk full/);
  assert.equal(storage.getItem(persistence.STORAGE_KEY),before);
});

test('domain validation rejects impossible money, size and date values',()=>{
  const repo=persistence.createRepository(memoryStorage());
  const buyer=repo.create('people',{id:'buyer',name:'Buyer',role:'buyer',primaryPhone:'+91 90000 00001',alternatePhones:[]});
  const owner=repo.create('people',{id:'owner',name:'Owner',role:'owner',primaryPhone:'+91 90000 00002',alternatePhones:[]});
  assert.throws(()=>repo.create('requirements',{personId:buyer.id,intent:'buy',propertyType:'land',locations:['Erode'],budgetMax:-1}),/cannot be negative/);
  assert.throws(()=>repo.create('requirements',{personId:buyer.id,intent:'buy',propertyType:'land',locations:['Erode'],size:{value:0,unit:'acre'}}),/greater than zero/);
  assert.throws(()=>repo.create('properties',{ownerPersonId:owner.id,intent:'sale',propertyType:'land',locality:'Erode',price:-10}),/cannot be negative/);
  assert.throws(()=>repo.create('followUps',{dueAt:'not-a-date',status:'open',title:'Bad date'}),/valid date/);
});

test('explicit max-price search excludes properties whose price is unknown',()=>{
  const snapshot=persistence.freshDatabase();
  snapshot.entities.properties.unknown={id:'unknown',intent:'sale',propertyType:'land',locality:'Perundurai',price:null,ownerPersonId:null};
  snapshot.entities.properties.known={id:'known',intent:'sale',propertyType:'land',locality:'Perundurai',price:2000000,ownerPersonId:null};
  const q=query.interpret('show land in Perundurai under 25 lakh');
  assert.equal(q.location,'Perundurai');
  assert.deepEqual(query.search(snapshot,q).map(item=>item.id),['known']);
});

test('backup containing poster images is rejected before restore when image storage is unavailable',async()=>{
  const target=memoryStorage();
  const before=target.dump();
  const payload={domain:persistence.freshDatabase(),settings:{displayLanguage:'en',inputLanguage:'auto'},posterImages:[{id:'img-1',data:'eA==',type:'text/plain'}]};
  await assert.rejects(()=>backup.restorePayload(payload,{imageStore:null,storage:target}),/image storage is unavailable/i);
  assert.deepEqual(target.dump(),before);
});
