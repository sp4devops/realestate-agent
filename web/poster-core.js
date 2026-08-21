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
root.PropertyAssistantPoster={normalizeText,extractPhones,extractPosterLocation,extract,createOcrService};
})(globalThis);
