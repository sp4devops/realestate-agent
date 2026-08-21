(function () {
  'use strict';

  const DRAFT_KEY='pa.captureDraft';
  const app=document.getElementById('app');
  const stt=window.PropertyAssistantVoice.createSttService();
  const extractor=window.PropertyAssistantCapture.createExtractor();
  let recorder=null;
  let chunks=[];
  let stream=null;
  let abandonRecording=false;
  window.__PA_VOICE_METRICS__ = window.__PA_VOICE_METRICS__ || {};

  function currentRoute(){ return (location.hash.replace(/^#\/?/,'') || '').split('?')[0]; }
  function bindRouteButtons(){ document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',()=>{ location.hash=`#/${el.dataset.route}`; })); }
  function setStatus(message, kind='info') { const el=document.querySelector('[data-testid="voice-status"]'); if(el){ el.hidden=false; el.dataset.kind=kind; el.textContent=message; } }
  function stopTracks(){ if(stream){ stream.getTracks().forEach(track=>track.stop()); stream=null; } }
  function cleanupOnExit(){
    if(currentRoute()==='speak') return;
    abandonRecording=true;
    if(recorder && recorder.state==='recording') recorder.stop();
    stopTracks();
  }

  function renderSpeak(){
    abandonRecording=false;
    app.innerHTML=shell(`<section class="page"><p class="eyebrow">VOICE CAPTURE</p><h1>Speak & Save</h1><p class="lead">Speak naturally in Tamil, English, or Tanglish. Audio stays on this device and is passed only to the configured local speech-recognition adapter.</p><div class="placeholder-card voice-card"><button type="button" class="button primary" data-testid="voice-toggle">Start recording</button><p data-testid="voice-status" hidden></p></div><div class="page-actions"><button type="button" class="button" data-route="type">Use Type & Save instead</button></div></section>`, '');
    bindRouteButtons();
    document.querySelector('[data-testid="voice-toggle"]').addEventListener('click',toggleRecording);
  }

  async function toggleRecording(){
    if(recorder && recorder.state==='recording'){ recorder.stop(); return; }
    if(!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia!=='function' || typeof MediaRecorder==='undefined'){
      setStatus('Microphone capture is not available here. Type & Save is still fully available.','error');
      return;
    }
    try {
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      chunks=[];
      abandonRecording=false;
      recorder=new MediaRecorder(stream);
      recorder.addEventListener('dataavailable',event=>{ if(event.data && event.data.size) chunks.push(event.data); });
      recorder.addEventListener('stop',processRecording,{once:true});
      recorder.start();
      const button=document.querySelector('[data-testid="voice-toggle"]');
      button.textContent='Stop & review';
      button.dataset.recording='true';
      setStatus('Recording… tap Stop & review when finished.');
    } catch(error){
      stopTracks();
      const denied=error && (error.name==='NotAllowedError' || error.name==='SecurityError');
      setStatus(denied ? 'Microphone permission was denied. You can continue with Type & Save.' : 'Microphone could not start. You can continue with Type & Save.','error');
    }
  }

  async function processRecording(){
    const blob=new Blob(chunks,{type:(recorder && recorder.mimeType)||'audio/webm'});
    stopTracks();
    if(abandonRecording){ recorder=null; chunks=[]; return; }
    const button=document.querySelector('[data-testid="voice-toggle"]');
    if(button){ button.disabled=true; button.textContent='Processing locally…'; }
    const inputLanguage=localStorage.getItem('pa.inputLanguage') || 'auto';
    const started=performance.now();
    const result=await stt.transcribe(blob,{inputLanguage});
    window.__PA_VOICE_METRICS__ = { audioBytes:blob.size, sttLatencyMs:Math.round(performance.now()-started), measuredAt:new Date().toISOString() };
    if(!result.ok){ if(button){ button.disabled=false; button.textContent='Try recording again'; } setStatus(result.error,'error'); return; }
    setStatus(`Heard: ${result.transcript}`);
    const parsed=await extractor.extract(result.normalized);
    if(!parsed.ok){ if(button){ button.disabled=false; button.textContent='Try recording again'; } setStatus(parsed.error || 'I could not understand that recording. Type & Save is still available.','error'); return; }
    parsed.sourceChannel='voice';
    parsed.rawTranscript=result.transcript;
    parsed.normalizedTranscript=result.normalized;
    sessionStorage.setItem(DRAFT_KEY,JSON.stringify(parsed));
    location.hash='#/review';
  }

  function renderOwnedRoute(){ cleanupOnExit(); if(currentRoute()==='speak') renderSpeak(); }
  window.addEventListener('hashchange',()=>setTimeout(renderOwnedRoute,0));
  window.addEventListener('pagehide',()=>{ abandonRecording=true; stopTracks(); });
  window.addEventListener('DOMContentLoaded',()=>setTimeout(renderOwnedRoute,0));
})();
