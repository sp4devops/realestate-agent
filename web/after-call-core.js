(function(root){
'use strict';
const PENDING_KEY='pa.pendingAfterCall';
function digits(value){return String(value||'').replace(/\D/g,'');}
function normalizePhone(value){
 let d=digits(value); if(d.length===12&&d.startsWith('91'))d=d.slice(2); if(d.length===11&&d.startsWith('0'))d=d.slice(1);
 return d.length===10?d:null;
}
function phoneForWhatsApp(value){const d=normalizePhone(value);return d?`91${d}`:null;}
function validateRecap(input){
 const summary=String(input?.summary||'').trim(); if(!summary)throw new Error('Add a short call recap before saving.');
 const phone=String(input?.phone||'').trim(); if(phone&&!normalizePhone(phone))throw new Error('Enter a valid 10-digit phone number or leave it blank.');
 if(input?.dueAt){const due=new Date(input.dueAt);if(Number.isNaN(due.getTime()))throw new Error('Choose a valid follow-up time.');}
 return {summary,phone:phone?normalizePhone(phone):null,dueAt:input?.dueAt||null,personId:input?.personId||null};
}
function buildRecords(input,now=()=>new Date().toISOString()){
 const value=validateRecap(input); const occurredAt=now();
 const interaction={kind:'call',occurredAt,personIds:value.personId?[value.personId]:[],summary:value.summary,phone:value.phone};
 const followUp=value.dueAt?{dueAt:new Date(value.dueAt).toISOString(),status:'open',title:value.phone?`Follow up after call · ${value.phone}`:'Follow up after call',personId:value.personId||null}:null;
 return {interaction,followUp};
}
function findPersonByPhone(repo,phone){
 const target=normalizePhone(phone); if(!target)return null;
 return repo.list('people').find(person=>[person.primaryPhone,...(person.alternatePhones||[])].some(item=>normalizePhone(item)===target))||null;
}
function resolveFollowUpPhone(repo,followUp){
 if(followUp.personId){const person=repo.get('people',followUp.personId);if(person?.primaryPhone)return normalizePhone(person.primaryPhone);}
 if(followUp.posterLeadId){const lead=repo.get('posterLeads',followUp.posterLeadId);if(lead?.phone)return normalizePhone(lead.phone);}
 const match=String(followUp.title||'').match(/\b\d{10}\b/);return match?normalizePhone(match[0]):null;
}
function transition(status,action){
 const allowed={open:{done:'done',cancel:'cancelled'},done:{reopen:'open'},cancelled:{reopen:'open'}};
 const next=allowed[status]?.[action]; if(!next)throw new Error(`Cannot ${action} a ${status} follow-up`); return next;
}
function markPendingAfterCall(storage,details,now=()=>new Date().toISOString()){
 const phone=normalizePhone(details?.phone); const payload={phone,personId:details?.personId||null,launchedAt:now()}; storage.setItem(PENDING_KEY,JSON.stringify(payload));return payload;
}
function readPendingAfterCall(storage){
 const raw=storage.getItem(PENDING_KEY);if(!raw)return null;try{return JSON.parse(raw);}catch(_){storage.removeItem(PENDING_KEY);return null;}
}
function clearPendingAfterCall(storage){storage.removeItem(PENDING_KEY);}
function createCommunicationService(env=root){
 function nativeHost(){return env.PropertyAssistantHost||null;}
 function call(phone,personId){const value=normalizePhone(phone);if(!value)throw new Error('A valid phone number is required.');markPendingAfterCall(env.localStorage,{phone:value,personId});const host=nativeHost();if(host?.dial){host.dial(value);return 'native';}if(env.__PA_ACTION_LAUNCHER__){env.__PA_ACTION_LAUNCHER__('call',{phone:value});return 'adapter';}env.location.href=`tel:${value}`;return 'web';}
 function whatsapp(phone,text=''){const value=phoneForWhatsApp(phone);if(!value)throw new Error('A valid phone number is required.');const message=String(text||'');const host=nativeHost();if(host?.whatsapp){host.whatsapp(value,message);return 'native';}if(env.__PA_ACTION_LAUNCHER__){env.__PA_ACTION_LAUNCHER__('whatsapp',{phone:value,text:message});return 'adapter';}env.location.href=`https://wa.me/${value}?text=${encodeURIComponent(message)}`;return 'web';}
 async function share(text){const message=String(text||'').trim();if(!message)throw new Error('Nothing to share.');const host=nativeHost();if(host?.shareText){host.shareText(message);return 'native';}if(env.navigator?.share){await env.navigator.share({text:message});return 'web-share';}if(env.navigator?.clipboard?.writeText){await env.navigator.clipboard.writeText(message);return 'clipboard';}return 'unavailable';}
 async function recentNumber(){const adapter=env.__PA_RECENT_NUMBER__;if(typeof adapter!=='function')return null;const result=await adapter();return normalizePhone(result);}
 return {call,whatsapp,share,recentNumber};
}
root.PropertyAssistantAfterCall={PENDING_KEY,normalizePhone,phoneForWhatsApp,validateRecap,buildRecords,findPersonByPhone,resolveFollowUpPhone,transition,markPendingAfterCall,readPendingAfterCall,clearPendingAfterCall,createCommunicationService};
})(globalThis);
