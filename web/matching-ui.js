(function () {
  'use strict';

  const app=document.getElementById('app');
  const repo=window.__PA_REPOSITORY__;
  const communication=window.PropertyAssistantAfterCall.createCommunicationService(window);

  function currentRoute(){ return (location.hash.replace(/^#\/?/,'') || '').split('?')[0]; }
  function params(){ return new URLSearchParams(location.hash.split('?')[1] || ''); }
  function esc(value){ return String(value ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function money(value,monthly=false){ return typeof formatMoney==='function' ? formatMoney(value,monthly) : value == null ? 'Price not set' : `₹${Number(value).toLocaleString('en-IN')}`; }
  function priceLabel(property){
    if(typeof propertyPriceLabel==='function') return propertyPriceLabel(property);
    const suffix={per_acre:' / acre',per_cent:' / cent',per_sqft:' / sqft',per_month:' / month'}[property?.priceBasis] || (property?.intent==='rent'?' / month':'');
    return `${money(property?.price)}${suffix}`;
  }

  function syncMatches(){
    return window.PropertyAssistantMatching.sync(repo);
  }

  function resolve(match){
    const requirement=repo.get('requirements',match.requirementId);
    const property=repo.get('properties',match.propertyId);
    const buyer=requirement ? repo.get('people',requirement.personId) : null;
    const owner=property && property.ownerPersonId ? repo.get('people',property.ownerPersonId) : null;
    return {requirement,property,buyer,owner};
  }

  function renderMatches(){
    const allMatches=syncMatches();
    const requirementFilter=params().get('requirement'); const propertyFilter=params().get('property');
    const matches=allMatches.filter(match=>(!requirementFilter||match.requirementId===requirementFilter)&&(!propertyFilter||match.propertyId===propertyFilter));
    const cards=matches.map(match=>{
      const {property,buyer,owner,requirement}=resolve(match);
      if(!property || !buyer) return '';
      const reasons=match.reasons.slice(1).map(reason=>`<span>${icon('check','inline-icon')}${esc(reason)}</span>`).join('');
      const requirementText=`${String(requirement.propertyType || 'property').toUpperCase()} ${String(requirement.intent || '').toUpperCase()} · ${esc(requirement.locations?.join(' / ') || 'Any location')} · ${requirement.budgetMax==null?'Budget pending':money(requirement.budgetMax)}`;
      const label=window.PropertyAssistantMatching.labelForScore(match.score);
      return `<article class="smart-match-card" data-testid="match-card" data-score="${match.score}" data-reasons="${esc(match.reasons.join(' '))}"><div class="match-person-head"><span class="avatar">${initials(buyer.name)}</span><div><h2>${esc(buyer.name)} <span class="status-badge new">Active</span></h2><p>${requirementText}</p></div><div class="match-score"><strong>${match.score}%</strong><small>${label}<span class="sr-only"> · Match score ${match.score}</span></small></div></div><div class="matched-property-panel"><div class="property-visual ${esc(property.propertyType)}">${icon(property.propertyType==='land'?'pin':'properties','property-visual-icon')}</div><div><h3>${esc(propertyTitle(property))}</h3><p>${icon('pin','inline-icon')}${esc(property.locality)}</p><strong class="property-price">${priceLabel(property)}</strong><small>${sizeLabel(property.size)} · ${esc(owner?.name || 'Owner pending')}</small><div class="reason-chips">${reasons}</div></div></div><div class="match-actions">${owner?.primaryPhone?`<button class="button primary" type="button" data-match-comm="call" data-id="${esc(match.id)}">${icon('phone')} Call owner</button>`:''}<button class="button" type="button" data-match-comm="share" data-id="${esc(match.id)}">Share</button><button type="button" class="button" data-match-id="${esc(match.id)}">Why this match?</button><button class="button" type="button" data-followup-match="${esc(match.id)}">${icon('followups')} Follow up</button></div></article>`;
    }).join('');
    const copy=t().ui;
    const immediate=params().get('new')==='1'?`<div class="ai-memory-note" data-testid="automatic-match-summary"><span>${icon('sparkles')}</span><div><strong>${matches.length} possible match${matches.length===1?'':'es'} found immediately</strong><p>Saved locally and ranked using location, total price, size and remembered preferences.</p></div></div>`:'';
    app.innerHTML=shell(`<section class="screen-page matches-page"><div class="screen-heading"><div><h1>${copy.matches}</h1><p>${copy.matchesHint}</p></div></div>${immediate}<div class="filter-chips" role="group" aria-label="Match filters"><button class="filter-chip active" type="button" data-match-filter="best">${icon('sparkles')} Best</button><button class="filter-chip" type="button" data-match-filter="budget">₹ Near budget</button><button class="filter-chip" type="button" data-match-filter="nearby">${icon('pin')} Nearby</button></div><div class="match-stack" data-testid="matches-list">${cards || `<div class="empty-state">${icon('matches')}<p>${copy.noMatches}</p><button class="button primary" type="button" data-route="type">Capture a note</button></div>`}</div><p class="lead action-status" data-testid="matches-action-status"></p></section>`,'matches');
    bind();
  }

  function renderMatch(){
    syncMatches();
    const id=params().get('id') || '';
    const match=id ? repo.get('matches',id) : null;
    if(!match){ app.innerHTML=shell(`<section class="page"><h1>Match not found</h1><p class="lead">This match no longer qualifies after the latest changes.</p><button class="button" data-route="matches">Back to Matches</button></section>`,'matches'); bind(); return; }
    const {property,buyer,owner}=resolve(match);
    if(!property || !buyer){ app.innerHTML=shell(`<section class="page"><h1>Match not found</h1><p class="lead">A linked local record is missing.</p><button class="button" data-route="matches">Back to Matches</button></section>`,'matches'); bind(); return; }
    const reasons=match.reasons.map(reason=>`<li>${esc(reason)}</li>`).join('');
    app.innerHTML=shell(`<section class="screen-page detail-page"><p class="eyebrow">WHY THIS MATCH</p><div class="match-detail-heading"><div><h1 data-testid="match-title">${esc(buyer.name)} ↔ ${esc(property.propertyType)} in ${esc(property.locality)}</h1><p>Demand and supply, saved on this phone.</p></div><div class="match-score large"><strong>${match.score}%</strong><small>${window.PropertyAssistantMatching.labelForScore(match.score)}</small></div></div><div class="detail-grid"><section class="detail-panel"><h2>Requirement</h2><strong>${esc(buyer.name)}</strong><p>${esc(buyer.primaryPhone || 'Phone pending')}</p></section><section class="detail-panel"><h2>Property owner</h2><strong>${esc(owner?.name || 'Unknown')}</strong><p>${esc(owner?.primaryPhone || 'Phone pending')}</p></section></div><section class="detail-panel"><h2>Property</h2><div class="property-detail-inline"><div class="property-visual ${esc(property.propertyType)}">${icon(property.propertyType==='land'?'pin':'properties','property-visual-icon')}</div><div><strong>${esc(propertyTitle(property))}</strong><p>${priceLabel(property)} · ${sizeLabel(property.size)}</p></div></div></section><section class="detail-panel"><h2>Why it matched</h2><ul class="match-reason-list" data-testid="match-reasons">${reasons}</ul></section><div class="match-actions">${owner?.primaryPhone?`<button class="button primary" type="button" data-match-comm="call" data-id="${esc(match.id)}">${icon('phone')} Call owner</button><button class="button" type="button" data-match-comm="whatsapp" data-id="${esc(match.id)}">WhatsApp</button>`:''}<button class="button" type="button" data-match-comm="share" data-id="${esc(match.id)}">Share</button><button class="button" type="button" data-followup-match="${esc(match.id)}">${icon('followups')} Follow up</button><button class="button" type="button" data-route="matches">Back to Matches</button></div><p class="action-status" data-testid="match-action-status" hidden></p></section>`,'matches');
    bind();
  }

  function createFollowup(matchIdValue){
    const match=repo.get('matches',matchIdValue); if(!match) return;
    const {property,buyer}=resolve(match); if(!property || !buyer) return;
    const existing=repo.list('followUps').find(item=>item.status==='open' && item.personId===buyer.id && item.propertyId===property.id);
    const el=document.querySelector('[data-testid="match-action-status"]') || document.querySelector('[data-testid="matches-action-status"]');
    if(existing){ if(el){el.hidden=false;el.textContent='An open follow-up already exists for this match.';} return existing; }
    const due=new Date(Date.now()+24*60*60*1000).toISOString();
    const created=repo.create('followUps',{dueAt:due,status:'open',title:`Follow up: ${buyer.name} ↔ ${property.propertyType} in ${property.locality}`,personId:buyer.id,propertyId:property.id});
    if(el){el.hidden=false;el.textContent='Follow-up saved locally.';}
    return created;
  }

  function bind(){
    document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',()=>{location.hash=`#/${el.dataset.route}`;}));
    document.querySelectorAll('[data-match-id]').forEach(el=>el.addEventListener('click',()=>{location.hash=`#/match?id=${encodeURIComponent(el.dataset.matchId)}`;}));
    document.querySelectorAll('[data-followup-match]').forEach(el=>el.addEventListener('click',()=>{try{createFollowup(el.dataset.followupMatch);}catch(error){const status=document.querySelector('[data-testid="match-action-status"]');if(status){status.hidden=false;status.textContent=error.message||'Follow-up could not be saved.';}}}));
    document.querySelectorAll('[data-match-filter]').forEach(button=>button.addEventListener('click',()=>{
      const filter=button.dataset.matchFilter;
      document.querySelectorAll('[data-match-filter]').forEach(item=>item.classList.toggle('active',item===button));
      document.querySelectorAll('[data-testid="match-card"]').forEach(card=>{
        const reasons=String(card.dataset.reasons || '').toLowerCase();
        card.hidden=filter==='budget'&&!reasons.includes('budget') || filter==='nearby'&&!reasons.includes('nearby');
      });
    }));
    document.querySelectorAll('[data-match-comm]').forEach(button=>button.addEventListener('click',async()=>{
      const match=repo.get('matches',button.dataset.id); if(!match)return;
      const {property,buyer,owner}=resolve(match);
      const status=document.querySelector('[data-testid="match-action-status"]') || document.querySelector('[data-testid="matches-action-status"]');
      try{
        if(button.dataset.matchComm==='call') communication.call(owner?.primaryPhone,owner?.id || null);
        else if(button.dataset.matchComm==='whatsapp') communication.whatsapp(owner?.primaryPhone,`Property match for ${buyer?.name}: ${propertyTitle(property)}`);
        else {
          const mode=await communication.share(`${buyer?.name} ↔ ${propertyTitle(property)} · ${priceLabel(property)} · Match ${match.score}%`);
          if(status){ status.hidden=false; status.textContent=mode==='clipboard'?'Match copied to clipboard.':mode==='unavailable'?'Sharing is unavailable on this device.':'Share action opened.'; }
        }
      }catch(error){ if(status){ status.hidden=false; status.textContent=error.message || 'Action could not be opened.'; } }
    }));
  }

  function renderOwned(){ const route=currentRoute(); if(route==='matches') renderMatches(); else if(route==='match') renderMatch(); }
  window.addEventListener('hashchange',()=>setTimeout(renderOwned,0));
  window.addEventListener('DOMContentLoaded',()=>setTimeout(renderOwned,0));
})();
