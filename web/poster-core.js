(function(root){
'use strict';
const KNOWN_PLACES=['Erode','Coimbatore','Chennai','Salem','Madurai','Trichy','Tiruppur'];
function normalizeText(value){return String(value||'').replace(/\r/g,'').replace(/[ \t]+/g,' ').trim();}
function extractPhones(text){
 const matches=normalizeText(text).match(/(?:\+?91[\s-]?)?[6-9]\d(?:[\s-]?\d){8}/g)||[];
 const seen=new Set();
 return matches.map(value=>value.replace(/\D/g,'')).map(value=>value.length===12&&value.startsWith('91')?value.slice(2):value).filter(value=>{if(value.length!==10||seen.has(value))return false;seen.add(value);return true;});
}
function extractPosterLocation(text){
 const cleaned=normalizeText(text);
 const known=KNOWN_PLACES.find(place=>new RegExp(`\\b${place}\\b`,'i').test(cleaned));
 if(known)return known;
 const explicit=cleaned.match(/\b(?:location|area|place|at|near)\b\s*[:\-]?\s*([A-Za-z][A-Za-z -]{2,40}?)(?=[.,;\n]|\b(?:call|contact|phone|mobile|whatsapp)\b|$)/i);
 return explicit?explicit[1].trim():null;
}
function extract(text){
 const normalized=normalizeText(text),phones=extractPhones(normalized);
 return {text:normalized,phones,primaryPhone:phones[0]||null,posterLocation:extractPosterLocation(normalized)};
}
const nativeRequests=new Map();
root.__PA_POSTER_OCR_RESULT__=function(requestId,payload){
 const request=nativeRequests.get(requestId);if(!request)return;nativeRequests.delete(requestId);clearTimeout(request.timeout);
 payload?.ok?request.resolve({text:payload.text||''}):request.reject(new Error(payload?.error||'Poster reading failed locally.'));
};
function blobToDataUrl(blob){
 return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(new Error('Poster image could not be opened.'));reader.readAsDataURL(blob);});
}
async function prepareImageDataUrl(blob){
 if(!blob||typeof blob.arrayBuffer!=='function')throw new Error('Choose a poster image first.');
 if(!root.createImageBitmap||!root.document)return blobToDataUrl(blob);
 let bitmap;
 try{
  bitmap=await root.createImageBitmap(blob);const maxEdge=1800;const scale=Math.min(1,maxEdge/Math.max(bitmap.width,bitmap.height));
  const canvas=root.document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const context=canvas.getContext('2d',{alpha:false});if(!context)throw new Error('Poster image could not be prepared.');
  context.drawImage(bitmap,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',0.88);
 }finally{bitmap?.close?.();}
}
async function recognizeWithAndroid(blob){
 const host=root.PropertyAssistantHost;if(!host||typeof host.recognizePoster!=='function')throw new Error('Local OCR is unavailable.');
 const imageDataUrl=await prepareImageDataUrl(blob);const requestId=`ocr-${Date.now()}-${Math.random().toString(16).slice(2)}`;
 return new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{nativeRequests.delete(requestId);reject(new Error('Poster reading timed out. Retake it or type the text.'));},30000);
  nativeRequests.set(requestId,{resolve,reject,timeout});
  try{host.recognizePoster(imageDataUrl,requestId);}catch(error){clearTimeout(timeout);nativeRequests.delete(requestId);reject(error);}
 });
}
if(root.PropertyAssistantHost&&typeof root.PropertyAssistantHost.recognizePoster==='function'&&!root.__PA_LOCAL_OCR__){root.__PA_LOCAL_OCR__={recognize:recognizeWithAndroid};}
function createOcrService(){
 return {async recognize(imageBlob){
   const adapter=root.__PA_LOCAL_OCR__;
   if(!adapter||typeof adapter.recognize!=='function')return {ok:false,error:'Local OCR is unavailable. You can type the poster text and continue.'};
   try{
    const result=await adapter.recognize(imageBlob);
    const text=typeof result==='string'?result:result?.text;
    if(!text||!String(text).trim())return {ok:false,error:'No readable text was found. You can type the poster text and continue.'};
    return {ok:true,...extract(text)};
   }catch(_){return {ok:false,error:'Poster reading failed locally. You can type the poster text and continue.'};}
 }};
}
root.PropertyAssistantPoster={normalizeText,extractPhones,extractPosterLocation,extract,prepareImageDataUrl,recognizeWithAndroid,createOcrService};
})(globalThis);
