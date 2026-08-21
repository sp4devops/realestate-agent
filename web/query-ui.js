(function(){
'use strict';
const app=document.getElementById('app'),repo=window.__PA_REPOSITORY__;
let activeVoice=null;
function route(){return (location.hash.replace(/^#\/?/,'')||'').split('?')[0];}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function cleanupVoice(){
 if(!activeVoice)return; activeVoice.cancelled=true;
 try{if(activeVoice.recorder?.state!=='inactive')activeVoice.recorder.stop();}catch(_){}
 activeVoice.stream?.getTracks().forEach(t=>t.stop()); activeVoice=null;
}
function bindResultActions(){
 document.querySelectorAll('[data-query-open-kind]').forEach(b=>b.addEventListener('click',()=>{const map={person:'person',property:'property',match:'match'};location.hash=`#/${map[b.dataset.queryOpenKind]}?id=${encodeURIComponent(b.dataset.queryOpenId)}`;}));
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
async function voiceQuery(){
 const status=document.querySelector('[data-testid="query-voice-status"]');
 if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){status.textContent='Microphone is unavailable. You can still type your question.';return;}
 let session;
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true}); if(route()!=='ask'){stream.getTracks().forEach(t=>t.stop());return;}
  const chunks=[],rec=new MediaRecorder(stream); session={stream,recorder:rec,cancelled:false}; activeVoice=session; rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
  status.textContent='Listening… tap Stop when done.'; const stop=document.querySelector('[data-testid="stop-query-voice"]'); stop.hidden=false; document.querySelector('[data-testid="start-query-voice"]').hidden=true;
  await new Promise(resolve=>{rec.onstop=resolve;stop.onclick=()=>rec.stop();rec.start();});
  stream.getTracks().forEach(t=>t.stop()); if(session.cancelled||route()!=='ask')return; activeVoice=null;
  stop.hidden=true; document.querySelector('[data-testid="start-query-voice"]').hidden=false; status.textContent='Understanding locally…';
  const blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'}); const stt=window.PropertyAssistantVoice.createSttService(); const result=await stt.transcribe(blob,{inputLanguage:localStorage.getItem('pa.inputLanguage')||'auto'});
  if(session.cancelled||route()!=='ask')return; if(!result.ok){status.textContent=result.error;return;} const input=document.querySelector('[data-testid="query-input"]'); input.value=result.normalized; runQuery(result.normalized); status.textContent='Voice query searched local memory.';
 }catch(_){if(session)session.stream.getTracks().forEach(t=>t.stop());if(route()==='ask'&&status)status.textContent='Microphone permission was not available. You can still type your question.';}finally{if(activeVoice===session)activeVoice=null;}
}
function render(){
 app.innerHTML=shell(`<section class="page"><p class="eyebrow">LOCAL ASK</p><h1>Ask</h1><p class="lead">Ask naturally. Property Assistant searches only your local memory and returns useful cards.</p><label class="field"><span>What do you need?</span><input data-testid="query-input" placeholder="e.g. land in Erode under 25 lakh" autocomplete="off" /></label><div class="page-actions"><button class="button primary" type="button" data-testid="run-query">Search local memory</button><button class="button" type="button" data-testid="start-query-voice">Ask by voice</button><button class="button" type="button" data-testid="stop-query-voice" hidden>Stop</button></div><p data-testid="query-voice-status" class="lead"></p><p data-testid="query-summary" hidden></p><div class="choice-list" data-testid="query-results"></div></section>`,'ask');
 bind();
}
function bind(){
 document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',()=>{location.hash=`#/${el.dataset.route}`;}));
 document.querySelector('[data-testid="run-query"]')?.addEventListener('click',()=>runQuery(document.querySelector('[data-testid="query-input"]').value));
 document.querySelector('[data-testid="query-input"]')?.addEventListener('keydown',e=>{if(e.key==='Enter')runQuery(e.currentTarget.value);});
 document.querySelector('[data-testid="start-query-voice"]')?.addEventListener('click',voiceQuery);
 bindResultActions();
}
function owned(){if(route()==='ask')render();else cleanupVoice();}
window.__PA_RUN_QUERY__=runQuery;
window.addEventListener('hashchange',()=>setTimeout(owned,0));window.addEventListener('pagehide',cleanupVoice);window.addEventListener('DOMContentLoaded',()=>setTimeout(owned,0));
})();
