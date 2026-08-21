(function(){
'use strict';
const repo=window.__PA_REPOSITORY__;
const core=window.PropertyAssistantAfterCall;
const comm=core.createCommunicationService(window);
function route(){return (location.hash.replace(/^#\/?/,'')||'').split('?')[0];}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function bindShell(){document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',()=>{location.hash=`#/${el.dataset.route}`;}));}
function pending(){return core.readPendingAfterCall(localStorage);}
function renderAfterCall(){
 const p=pending();
 app.innerHTML=shell(`<section class="page"><p class="eyebrow">AFTER CALL</p><h1>After-call recap</h1><p class="lead">Save what changed after a call. Property Assistant does not record the call.</p>${p?`<div class="card opportunity" data-testid="after-call-return-prompt"><div><strong>Back from a call action?</strong><p>Add a quick recap while it is fresh. The number below comes only from the action you launched in Property Assistant.</p></div></div>`:''}<label class="field"><span>Phone number</span><input data-testid="recap-phone" inputmode="tel" value="${esc(p?.phone||'')}" placeholder="Optional" /></label><div class="page-actions"><button class="button" type="button" data-testid="use-recent-number">Use recent number if available</button></div><label class="field"><span>What changed?</span><textarea rows="5" data-testid="recap-summary" placeholder="Example: Wants a 2BHK near Erode, budget up to 25 lakh."></textarea></label><label class="field"><span>Follow up at</span><input type="datetime-local" data-testid="recap-due" /></label><div class="page-actions"><button class="button primary" type="button" data-testid="save-call-recap">Save recap</button><button class="button" type="button" data-testid="skip-call-recap">Skip</button></div><p class="lead" data-testid="recap-status"></p></section>`,'');
 bindShell();
 document.querySelector('[data-testid="use-recent-number"]').addEventListener('click',async()=>{const status=document.querySelector('[data-testid="recap-status"]');status.textContent='Checking only permitted recent-number sources…';const number=await comm.recentNumber();if(number){document.querySelector('[data-testid="recap-phone"]').value=number;status.textContent='Recent number filled.';}else status.textContent='Recent number is not available on this platform. Enter it manually if needed.';});
 document.querySelector('[data-testid="save-call-recap"]').addEventListener('click',saveRecap);
 document.querySelector('[data-testid="skip-call-recap"]').addEventListener('click',()=>{core.clearPendingAfterCall(localStorage);location.hash='#/home';});
}
function saveRecap(){
 const status=document.querySelector('[data-testid="recap-status"]');
 try{
  const phone=document.querySelector('[data-testid="recap-phone"]').value;
  const person=core.findPersonByPhone(repo,phone);
  const records=core.buildRecords({phone,summary:document.querySelector('[data-testid="recap-summary"]').value,dueAt:document.querySelector('[data-testid="recap-due"]').value,personId:person?.id||null});
  const interaction=repo.create('interactions',records.interaction);
  let followUp=null;if(records.followUp)followUp=repo.create('followUps',records.followUp);
  core.clearPendingAfterCall(localStorage);
  status.textContent=followUp?'Recap and follow-up saved locally.':'Recap saved locally.';
  location.hash='#/followups';
 }catch(error){status.textContent=error.message||'Could not save recap.';}
}
function resolvePhone(f){return core.resolveFollowUpPhone(repo,f);}
function shareText(f){const phone=resolvePhone(f);return `${f.title}${phone?` · ${phone}`:''} · ${new Date(f.dueAt).toLocaleString()}`;}
function renderFollowUps(){
 const items=repo.list('followUps').sort((a,b)=>new Date(a.dueAt)-new Date(b.dueAt));
 const cards=items.map(f=>{const phone=resolvePhone(f);const actions=f.status==='open'?`<button class="button primary" data-followup-action="done" data-id="${esc(f.id)}">Done</button><button class="button" data-followup-action="cancel" data-id="${esc(f.id)}">Cancel</button>`:`<button class="button" data-followup-action="reopen" data-id="${esc(f.id)}">Reopen</button>`;const comms=phone?`<button class="button" data-comm="call" data-id="${esc(f.id)}">Call</button><button class="button" data-comm="whatsapp" data-id="${esc(f.id)}">WhatsApp</button><button class="button" data-comm="share" data-id="${esc(f.id)}">Share</button>`:'';return `<article class="card person-card" data-testid="followup-card" data-status="${esc(f.status)}"><div><strong>${esc(f.title)}</strong><p>${esc(new Date(f.dueAt).toLocaleString())} · ${esc(f.status)}</p>${phone?`<p>${esc(phone)}</p>`:''}</div><div class="page-actions">${actions}${comms}</div></article>`;}).join('');
 app.innerHTML=shell(`<section class="page"><p class="eyebrow">NEXT ACTIONS</p><h1>Follow-ups</h1><p class="lead">Keep only useful next actions. Mark them done, cancel them, or reopen them later.</p><div class="choice-list" data-testid="followup-list">${cards||'<div class="placeholder-card">No follow-ups yet.</div>'}</div><p class="lead" data-testid="followup-status"></p></section>`,'');
 bindShell();
 document.querySelectorAll('[data-followup-action]').forEach(btn=>btn.addEventListener('click',()=>{try{const f=repo.get('followUps',btn.dataset.id);repo.update('followUps',f.id,{status:core.transition(f.status,btn.dataset.followupAction)});renderFollowUps();}catch(error){document.querySelector('[data-testid="followup-status"]').textContent=error.message;}}));
 document.querySelectorAll('[data-comm]').forEach(btn=>btn.addEventListener('click',async()=>{const f=repo.get('followUps',btn.dataset.id);const phone=resolvePhone(f);const status=document.querySelector('[data-testid="followup-status"]');try{if(btn.dataset.comm==='call')comm.call(phone,f.personId||null);else if(btn.dataset.comm==='whatsapp')comm.whatsapp(phone,`Following up: ${f.title}`);else{const mode=await comm.share(shareText(f));status.textContent=mode==='unavailable'?'Sharing is unavailable on this device.':mode==='clipboard'?'Follow-up copied to clipboard.':'Share action opened.';}}catch(error){status.textContent=error.message||'Action could not be opened.';}}));
}
function maybeOfferAfterCall(){
 if(!pending()||route()==='after-call')return;
 const main=document.querySelector('main');if(!main||document.querySelector('[data-testid="after-call-banner"]'))return;
 const banner=document.createElement('div');banner.className='card opportunity';banner.dataset.testid='after-call-banner';banner.innerHTML='<div><strong>Add a call recap?</strong><p>You returned after launching a Call action. Save what changed without recording the call.</p></div><button class="button primary" type="button">Add recap</button><button class="button" type="button" data-dismiss>Not now</button>';
 main.prepend(banner);banner.querySelector('.primary').addEventListener('click',()=>{location.hash='#/after-call';});banner.querySelector('[data-dismiss]').addEventListener('click',()=>{core.clearPendingAfterCall(localStorage);banner.remove();});
}
function owned(){const r=route();if(r==='after-call')renderAfterCall();else if(r==='followups')renderFollowUps();else setTimeout(maybeOfferAfterCall,0);}
window.addEventListener('hashchange',()=>setTimeout(owned,0));window.addEventListener('focus',()=>setTimeout(maybeOfferAfterCall,0));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(maybeOfferAfterCall,0);});window.addEventListener('DOMContentLoaded',()=>setTimeout(owned,0));
})();
