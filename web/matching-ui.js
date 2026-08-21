(function () {
  'use strict';

  const app=document.getElementById('app');
  const repo=window.__PA_REPOSITORY__;

  function currentRoute(){ return (location.hash.replace(/^#\/?/,'') || '').split('?')[0]; }
  function params(){ return new URLSearchParams(location.hash.split('?')[1] || ''); }
  function esc(value){ return String(value ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function money(value){ return value == null ? 'Price not set' : `₹${Number(value).toLocaleString('en-IN')}`; }
  function matchId(requirementId,propertyId){ return `match-${requirementId}-${propertyId}`; }

  function syncMatches(){
    const ranked=window.PropertyAssistantMatching.rank(repo.list('requirements'),repo.list('properties'));
    const wanted=new Map(ranked.map(item=>[matchId(item.requirementId,item.propertyId),item]));
    const existing=repo.list('matches');
    for(const old of existing){
      const next=wanted.get(old.id);
      if(!next){ repo.remove('matches',old.id); continue; }
      if(old.score!==next.score || JSON.stringify(old.reasons)!==JSON.stringify(next.reasons)) repo.update('matches',old.id,next);
      wanted.delete(old.id);
    }
    for(const [id,item] of wanted) repo.create('matches',{id,...item});
    return repo.list('matches').sort((a,b)=>b.score-a.score);
  }

  function resolve(match){
    const requirement=repo.get('requirements',match.requirementId);
    const property=repo.get('properties',match.propertyId);
    const buyer=requirement ? repo.get('people',requirement.personId) : null;
    const owner=property && property.ownerPersonId ? repo.get('people',property.ownerPersonId) : null;
    return {requirement,property,buyer,owner};
  }

  function renderMatches(){
    const matches=syncMatches();
    const cards=matches.map(match=>{
      const {property,buyer}=resolve(match);
      if(!property || !buyer) return '';
      return `<article class="card opportunity" data-testid="match-card"><div><strong>${esc(buyer.name)} ↔ ${esc(property.propertyType)} in ${esc(property.locality)}</strong><p>${money(property.price)} · Match score ${match.score}</p><p>${esc(match.reasons.slice(0,2).join(' · '))}</p></div><button type="button" class="button primary" data-match-id="${esc(match.id)}">Why this match?</button></article>`;
    }).join('');
    app.innerHTML=shell(`<section class="page"><p class="eyebrow">MATCHING</p><h1>Matches</h1><p class="lead">Demand and supply are ranked locally with clear reasons. No AI model is required.</p><div class="choice-list" data-testid="matches-list">${cards || '<div class="placeholder-card">No useful matches yet.</div>'}</div></section>`,'matches');
    bind();
  }

  function renderMatch(){
    syncMatches();
    const id=params().get('id') || 'match-requirement-suresh-property-murugan';
    const match=repo.get('matches',id);
    if(!match){ app.innerHTML=shell(`<section class="page"><h1>Match not found</h1><p class="lead">This match no longer qualifies after the latest changes.</p><button class="button" data-route="matches">Back to Matches</button></section>`,'matches'); bind(); return; }
    const {property,buyer,owner}=resolve(match);
    const reasons=match.reasons.map(reason=>`<li>${esc(reason)}</li>`).join('');
    app.innerHTML=shell(`<section class="page"><p class="eyebrow">WHY THIS MATCH</p><h1 data-testid="match-title">${esc(buyer?.name || 'Buyer')} ↔ ${esc(property.propertyType)} in ${esc(property.locality)}</h1><p class="lead">Match score ${match.score} · ${money(property.price)}</p><div class="placeholder-card"><strong>Why it matched</strong><ul data-testid="match-reasons">${reasons}</ul></div><div class="placeholder-card"><strong>People</strong><p>Buyer: ${esc(buyer?.name || 'Unknown')} · ${esc(buyer?.primaryPhone || '')}</p><p>Owner: ${esc(owner?.name || 'Unknown')} · ${esc(owner?.primaryPhone || '')}</p></div><div class="page-actions"><button class="button primary" type="button" data-followup-match="${esc(match.id)}">Follow up</button><button class="button" type="button" data-route="matches">Back to Matches</button></div><p data-testid="match-action-status" hidden></p></section>`,'matches');
    bind();
  }

  function createFollowup(matchIdValue){
    const match=repo.get('matches',matchIdValue); if(!match) return;
    const {property,buyer}=resolve(match);
    const existing=repo.list('followUps').find(item=>item.status==='open' && item.personId===buyer?.id && item.propertyId===property?.id);
    const el=document.querySelector('[data-testid="match-action-status"]');
    if(existing){ if(el){el.hidden=false;el.textContent='An open follow-up already exists for this match.';} return existing; }
    const due=new Date(Date.now()+24*60*60*1000).toISOString();
    const created=repo.create('followUps',{dueAt:due,status:'open',title:`Follow up: ${buyer?.name || 'buyer'} ↔ ${property?.propertyType || 'property'} in ${property?.locality || ''}`,personId:buyer?.id || null,propertyId:property?.id || null});
    if(el){el.hidden=false;el.textContent='Follow-up saved locally.';}
    return created;
  }

  function bind(){
    document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',()=>{location.hash=`#/${el.dataset.route}`;}));
    document.querySelectorAll('[data-match-id]').forEach(el=>el.addEventListener('click',()=>{location.hash=`#/match?id=${encodeURIComponent(el.dataset.matchId)}`;}));
    document.querySelectorAll('[data-followup-match]').forEach(el=>el.addEventListener('click',()=>createFollowup(el.dataset.followupMatch)));
  }

  function renderOwned(){ const route=currentRoute(); if(route==='matches') renderMatches(); else if(route==='match') renderMatch(); }
  window.addEventListener('hashchange',()=>setTimeout(renderOwned,0));
  window.addEventListener('DOMContentLoaded',()=>setTimeout(renderOwned,0));
})();
