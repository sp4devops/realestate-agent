(function(root){
'use strict';
const KNOWN_PLACES=['Erode','Coimbatore','Chennai','Salem','Madurai','Trichy','Tiruppur'];
function normalizeText(value){return String(value||'').replace(/\r/g,'').replace(/[ \t]+/g,' ').trim();}
const OCR_DIGIT_OPTIONS={O:['0'],o:['0'],Q:['0'],D:['0'],I:['1'],i:['1'],l:['1'],L:['1'],Z:['2'],z:['2'],S:['5','9'],s:['5','9'],G:['6'],B:['8']};
const PHONE_SEPARATORS='[\\s().\\-/+]*';
function normalizeMobile(value){
 let digits=String(value||'').replace(/\D/g,'');
 if(digits.length===12&&digits.startsWith('91'))digits=digits.slice(2);
 else if(digits.length===11&&digits.startsWith('0'))digits=digits.slice(1);
 return /^[6-9]\d{9}$/.test(digits)?digits:null;
}
function recoverOcrPhone(line){
 const source=String(line||'').trim();
 if(!source||source.replace(/[^0-9]/g,'').length<7)return null;
 const phoneLike=source.replace(/\b(?:call|contact|phone|mobile|whatsapp)\b/ig,'').trim();
 if(!phoneLike||phoneLike.replace(/[0-9OoQDIilLZzSsGB+():\s.\-/]/g,'').length)return null;
 let variants=[''];let substitutions=0;
 for(const char of phoneLike){
  if(/\d/.test(char))variants=variants.map(value=>value+char);
  else if(OCR_DIGIT_OPTIONS[char]){substitutions+=1;variants=variants.flatMap(value=>OCR_DIGIT_OPTIONS[char].map(digit=>value+digit)).slice(0,8);}
 }
 if(substitutions===0||substitutions>2)return null;
 const candidates=new Set();
 for(const variant of variants){
  const direct=normalizeMobile(variant);if(direct)candidates.add(direct);
 }
 return candidates.size===1?[...candidates][0]:null;
}
function strictPhoneCandidates(text){
 const pattern=new RegExp(`(?:^|[^0-9])((?:(?:\\+?91|0)${PHONE_SEPARATORS})?[6-9]\\d(?:${PHONE_SEPARATORS}\\d){8})(?!${PHONE_SEPARATORS}\\d)`,'g');
 return [...String(text||'').matchAll(pattern)].map(match=>match[1]);
}
function extractPhones(text){
 const normalized=normalizeText(text);
 const matches=strictPhoneCandidates(normalized);
 const seen=new Set();
 const strict=matches.map(normalizeMobile).filter(value=>{if(!value||seen.has(value))return false;seen.add(value);return true;});
 if(strict.length)return strict;
 for(const line of normalized.split('\n')){const recovered=recoverOcrPhone(line);if(recovered&&!seen.has(recovered)){seen.add(recovered);strict.push(recovered);}}
 return strict;
}
function extractPosterLocation(text){
 const cleaned=normalizeText(text);
 const known=KNOWN_PLACES.find(place=>new RegExp(`\\b${place}\\b`,'i').test(cleaned));
 if(known)return known;
 const explicit=cleaned.match(/\b(?:location|area|place|at|near)\b\s*[:\-]?\s*([A-Za-z][A-Za-z -]{2,40}?)(?=[.,;\n]|\b(?:call|contact|phone|mobile|whatsapp)\b|$)/i);
 return explicit?explicit[1].trim():null;
}
function extract(text){
 const normalized=normalizeText(text),phones=extractPhones(normalized),strictPhones=strictPhoneCandidates(normalized).map(normalizeMobile).filter(Boolean);
 return {text:normalized,phones,primaryPhone:phones[0]||null,phoneNeedsReview:Boolean(phones.length&&!strictPhones.includes(phones[0])),posterLocation:extractPosterLocation(normalized)};
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
  bitmap=await root.createImageBitmap(blob);const maxEdge=2048;const scale=Math.min(1,maxEdge/Math.max(bitmap.width,bitmap.height));
  const canvas=root.document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const context=canvas.getContext('2d',{alpha:false});if(!context)throw new Error('Poster image could not be prepared.');
  context.drawImage(bitmap,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',0.94);
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
   }catch(error){const detail=String(error?.message || 'Poster reading failed locally.').trim();return {ok:false,error:`${detail} You can type the poster text and continue.`};}
 }};
}
root.PropertyAssistantPoster={normalizeText,normalizeMobile,recoverOcrPhone,strictPhoneCandidates,extractPhones,extractPosterLocation,extract,prepareImageDataUrl,recognizeWithAndroid,createOcrService};
})(globalThis);
