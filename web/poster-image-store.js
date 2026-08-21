(function(root){
'use strict';
const DB_NAME='pa.poster.images.v1';
const STORE_NAME='images';
function openDatabase(){
 return new Promise((resolve,reject)=>{
  if(!root.indexedDB){reject(new Error('Local image storage is unavailable'));return;}
  const request=root.indexedDB.open(DB_NAME,1);
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE_NAME))db.createObjectStore(STORE_NAME,{keyPath:'id'});};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error('Local image storage could not open'));
 });
}
function requestResult(request){return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('Local image storage operation failed'));});}
function transactionDone(tx){return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('Local image storage transaction failed'));tx.onabort=()=>reject(tx.error||new Error('Local image storage transaction aborted'));});}
function makeId(){return `poster-image-${Date.now()}-${Math.random().toString(16).slice(2)}`;}
async function save(blob,metadata={}){
 if(!(blob instanceof Blob)||blob.size===0)throw new Error('Poster image is empty');
 const db=await openDatabase();
 try{
  const id=metadata.id||makeId();
  const record={id,blob,name:metadata.name||'poster-image',type:blob.type||metadata.type||'application/octet-stream',size:blob.size,createdAt:metadata.createdAt||new Date().toISOString()};
  const tx=db.transaction(STORE_NAME,'readwrite');
  tx.objectStore(STORE_NAME).put(record);
  await transactionDone(tx);
  return id;
 }finally{db.close();}
}
async function get(id){
 if(!id)return null;
 const db=await openDatabase();
 try{const tx=db.transaction(STORE_NAME,'readonly');return (await requestResult(tx.objectStore(STORE_NAME).get(id)))||null;}finally{db.close();}
}
async function remove(id){
 if(!id)return;
 const db=await openDatabase();
 try{const tx=db.transaction(STORE_NAME,'readwrite');tx.objectStore(STORE_NAME).delete(id);await transactionDone(tx);}finally{db.close();}
}
root.PropertyAssistantPosterImages={DB_NAME,STORE_NAME,save,get,remove};
})(globalThis);
