(function(){
'use strict';
const repo=window.__PA_REPOSITORY__;
let draft={imageRef:null,imageName:null,ocrText:'',phone:null,posterLocation:null,captureLocation:null,capturedAt:null};
function route(){return (location.hash.replace(/^#\/?/,'')||'').split('?')[0];}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function readAsDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(file);});}
function renderPoster(){
 app.innerHTML=shell(`<section class="page"><p class="eyebrow">SCAN POSTER</p><h1>Scan Poster</h1><p class="lead">Take a photo or choose an image. Property Assistant reads it locally and prioritizes phone numbers.</p><label class="field"><span>Poster image</span><input type="file" accept="image/*" capture="environment" data-testid="poster-image" /></label><label class="field"><span>Poster text fallback</span><textarea rows="5" data-testid="poster-text" placeholder="If local OCR is unavailable, type or paste the visible poster text here."></textarea></label><div class="page-actions"><button class="button primary" type="button" data-testid="read-poster">Read poster locally</button><button class="button" type="button" data-testid="use-poster-text">Use typed poster text</button></div><p class="lead" data-testid="poster-status"></p></section>`,'');
 bindShell();
 document.querySelector('[data-testid="read-poster"]').addEventListener('click',readPoster);
 document.querySelector('[data-testid="use-poster-text"]').addEventListener('click',useTypedText);
}
async function readPoster(){
 const status=document.querySelector('[data-testid="poster-status"]');
 const input=document.querySelector('[data-testid="poster-image"]'); const file=input.files?.[0];
 if(!file){status.textContent='Choose or capture a poster image first.';return;}
 try{draft.imageRef=await readAsDataUrl(file);draft.imageName=file.name||'poster-image';draft.capturedAt=new Date().toISOString();}catch(_){status.textContent='The selected image could not be read.';return;}
 status.textContent='Reading poster locally…';
 const result=await window.PropertyAssistantPoster.createOcrService().recognize(file);
 if(!result.ok){status.textContent=result.error;return;}
 draft.ocrText=result.text;draft.phone=result.primaryPhone;draft.posterLocation=result.posterLocation;location.hash='#/poster-review';
}
function useTypedText(){
 const status=document.querySelector('[data-testid="poster-status"]'); const text=document.querySelector('[data-testid="poster-text"]').value;
 if(!text.trim()){status.textContent='Add the visible poster text first.';return;}
 const parsed=window.PropertyAssistantPoster.extract(text);draft.ocrText=parsed.text;draft.phone=parsed.primaryPhone;draft.posterLocation=parsed.posterLocation;draft.capturedAt=draft.capturedAt||new Date().toISOString();location.hash='#/poster-review';
}
function renderReview(){
 app.innerHTML=shell(`<section class="page"><p class="eyebrow">REVIEW POSTER</p><h1>Poster review</h1><p class="lead">Confirm the extracted details before saving. Poster location and photo GPS stay separate.</p><label class="field"><span>Phone number</span><input data-testid="poster-phone" value="${esc(draft.phone||'')}" inputmode="tel" /></label><label class="field"><span>Poster says location</span><input data-testid="poster-location" value="${esc(draft.posterLocation||'')}" /></label><label class="field"><span>Recognized poster text</span><textarea rows="5" data-testid="poster-review-text">${esc(draft.ocrText||'')}</textarea></label><div class="placeholder-card"><strong>Photo taken at</strong><p data-testid="capture-location">${draft.captureLocation?esc(draft.captureLocation):'Not captured. GPS is optional.'}</p></div><div class="page-actions"><button class="button" type="button" data-testid="get-capture-location">Use current location once</button><button class="button primary" type="button" data-testid="save-poster-lead">Save poster lead</button></div><p class="lead" data-testid="poster-review-status"></p></section>`,'');
 bindShell();
 document.querySelector('[data-testid="get-capture-location"]').addEventListener('click',captureGpsOnce);
 document.querySelector('[data-testid="save-poster-lead"]').addEventListener('click',saveLead);
}
function captureGpsOnce(){
 const status=document.querySelector('[data-testid="poster-review-status"]');
 if(!navigator.geolocation){status.textContent='Location is unavailable. You can save without GPS.';return;}
 status.textContent='Getting location once…';
 navigator.geolocation.getCurrentPosition(pos=>{draft.captureLocation=JSON.stringify({lat:Number(pos.coords.latitude.toFixed(6)),lng:Number(pos.coords.longitude.toFixed(6))});renderReview();},()=>{status.textContent='Location permission was not available. You can save without GPS.';},{enableHighAccuracy:false,maximumAge:0,timeout:5000});
}
function saveLead(){
 const status=document.querySelector('[data-testid="poster-review-status"]'); const phone=document.querySelector('[data-testid="poster-phone"]').value.replace(/\D/g,'');
 if(phone.length!==10){status.textContent='Enter a valid 10-digit phone number before saving.';return;}
 const posterLocation=document.querySelector('[data-testid="poster-location"]').value.trim()||null;
 const text=document.querySelector('[data-testid="poster-review-text"]').value.trim();
 try{
  const lead=repo.create('posterLeads',{phone,imageRef:draft.imageRef||`text:${text.slice(0,120)}`,posterLocation,captureLocation:draft.captureLocation,capturedAt:draft.capturedAt||new Date().toISOString(),ocrText:text});
  repo.create('followUps',{dueAt:new Date().toISOString(),status:'open',title:`Review poster lead ${phone}`,posterLeadId:lead.id});
  draft={...draft,leadId:lead.id,phone,posterLocation,ocrText:text};location.hash=`#/poster-lead?id=${encodeURIComponent(lead.id)}`;
 }catch(error){status.textContent=error.message||'Poster lead could not be saved.';}
}
function renderLead(){
 const id=new URLSearchParams(location.hash.split('?')[1]||'').get('id')||draft.leadId; const lead=id?repo.get('posterLeads',id):null;
 if(!lead){app.innerHTML=shell(`<section class="page"><h1>Poster lead not found</h1><div class="page-actions"><button class="button" data-route="poster">Scan another poster</button></div></section>`,'');bindShell();return;}
 app.innerHTML=shell(`<section class="page"><p class="eyebrow">POSTER LEAD</p><h1>Poster lead</h1><div class="placeholder-card"><strong>Phone</strong><p data-testid="saved-poster-phone">${esc(lead.phone)}</p><strong>Poster says location</strong><p>${esc(lead.posterLocation||'Not found')}</p><strong>Photo taken at</strong><p>${esc(lead.captureLocation||'GPS not captured')}</p></div><div class="page-actions"><button class="button primary" data-route="followups">View follow-up</button><button class="button" data-route="poster">Scan another poster</button></div></section>`,'');bindShell();
}
function bindShell(){document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',()=>{location.hash=`#/${el.dataset.route}`;}));}
function owned(){const r=route();if(r==='poster')renderPoster();else if(r==='poster-review')renderReview();else if(r==='poster-lead')renderLead();}
window.addEventListener('hashchange',()=>setTimeout(owned,0));window.addEventListener('DOMContentLoaded',()=>setTimeout(owned,0));
})();
