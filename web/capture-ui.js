(function () {
  'use strict';

  const DRAFT_KEY = 'pa.captureDraft';
  const app = document.getElementById('app');

  function currentRoute(){ return (location.hash.replace(/^#\/?/,'') || '').split('?')[0]; }
  function esc(value){ return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function money(value){ return value == null || value === '' ? '' : String(value); }
  function field(label,name,value,type='text'){
    return `<label class="capture-field"><span>${label}</span><input data-testid="field-${name}" name="${name}" type="${type}" value="${esc(value)}" /></label>`;
  }

  function renderType(){
    app.innerHTML = shell(`<section class="page"><p class="eyebrow">TYPE & SAVE</p><h1>Type & Save</h1><p class="lead">Tell Property Assistant naturally about one buyer, tenant, owner, or property. Parsing works locally without a model.</p><label class="capture-field"><span>Business note</span><textarea data-testid="capture-text" rows="7" placeholder="Example: Arun wants land in Erode, budget 25 lakh, phone 98765 43210"></textarea></label><div class="page-actions"><button type="button" class="button primary" data-testid="analyze-capture">Review details</button><button type="button" class="button" data-route="home">Cancel</button></div><p class="capture-error" data-testid="capture-error" hidden></p></section>`, '');
    bindRouteButtons();
    document.querySelector('[data-testid="analyze-capture"]').addEventListener('click',()=>{
      const text=document.querySelector('[data-testid="capture-text"]').value;
      const parsed=window.PropertyAssistantCapture.parse(text);
      if(!parsed.ok){ const error=document.querySelector('[data-testid="capture-error"]'); error.hidden=false; error.textContent=parsed.error; return; }
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(parsed));
      location.hash='#/review';
    });
  }

  function reviewBody(parsed){
    const uncertain = parsed.uncertain.length ? `<div class="placeholder-card"><strong>Check these details</strong><p data-testid="uncertain-fields">${esc(parsed.uncertain.join(', '))}</p></div>` : `<div class="placeholder-card"><strong>Looks complete</strong><p>No low-confidence fields were detected by the local rules.</p></div>`;
    if(parsed.kind==='property'){
      return `${uncertain}<form data-testid="review-form">${field('Property type','propertyType',parsed.property.propertyType)}${field('Locality','locality',parsed.property.locality)}${field('Intent','intent',parsed.property.intent)}${field('Price','price',money(parsed.property.price),'number')}<div class="page-actions"><button class="button primary" type="submit" data-testid="save-capture">Save property</button><button class="button" type="button" data-route="type">Edit note</button></div></form>`;
    }
    return `${uncertain}<form data-testid="review-form">${field('Name','name',parsed.person.name)}${field('Primary phone','primaryPhone',parsed.person.primaryPhone)}${field('Property type','propertyType',parsed.requirement.propertyType)}${field('Locality','locality',parsed.requirement.locations[0] || '')}${field('Intent','intent',parsed.requirement.intent)}${field('Budget up to','budgetMax',money(parsed.requirement.budgetMax),'number')}<div class="page-actions"><button class="button primary" type="submit" data-testid="save-capture">Save buyer</button><button class="button" type="button" data-route="type">Edit note</button></div></form>`;
  }

  function renderReview(){
    const raw=sessionStorage.getItem(DRAFT_KEY);
    if(!raw){ location.hash='#/type'; return; }
    const parsed=JSON.parse(raw);
    app.innerHTML=shell(`<section class="page"><p class="eyebrow">REVIEW BEFORE SAVE</p><h1>Check what I understood</h1><p class="lead">Correct anything before it becomes part of your local business memory.</p>${reviewBody(parsed)}<p class="capture-error" data-testid="review-error" hidden></p></section>`, '');
    bindRouteButtons();
    document.querySelector('[data-testid="review-form"]').addEventListener('submit',(event)=>{
      event.preventDefault();
      const form=new FormData(event.currentTarget);
      try {
        if(parsed.kind==='property') saveProperty(form);
        else saveRequirement(form);
      } catch(error){ const el=document.querySelector('[data-testid="review-error"]'); el.hidden=false; el.textContent=error.message; }
    });
  }

  function saveRequirement(form){
    const repo=window.__PA_REPOSITORY__;
    const person=repo.create('people',{ name:String(form.get('name')||'').trim(), role:'buyer', primaryPhone:String(form.get('primaryPhone')||'').trim(), alternatePhones:[] });
    repo.create('requirements',{ personId:person.id, intent:String(form.get('intent')||'buy'), propertyType:String(form.get('propertyType')||'').trim(), locations:[String(form.get('locality')||'').trim()].filter(Boolean), budgetMin:null, budgetMax:numberOrNull(form.get('budgetMax')) });
    sessionStorage.removeItem(DRAFT_KEY);
    location.hash=`#/person?id=${encodeURIComponent(person.id)}`;
  }

  function saveProperty(form){
    const repo=window.__PA_REPOSITORY__;
    const property=repo.create('properties',{ ownerPersonId:null, intent:String(form.get('intent')||'sale'), propertyType:String(form.get('propertyType')||'').trim(), locality:String(form.get('locality')||'').trim(), price:numberOrNull(form.get('price')) });
    sessionStorage.removeItem(DRAFT_KEY);
    location.hash=`#/property?id=${encodeURIComponent(property.id)}`;
  }

  function numberOrNull(value){ const text=String(value ?? '').trim(); return text==='' ? null : Number(text); }
  function bindRouteButtons(){ document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',()=>{ location.hash=`#/${el.dataset.route}`; })); }
  function renderOwnedRoute(){ const route=currentRoute(); if(route==='type') renderType(); else if(route==='review') renderReview(); }

  window.addEventListener('hashchange',()=>setTimeout(renderOwnedRoute,0));
  window.addEventListener('DOMContentLoaded',()=>setTimeout(renderOwnedRoute,0));
})();
