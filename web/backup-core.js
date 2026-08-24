(function(root){
'use strict';
const FORMAT='property-assistant-backup';
const VERSION=1;
const ITERATIONS=150000;
const PINNED_LOCATIONS_KEY='pa.pinnedLocations.v1';
const encoder=new TextEncoder();
const decoder=new TextDecoder();
function assert(condition,message){if(!condition)throw new Error(message);}
function bytesToBase64(bytes){let binary='';for(const value of bytes)binary+=String.fromCharCode(value);return btoa(binary);}
function base64ToBytes(value){try{const binary=atob(value);return Uint8Array.from(binary,char=>char.charCodeAt(0));}catch(_){throw new Error('Backup file is corrupted');}}
async function deriveKey(passphrase,salt,cryptoApi){
 assert(typeof passphrase==='string'&&passphrase.length>=8,'Backup password must be at least 8 characters');
 const material=await cryptoApi.subtle.importKey('raw',encoder.encode(passphrase),'PBKDF2',false,['deriveKey']);
 return cryptoApi.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function encryptPayload(payload,passphrase,options={}){
 const cryptoApi=options.crypto||root.crypto;assert(cryptoApi&&cryptoApi.subtle,'Secure local encryption is unavailable');
 const salt=cryptoApi.getRandomValues(new Uint8Array(16));
 const iv=cryptoApi.getRandomValues(new Uint8Array(12));
 const key=await deriveKey(passphrase,salt,cryptoApi);
 const ciphertext=new Uint8Array(await cryptoApi.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode(JSON.stringify(payload))));
 return JSON.stringify({format:FORMAT,version:VERSION,kdf:{name:'PBKDF2',hash:'SHA-256',iterations:ITERATIONS,salt:bytesToBase64(salt)},cipher:{name:'AES-GCM',iv:bytesToBase64(iv)},ciphertext:bytesToBase64(ciphertext)});
}
async function decryptBackup(serialized,passphrase,options={}){
 const cryptoApi=options.crypto||root.crypto;assert(cryptoApi&&cryptoApi.subtle,'Secure local encryption is unavailable');
 let envelope;try{envelope=JSON.parse(serialized);}catch(_){throw new Error('Backup file is corrupted');}
 assert(envelope&&envelope.format===FORMAT,'This is not a Property Assistant backup');
 assert(envelope.version===VERSION,'Backup version is not supported');
 assert(envelope.kdf&&envelope.kdf.name==='PBKDF2'&&envelope.kdf.hash==='SHA-256'&&envelope.kdf.iterations===ITERATIONS,'Backup security parameters are not supported');
 assert(envelope.cipher&&envelope.cipher.name==='AES-GCM','Backup encryption is not supported');
 const salt=base64ToBytes(envelope.kdf.salt),iv=base64ToBytes(envelope.cipher.iv),ciphertext=base64ToBytes(envelope.ciphertext);
 try{
  const key=await deriveKey(passphrase,salt,cryptoApi);
  const plaintext=await cryptoApi.subtle.decrypt({name:'AES-GCM',iv},key,ciphertext);
  const payload=JSON.parse(decoder.decode(plaintext));
  assert(payload&&payload.domain&&payload.settings,'Backup contents are incomplete');
  return payload;
 }catch(error){
  if(error&&/at least 8/.test(error.message||''))throw error;
  throw new Error('Backup password is wrong or the backup is corrupted');
 }
}
async function blobToBase64(blob){return bytesToBase64(new Uint8Array(await blob.arrayBuffer()));}
function base64ToBlob(data,type){return new Blob([base64ToBytes(data)],{type:type||'application/octet-stream'});}
async function createPayload({repository,imageStore,storage,now=()=>new Date().toISOString()}){
 assert(repository&&typeof repository.loadSnapshot==='function','Repository is unavailable');
 const images=[];
 if(imageStore&&typeof imageStore.list==='function')for(const item of await imageStore.list())images.push({id:item.id,name:item.name,type:item.type,size:item.size,createdAt:item.createdAt,data:await blobToBase64(item.blob)});
 let pinnedLocations=[];try{const parsed=JSON.parse(storage.getItem(PINNED_LOCATIONS_KEY)||'[]');if(Array.isArray(parsed))pinnedLocations=parsed;}catch(_){}
 return {createdAt:now(),domain:repository.loadSnapshot(),settings:{displayLanguage:storage.getItem('pa.displayLanguage')||'en',inputLanguage:storage.getItem('pa.inputLanguage')||'auto',pinnedLocations},posterImages:images};
}
function validateDomainSnapshot(snapshot){
 const persistence=root.PropertyAssistantPersistence;assert(persistence&&typeof persistence.createRepository==='function','Persistence validator is unavailable');
 const values=new Map([[persistence.STORAGE_KEY,JSON.stringify(snapshot)]]);
 const temp={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 return persistence.createRepository(temp).loadSnapshot();
}
function restoreStorageValue(storage,key,value){if(value==null){if(typeof storage.removeItem==='function')storage.removeItem(key);else storage.setItem(key,'');}else storage.setItem(key,value);}
async function restorePayload(payload,{imageStore,storage}){
 assert(payload&&payload.domain&&payload.settings,'Backup contents are incomplete');
 const display=payload.settings.displayLanguage,input=payload.settings.inputLanguage;
 assert(['en','ta','tg'].includes(display),'Backup display language is invalid');
 assert(['auto','en','ta','tg'].includes(input),'Backup input language is invalid');
 const pinnedLocations=payload.settings.pinnedLocations||[];assert(Array.isArray(pinnedLocations),'Backup pinned locations are invalid');
 const cleanPinned=[...new Set(pinnedLocations.map(value=>{assert(typeof value==='string'&&value.trim()&&value.trim().length<=80,'Backup pinned location is invalid');return value.trim().replace(/\s+/g,' ');} ))].slice(0,30);
 const persistence=root.PropertyAssistantPersistence;
 const validated=validateDomainSnapshot(payload.domain);
 const posterImages=payload.posterImages||[];assert(Array.isArray(posterImages),'Backup poster images are invalid');
 const imageRecords=posterImages.map(item=>{assert(item&&typeof item.id==='string'&&item.id&&typeof item.data==='string','Backup poster image is invalid');const blob=base64ToBlob(item.data,item.type);assert(blob.size>0,'Backup poster image is empty');return {...item,blob};});
 const canReplaceImages=Boolean(imageStore&&typeof imageStore.replaceAll==='function');
 if(imageRecords.length>0)assert(canReplaceImages,'Poster image storage is unavailable; restore was not started');
 const domainKey=persistence.STORAGE_KEY;
 const previous={domain:storage.getItem(domainKey),display:storage.getItem('pa.displayLanguage'),input:storage.getItem('pa.inputLanguage'),pinned:storage.getItem(PINNED_LOCATIONS_KEY)};
 const previousImages=canReplaceImages&&typeof imageStore.list==='function'?await imageStore.list():null;
 try{
  storage.setItem(domainKey,JSON.stringify(validated));
  storage.setItem('pa.displayLanguage',display);storage.setItem('pa.inputLanguage',input);
  storage.setItem(PINNED_LOCATIONS_KEY,JSON.stringify(cleanPinned));
  if(canReplaceImages)await imageStore.replaceAll(imageRecords);
 }catch(error){
  try{
   restoreStorageValue(storage,domainKey,previous.domain);restoreStorageValue(storage,'pa.displayLanguage',previous.display);restoreStorageValue(storage,'pa.inputLanguage',previous.input);restoreStorageValue(storage,PINNED_LOCATIONS_KEY,previous.pinned);
   if(previousImages&&canReplaceImages)await imageStore.replaceAll(previousImages);
  }catch(_){throw new Error('Restore failed and previous local data could not be fully recovered');}
  throw new Error(`Restore could not be completed; previous local data was kept. ${error.message||''}`.trim());
 }
 return {createdAt:payload.createdAt||null,images:imageRecords.length};
}
root.PropertyAssistantBackup={FORMAT,VERSION,ITERATIONS,encryptPayload,decryptBackup,createPayload,restorePayload};
})(globalThis);
