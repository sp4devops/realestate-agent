(function(){
'use strict';
const app=document.getElementById('app'),repo=window.__PA_REPOSITORY__;
let activeVoice=null;
function route(){return (location.hash.replace(/^#\/?/,'')||'').split('?')[0];}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function androidSpeechAvailable(){try{return Boolean(window.PropertyAssistantHost?.hasOnDeviceSpeech?.()&&window.PropertyAssistantHost?.startOnDeviceQuerySpeech);}catch(_){return false;}}
function setVoiceButtons(listening){const start=document.querySelector('[data-testid="start-query-voice"]'),stop=document.querySelector('[data-testid="stop-query-voice"]');if(start)start.hidden=listening;if(stop)stop.hidden=!listening;}
function cleanupVoice(){
 if(!activeVoice)return; activeVoice.cancelled=true;
 if(activeVoice.native){try{window.PropertyAssistantHost?.stopOnDeviceSpeech?.();}catch(_){} }
 try{if(activeVoice.recorder?.state==='recording')activeVoice.recorder.stop();}catch(_){}
 activeVoice.stream?.getTracks?.().forEach(t=>t.stop()); activeVoice=null;
}
function bindResultActions(){
 document.querySelectorAll('[data-query-open-kind]').forEach(b=>b.addEventListener('click',()=>{const map={person:'person',property:'property',match:'match'};const target=map[b.dataset.queryOpenKind];if(target)location.hash=`#/${target}?id=${encodeURIComponent(b.dataset.queryOpenId)}`;}));
}
function renderResults(results){
 const box=document.querySelector('[data-testid="query-results"]'); if(!box)return;
 box.innerHTML=results.length?results.map(r=>`<article class="card opportunity" data-testid="query-result-card"><div><strong>${esc(r.title)}</strong><p>${esc(r.subtitle)}</p></div><button class="button primary" type="button" data-query-open-kind="${r.kind}" data-query-open-id="${esc(r.id)}">Open</button></article>`).join(''):'<div class="placeholder-card">No local results found. Try a name, place, property type, or budget.</div>';
 bindResultActions();
}
function runQuery(text){
 const q=window.PropertyAssistantQuery.interpret(text); const results=window.PropertyAssistantQuery.search(repo.loadSnapshot(),q); renderResults(results);
 const summary=document.querySelector('[data-testid="query-summary"]'); if(summary){summary.hidden=false;summary.textContent=`${results.length} result${results.length===1?'':'s'} from local memory.`;}
 return results;
}
function acceptVoiceQuery(transcript){
 if(route()!=='ask')return;
 const normalized=window.PropertyAssistantVoice.normalizeTranscript(transcript);
 const input=document.querySelector('[data-testid="query-input"]');if(input)input.value=normalized;
 runQuery(normalized);
 const status=document.querySelector('[data-testid="query-voice-status"]');if(status)status.textContent='Voice query searched local memory.';
 setVoiceButtons(false);activeVoice=null;
}
async function voiceQuery(){
 const status=document.querySelector('[data-testid="query-voice-status"]');
 if(androidSpeechAvailable()){
  if(activeVoice?.native)return;
  activeVoice={native:true,cancelled:false};setVoiceButtons(true);status.textContent='Starting on-device microphone…';
  try{const language=window.PropertyAssistantVoice.languageHint(localStorage.getItem('pa.inputLanguage')||'auto');window.PropertyAssistantHost.startOnDeviceQuerySpeech(language);}catch(_){activeVoice=null;setVoiceButtons(false);status.textContent='On-device microphone could not start. You can still type your question.';}
  return;
 }
 if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){status.textContent='Microphone is unavailable. You can still type your question.';return;}
 let session;
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true}); if(route()!=='ask'){stream.getTracks().forEach(t=>t.stop());return;}
  const chunks=[],rec=new MediaRecorder(stream); session={stream,recorder:rec,cancelled:false,native:false}; activeVoice=session; rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
  status.textContent='Listening… tap Stop when done.';setVoiceButtons(true);
  await new Promise(resolve=>{rec.onstop=resolve;document.querySelector('[data-testid="stop-query-voice"]').onclick=()=>rec.stop();rec.start();});
  stream.getTracks().forEach(t=>t.stop()); if(session.cancelled||route()!=='ask')return; activeVoice=null;
  setVoiceButtons(false);status.textContent='Understanding locally…';
  const blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'}); const stt=window.PropertyAssistantVoice.createSttService(); const result=await stt.transcribe(blob,{inputLanguage:localStorage.getItem('pa.inputLanguage')||'auto'});
  if(session.cancelled||route()!=='ask')return; if(!result.ok){status.textContent=result.error;return;} acceptVoiceQuery(result.normalized||result.transcript);
 }catch(_){if(session)session.stream.getTracks().forEach(t=>t.stop());if(route()==='ask'&&status){setVoiceButtons(false);status.textContent='Microphone permission was not available. You can still type your question.';}}finally{if(activeVoice===session)activeVoice=null;}
}
window.__PA_ON_DEVICE_QUERY_STT_STATUS__=message=>{if(route()==='ask'){const status=document.querySelector('[data-testid="query-voice-status"]');if(status)status.textContent=String(message||'Listening…');}};
window.__PA_ON_DEVICE_QUERY_STT_RESULT__=result=>{
 const session=activeVoice;if(!session?.native||session.cancelled||route()!=='ask')return;
 if(!result?.ok){activeVoice=null;setVoiceButtons(false);const status=document.querySelector('[data-testid="query-voice-status"]');if(status)status.textContent=result?.error||'On-device speech recognition could not complete. Type your question instead.';return;}
 acceptVoiceQuery(String(result.transcript||''));
};
function stopVoice(){if(activeVoice?.native){try{window.PropertyAssistantHost?.stopOnDeviceSpeech?.();}catch(_){}const status=document.querySelector('[data-testid="query-voice-status"]');if(status)status.textContent='Finishing locally…';return;}try{if(activeVoice?.recorder?.state==='recording')activeVoice.recorder.stop();}catch(_){} }
function render(){
 app.innerHTML=shell(`<section class="page"><p class="eyebrow">LOCAL ASK</p><h1>Ask</h1><p class="lead">Ask naturally. Property Assistant searches only your local memory and returns useful cards.</p><label class="field"><span>What do you need?</span><input data-testid="query-input" placeholder="e.g. land in Erode under 25 lakh" autocomplete="off" /></label><div class="page-actions"><button class="button primary" type="button" data-testid="run-query">Search local memory</button><button class="button" type="button" data-testid="start-query-voice">Ask by voice</button><button class="button" type="button" data-testid="stop-query-voice" hidden>Stop</button></div><p data-testid="query-voice-status" class="lead"></p><p data-testid="query-summary" hidden></p><div class="choice-list" data-testid="query-results"></div></section>`,'ask');
 bind();
}
function bind(){
 document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',()=>{location.hash=`#/${el.dataset.route}`;}));
 document.querySelector('[data-testid="run-query"]')?.addEventListener('click',()=>runQuery(document.querySelector('[data-testid="query-input"]').value));
 document.querySelector('[data-testid="query-input"]')?.addEventListener('keydown',e=>{if(e.key==='Enter')runQuery(e.currentTarget.value);});
 document.querySelector('[data-testid="start-query-voice"]')?.addEventListener('click',voiceQuery);
 document.querySelector('[data-testid="stop-query-voice"]')?.addEventListener('click',stopVoice);
 bindResultActions();
}
function owned(){if(route()==='ask')render();else cleanupVoice();}
window.__PA_RUN_QUERY__=runQuery;
window.addEventListener('hashchange',()=>setTimeout(owned,0));window.addEventListener('pagehide',cleanupVoice);window.addEventListener('DOMContentLoaded',()=>setTimeout(owned,0));
})();
