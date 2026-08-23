(function(){
'use strict';
const repo=window.__PA_REPOSITORY__;
function freshDraft(){return {imageBlob:null,imageName:null,ocrText:'',phone:null,phoneNeedsReview:false,posterLocation:null,captureLocation:null,capturedAt:null,leadId:null};}
let draft=freshDraft();
let ocrGeneration=0;
let previewUrl=null;
function route(){return (location.hash.replace(/^#\/?/,'')||'').split('?')[0];}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function clearPreview(){if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}}
function renderPoster(){
 ocrGeneration+=1;clearPreview();
 draft=freshDraft();
 app.innerHTML=shell(`<section class="page"><p class="eyebrow">SCAN POSTER</p><h1>Scan Poster</h1><p class="lead">Take a clear, straight photo with the poster filling the frame. Property Assistant reads English text and phone numbers privately on this device.</p><label class="field"><span>Poster image</span><input type="file" accept="image/*" capture="environment" data-testid="poster-image" /></label><label class="field"><span>Poster text fallback</span><textarea rows="5" data-testid="poster-text" placeholder="If the photo is unclear, type or paste the visible poster text here."></textarea></label><div class="page-actions"><button class="button primary" type="button" data-testid="read-poster">Read poster locally</button><button class="button" type="button" data-testid="use-poster-text">Use typed poster text</button></div><p class="lead" data-testid="poster-status"></p></section>`,'');
 document.querySelector('[data-testid="poster-status"]')?.setAttribute('role','status');
 document.querySelector('[data-testid="poster-status"]')?.setAttribute('aria-live','polite');
 bindShell();
 document.querySelector('[data-testid="read-poster"]').addEventListener('click',readPoster);
 document.querySelector('[data-testid="use-poster-text"]').addEventListener('click',useTypedText);
}
async function readPoster(){
 const status=document.querySelector('[data-testid="poster-status"]');
 const input=document.querySelector('[data-testid="poster-image"]'); const file=input.files?.[0];
 if(!file){status.textContent='Choose or capture a poster image first.';return;}
 const button=document.querySelector('[data-testid="read-poster"]');button.disabled=true;const generation=++ocrGeneration;
 draft.imageBlob=file;draft.imageName=file.name||'poster-image';draft.capturedAt=new Date().toISOString();
 status.textContent='Reading poster locally… Keep this screen open for a moment.';
 try{
  const result=await window.PropertyAssistantPoster.createOcrService().recognize(file);
  if(generation!==ocrGeneration||route()!=='poster')return;
  if(!result.ok){status.textContent=result.error;return;}
  draft.ocrText=result.text;draft.phone=result.primaryPhone;draft.phoneNeedsReview=result.phoneNeedsReview;draft.posterLocation=result.posterLocation;location.hash='#/poster-review';
 }catch(error){if(generation===ocrGeneration&&route()==='poster')status.textContent=error?.message||'Poster could not be read locally. Use the typed poster text fallback.';}
 finally{if(button.isConnected)button.disabled=false;}
}
function useTypedText(){
 const status=document.querySelector('[data-testid="poster-status"]'); const text=document.querySelector('[data-testid="poster-text"]').value;
 if(!text.trim()){status.textContent='Add the visible poster text first.';return;}
 const file=document.querySelector('[data-testid="poster-image"]').files?.[0];
 if(file){draft.imageBlob=file;draft.imageName=file.name||'poster-image';}
 const parsed=window.PropertyAssistantPoster.extract(text);draft.ocrText=parsed.text;draft.phone=parsed.primaryPhone;draft.phoneNeedsReview=parsed.phoneNeedsReview;draft.posterLocation=parsed.posterLocation;draft.capturedAt=draft.capturedAt||new Date().toISOString();location.hash='#/poster-review';
}
function renderReview(){
 clearPreview();if(draft.imageBlob)previewUrl=URL.createObjectURL(draft.imageBlob);
 const preview=previewUrl?`<img class="poster-preview" data-testid="poster-preview" src="${esc(previewUrl)}" alt="Selected poster to compare with recognized text" />`:'';
 app.innerHTML=shell(`<section class="page"><p class="eyebrow">REVIEW POSTER</p><h1>Poster review</h1><p class="lead">Confirm the extracted details before saving. Poster location and photo GPS stay separate.</p>${preview}<label class="field"><span>Phone number</span><input data-testid="poster-phone" value="${esc(draft.phone||'')}" inputmode="tel" /></label><div class="capture-field location-field"><label for="poster-location">Poster says area / location</label><div class="location-input-row"><input id="poster-location" data-testid="poster-location" value="${esc(draft.posterLocation||'')}" role="combobox" aria-autocomplete="list" aria-controls="poster-location-options" aria-expanded="false" autocomplete="off" /><button class="pin-location-button" type="button" data-testid="pin-poster-location">☆ Pin area</button></div><div class="location-options" id="poster-location-options" role="listbox" aria-label="Area suggestions" hidden></div></div><label class="field"><span>Recognized poster text</span><textarea rows="5" data-testid="poster-review-text">${esc(draft.ocrText||'')}</textarea></label><div class="placeholder-card"><strong>Original image</strong><p>${draft.imageBlob?`${esc(draft.imageName||'poster-image')} · saved locally with this lead`:'No image attached; text-only lead.'}</p><strong>Photo taken at</strong><p data-testid="capture-location">${draft.captureLocation?esc(draft.captureLocation):'Not captured. GPS is optional.'}</p></div><div class="page-actions"><button class="button" type="button" data-testid="get-capture-location">Use current location once</button><button class="button primary" type="button" data-testid="save-poster-lead">Save poster lead</button></div><p class="lead" data-testid="poster-review-status"></p></section>`,'');
 const phoneInput=document.querySelector('[data-testid="poster-phone"]');
 if(draft.phoneNeedsReview){
  phoneInput?.closest('.field')?.insertAdjacentHTML('afterend','<div class="capture-error" id="poster-phone-warning" data-testid="poster-phone-warning" role="alert">Some phone characters were unclear. Compare the number with the photo. <button class="text-button" type="button" data-testid="confirm-poster-phone">Number matches photo</button></div>');
 }
 if(draft.phoneNeedsReview)phoneInput?.setAttribute('aria-describedby','poster-phone-warning');
 const confirmPhone=()=>{
  draft.phoneNeedsReview=false;
  phoneInput?.removeAttribute('aria-describedby');
  document.getElementById('poster-phone-warning')?.remove();
 };
 phoneInput?.addEventListener('input',confirmPhone);
 document.querySelector('[data-testid="confirm-poster-phone"]')?.addEventListener('click',confirmPhone);
 document.querySelector('[data-testid="poster-review-status"]')?.setAttribute('role','status');
 document.querySelector('[data-testid="poster-review-status"]')?.setAttribute('aria-live','polite');
 bindShell();
 window.PropertyAssistantLocations?.bindTypeahead(document.querySelector('[data-testid="poster-location"]'),{repository:repo,list:document.getElementById('poster-location-options'),pinButton:document.querySelector('[data-testid="pin-poster-location"]')});
 document.querySelector('[data-testid="get-capture-location"]').addEventListener('click',captureGpsOnce);
 document.querySelector('[data-testid="save-poster-lead"]').addEventListener('click',saveLead);
}
function captureGpsOnce(){
 const status=document.querySelector('[data-testid="poster-review-status"]');
 if(!navigator.geolocation){status.textContent='Location is unavailable. You can save without GPS.';return;}
 syncReviewFieldsIntoDraft();
 status.textContent='Getting location once…';
 navigator.geolocation.getCurrentPosition(pos=>{if(route()!=='poster-review')return;syncReviewFieldsIntoDraft();draft.captureLocation=JSON.stringify({lat:Number(pos.coords.latitude.toFixed(6)),lng:Number(pos.coords.longitude.toFixed(6))});renderReview();},()=>{if(route()==='poster-review')status.textContent='Location permission was not available. You can save without GPS.';},{enableHighAccuracy:false,maximumAge:0,timeout:5000});
}
function syncReviewFieldsIntoDraft(){
 const phone=document.querySelector('[data-testid="poster-phone"]');const location=document.querySelector('[data-testid="poster-location"]');const text=document.querySelector('[data-testid="poster-review-text"]');
 if(phone)draft.phone=phone.value;if(location)draft.posterLocation=location.value.trim()||null;if(text)draft.ocrText=text.value;
}
async function saveLead(){
 const status=document.querySelector('[data-testid="poster-review-status"]'); const phone=document.querySelector('[data-testid="poster-phone"]').value.replace(/\D/g,'');
 if(draft.phoneNeedsReview){status.textContent='Confirm that the recovered phone number matches the poster before saving.';return;}
 if(phone.length!==10||!/^[6-9]/.test(phone)){status.textContent='Enter a valid Indian 10-digit mobile number before saving.';return;}
 const posterLocation=document.querySelector('[data-testid="poster-location"]').value.trim()||null;
 const text=document.querySelector('[data-testid="poster-review-text"]').value.trim();
 const button=document.querySelector('[data-testid="save-poster-lead"]');button.disabled=true;status.textContent='Saving locally…';
 let imageRef=null;
 try{
  if(draft.imageBlob){
   imageRef=await window.PropertyAssistantPosterImages.save(draft.imageBlob,{name:draft.imageName,createdAt:draft.capturedAt||new Date().toISOString()});
  }
  const saved=repo.transact((tx)=>{
   const lead=tx.create('posterLeads',{phone,imageRef,posterLocation,captureLocation:draft.captureLocation,capturedAt:draft.capturedAt||new Date().toISOString(),ocrText:text});
   const followUp=tx.create('followUps',{dueAt:new Date().toISOString(),status:'open',title:`Review poster lead ${phone}`,posterLeadId:lead.id});
   return {lead,followUp};
  });
  draft={...draft,leadId:saved.lead.id,phone,posterLocation,ocrText:text,imageRef};location.hash=`#/poster-lead?id=${encodeURIComponent(saved.lead.id)}`;
 }catch(error){
  if(imageRef){try{await window.PropertyAssistantPosterImages.remove(imageRef);}catch(_){} }
  status.textContent=error.message||'Poster lead could not be saved.';button.disabled=false;
 }
}
function renderLead(){
 const id=new URLSearchParams(location.hash.split('?')[1]||'').get('id')||draft.leadId; const lead=id?repo.get('posterLeads',id):null;
 if(!lead){app.innerHTML=shell(`<section class="page"><h1>Poster lead not found</h1><div class="page-actions"><button class="button" data-route="poster">Scan another poster</button></div></section>`,'');bindShell();return;}
 app.innerHTML=shell(`<section class="page"><p class="eyebrow">POSTER LEAD</p><h1>Poster lead</h1><div class="placeholder-card"><strong>Phone</strong><p data-testid="saved-poster-phone">${esc(lead.phone)}</p><strong>Original image</strong><p data-testid="saved-poster-image">${lead.imageRef?'Saved locally':'No image attached'}</p><strong>Poster says location</strong><p>${esc(lead.posterLocation||'Not found')}</p><strong>Photo taken at</strong><p>${esc(lead.captureLocation||'GPS not captured')}</p></div><div class="page-actions"><button class="button primary" data-route="followups">View follow-up</button><button class="button" data-route="poster">Scan another poster</button></div></section>`,'');bindShell();
}
function bindShell(){document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',()=>{location.hash=`#/${el.dataset.route}`;}));}
function owned(){const r=route();if(r==='poster')renderPoster();else if(r==='poster-review')renderReview();else if(r==='poster-lead')renderLead();}
window.addEventListener('hashchange',()=>{if(route()!=='poster')ocrGeneration+=1;if(route()!=='poster-review')clearPreview();setTimeout(owned,0);});window.addEventListener('DOMContentLoaded',()=>setTimeout(owned,0));
})();
