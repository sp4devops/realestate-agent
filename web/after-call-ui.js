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
 document.querySelector('[data-testid="use-recent-number"]').addEventListener('click',async()=>{const status=document.querySelector('[data-testid="recap-status"]');status.textContent='Checking only permitted recent-number sources…';try{const number=await comm.recentNumber();if(number){document.querySelector('[data-testid="recap-phone"]').value=number;status.textContent='Recent number filled.';}else status.textContent='Recent number is not available on this platform. Enter it manually if needed.';}catch(_){status.textContent='Recent number could not be read. Enter it manually if needed.';}});
 document.querySelector('[data-testid="save-call-recap"]').addEventListener('click',saveRecap);
 document.querySelector('[data-testid="skip-call-recap"]').addEventListener('click',()=>{core.clearPendingAfterCall(localStorage);location.hash='#/home';});
}
function saveRecap(){
 const status=document.querySelector('[data-testid="recap-status"]');
 const button=document.querySelector('[data-testid="save-call-recap"]');
 button.disabled=true;
 try{
  const phone=document.querySelector('[data-testid="recap-phone"]').value;
  const person=core.findPersonByPhone(repo,phone);
  const records=core.buildRecords({phone,summary:document.querySelector('[data-testid="recap-summary"]').value,dueAt:document.querySelector('[data-testid="recap-due"]').value,personId:person?.id||null});
  const saved=repo.transact((tx)=>{
    const interaction=tx.create('interactions',records.interaction);
    const followUp=records.followUp?tx.create('followUps',records.followUp):null;
    const requirement=person&&interaction.learnedPreferences?.length?tx.list('requirements').filter(item=>item.personId===person.id).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))[0]:null;
    if(requirement) tx.update('requirements',requirement.id,{preferences:[...new Set([...(requirement.preferences || []),...interaction.learnedPreferences])],preferenceEvidence:[...new Set([...(requirement.preferenceEvidence || []),interaction.summary])]});
    return {interaction,followUp,requirement};
  });
  if(saved.requirement)window.PropertyAssistantMatching.sync(repo);
  core.clearPendingAfterCall(localStorage);
  status.textContent=saved.followUp?'Recap and follow-up saved locally.':'Recap saved locally.';
  location.hash='#/followups';
 }catch(error){status.textContent=error.message||'Could not save recap.';button.disabled=false;}
}
function resolvePhone(f){return core.resolveFollowUpPhone(repo,f);}
function shareText(f){const phone=resolvePhone(f);return `${f.title}${phone?` · ${phone}`:''} · ${new Date(f.dueAt).toLocaleString()}`;}
function followUpContext(f){
 const person=f.personId?repo.get('people',f.personId):null;
 const property=f.propertyId?repo.get('properties',f.propertyId):null;
 return {person,property,phone:resolvePhone(f)};
}
function followUpCard(f){
 const {person,property,phone}=followUpContext(f);
 const overdue=f.status==='open'&&new Date(f.dueAt)<new Date();
 const actions=f.status==='open'
  ? `<button class="button done-button" data-followup-action="done" data-id="${esc(f.id)}">${icon('check')} Done</button><button class="button subtle-button" data-followup-action="cancel" data-id="${esc(f.id)}">Cancel</button>`
  : `<button class="button" data-followup-action="reopen" data-id="${esc(f.id)}">Reopen</button>`;
 const comms=phone?`<button class="button" data-comm="call" data-id="${esc(f.id)}">${icon('phone')} Call</button><button class="button" data-comm="whatsapp" data-id="${esc(f.id)}">WhatsApp</button><button class="button subtle-button" data-comm="share" data-id="${esc(f.id)}">Share</button>`:'';
 const context=property?propertyTitle(property):person?`${(person.roles || [person.role]).map(titleCase).join(' · ')} · ${phone || 'phone pending'}`:'Saved local reminder';
 return `<article class="followup-card" data-testid="followup-card" data-status="${esc(f.status)}"><div class="followup-card-head"><span class="avatar ${property?'gold':''}">${property?icon('properties'):initials(person?.name || f.title)}</span><div><h2>${esc(person?.name || f.title)}</h2><p>${esc(context)}</p></div><span class="priority-badge ${overdue?'high':'medium'}">${overdue?'High':'Planned'}</span></div>${person?`<p class="followup-reason">${esc(f.title)}</p>`:''}<div class="followup-time">${icon('followups','inline-icon')}<strong>${esc(new Date(f.dueAt).toLocaleString())}</strong></div><div class="followup-actions">${comms}${actions}</div></article>`;
}
function renderFollowUps(){
 const items=repo.list('followUps').sort((a,b)=>new Date(a.dueAt)-new Date(b.dueAt));
 const endToday=new Date();endToday.setHours(23,59,59,999);
 const today=items.filter(item=>item.status==='open'&&new Date(item.dueAt)<=endToday);
 const upcoming=items.filter(item=>item.status==='open'&&new Date(item.dueAt)>endToday);
 const completed=items.filter(item=>item.status!=='open');
 const staleProperties=repo.list('properties').filter(property=>Date.now()-new Date(property.updatedAt || property.createdAt).getTime()>90*24*60*60*1000).length;
 const copy=t().ui;
 const empty=`<div class="empty-state">${icon('followups')}<p>${copy.noFollowups}</p><button class="button" type="button" data-route="after-call">Add a recap</button></div>`;
 const sections=items.length?`${today.length?`<section class="followup-group"><h2>${copy.today} <span>${today.length}</span></h2><div class="followup-stack">${today.map(followUpCard).join('')}</div></section>`:''}${upcoming.length?`<section class="followup-group"><h2>${copy.upcoming} <span>${upcoming.length}</span></h2><div class="followup-stack">${upcoming.map(followUpCard).join('')}</div></section>`:''}${completed.length?`<section class="followup-group"><h2>${copy.completed} <span>${completed.length}</span></h2><div class="followup-stack completed">${completed.map(followUpCard).join('')}</div></section>`:''}`:empty;
 const propertyCount=repo.list('properties').length;
 const insightTitle=staleProperties?`${staleProperties} listing${staleProperties===1?'':'s'} need a price refresh`:propertyCount?'No stale asking prices found yet':'Capture a property to start price checks';
 const insightCopy=staleProperties?'Reconfirm old asking prices before sharing them.':propertyCount?'Keep recording price changes after owner calls.':'Property Assistant will flag listings that need reconfirmation.';
 app.innerHTML=shell(`<section class="screen-page followups-page"><div class="screen-heading"><div><h1>${copy.followups}</h1><p>${items.filter(item=>item.status==='open').length} pending · ${copy.followupsHint}</p></div><button class="icon-button" type="button" data-route="after-call" aria-label="Add follow-up">${icon('plus')}</button></div><div data-testid="followup-list">${sections}</div><aside class="insight-card">${icon('sparkles','insight-icon')}<div><small>INSIGHT FOR YOU</small><strong>${insightTitle}</strong><p>${insightCopy}</p></div><button class="button" type="button" data-route="properties">Review now ${icon('arrow')}</button></aside><p class="lead action-status" data-testid="followup-status"></p></section>`,'followups');
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
