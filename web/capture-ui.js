(function () {
  'use strict';

  const DRAFT_KEY = 'pa.captureDraft';
  const app = document.getElementById('app');
  const extractor = window.PropertyAssistantCapture.createExtractor();
  const uncertaintyLabels = { locality:'Location', propertyType:'Property type', primaryPhone:'Primary phone', name:'Name', budgetMax:'Budget', price:'Price' };

  function currentRoute(){ return (location.hash.replace(/^#\/?/,'') || '').split('?')[0]; }
  function esc(value){ return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function money(value){ return value == null || value === '' ? '' : String(value); }
  function field(label,name,value,type='text'){
    return `<label class="capture-field"><span>${label}</span><input data-testid="field-${name}" name="${name}" type="${type}" value="${esc(value)}" /></label>`;
  }
  function sizeFields(size){
    if(!size) return '';
    return `<div class="field-row">${field('Size','sizeValue',size.value,'number')}${field('Unit','sizeUnit',size.unit)}</div>`;
  }

  function renderType(){
    app.innerHTML = shell(`<section class="page"><p class="eyebrow">TYPE & SAVE</p><h1>Type & Save</h1><p class="lead">Tell Property Assistant naturally about one buyer, tenant, owner, or property. Parsing works locally without a model.</p><label class="capture-field"><span>Business note</span><textarea data-testid="capture-text" rows="7" placeholder="Example: Arun wants 5 acre land in Perundurai, budget 25 lakh, phone 98765 43210"></textarea></label><div class="page-actions"><button type="button" class="button primary" data-testid="analyze-capture">Review details</button><button type="button" class="button" data-route="home">Cancel</button></div><p class="capture-error" data-testid="capture-error" hidden></p></section>`, '');
    bindRouteButtons();
    document.querySelector('[data-testid="analyze-capture"]').addEventListener('click',async()=>{
      const button=document.querySelector('[data-testid="analyze-capture"]');
      const text=document.querySelector('[data-testid="capture-text"]').value;
      const error=document.querySelector('[data-testid="capture-error"]');
      error.hidden=true;
      button.disabled=true;
      try {
        const parsed=await extractor.extract(text);
        if(!parsed.ok){ error.hidden=false; error.textContent=parsed.error; return; }
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(parsed));
        location.hash='#/review';
      } catch (cause) {
        error.hidden=false;
        error.textContent=cause?.message || 'The note could not be reviewed safely.';
      } finally { button.disabled=false; }
    });
  }

  function reviewBody(parsed){
    const labels=(parsed.uncertain || []).map(key=>uncertaintyLabels[key] || key);
    const uncertain = labels.length ? `<div class="placeholder-card"><strong>Please check these details</strong><p data-testid="uncertain-fields">${esc(labels.join(', '))}</p></div>` : `<div class="placeholder-card"><strong>Looks complete</strong><p>No low-confidence fields were detected by the local rules.</p></div>`;
    if(parsed.kind==='property'){
      return `${uncertain}<form data-testid="review-form">${field('Owner name','name',parsed.person?.name || '')}${field('Primary phone','primaryPhone',parsed.person?.primaryPhone || '')}${field('Property type','propertyType',parsed.property?.propertyType || '')}${sizeFields(parsed.property?.size)}${field('Locality','locality',parsed.property?.locality || '')}${field('Intent','intent',parsed.property?.intent || 'sale')}${field('Price','price',money(parsed.property?.price),'number')}<div class="page-actions"><button class="button primary" type="submit" data-testid="save-capture">Save property</button><button class="button" type="button" data-route="type">Edit note</button></div></form>`;
    }
    return `${uncertain}<form data-testid="review-form">${field('Name','name',parsed.person?.name || '')}${field('Primary phone','primaryPhone',parsed.person?.primaryPhone || '')}${field('Property type','propertyType',parsed.requirement?.propertyType || '')}${sizeFields(parsed.requirement?.size)}${field('Locality','locality',parsed.requirement?.locations?.[0] || '')}${field('Intent','intent',parsed.requirement?.intent || 'buy')}${field('Budget up to','budgetMax',money(parsed.requirement?.budgetMax),'number')}<div class="page-actions"><button class="button primary" type="submit" data-testid="save-capture">Save buyer</button><button class="button" type="button" data-route="type">Edit note</button></div></form>`;
  }

  function renderReview(){
    const raw=sessionStorage.getItem(DRAFT_KEY);
    if(!raw){ location.hash='#/type'; return; }
    let parsed;
    try {
      parsed=JSON.parse(raw);
      if(!parsed || !['property','requirement'].includes(parsed.kind)) throw new Error('invalid draft');
    } catch (_) {
      sessionStorage.removeItem(DRAFT_KEY);
      location.hash='#/type';
      return;
    }
    app.innerHTML=shell(`<section class="page"><p class="eyebrow">REVIEW BEFORE SAVE</p><h1>Check what I understood</h1><p class="lead">Correct anything before it becomes part of your local business memory.</p>${reviewBody(parsed)}<p class="capture-error" data-testid="review-error" hidden></p></section>`, '');
    bindRouteButtons();
    document.querySelector('[data-testid="review-form"]').addEventListener('submit',(event)=>{
      event.preventDefault();
      const saveButton=document.querySelector('[data-testid="save-capture"]');
      const errorEl=document.querySelector('[data-testid="review-error"]');
      saveButton.disabled=true;
      errorEl.hidden=true;
      try {
        const form=new FormData(event.currentTarget);
        if(parsed.kind==='property') saveProperty(form);
        else saveRequirement(form);
      } catch(error){
        errorEl.hidden=false;
        errorEl.textContent=error.message || 'Could not save these details.';
        saveButton.disabled=false;
      }
    });
  }

  function sizeFromForm(form){
    const value=numberOrNull(form.get('sizeValue'));
    const unit=String(form.get('sizeUnit') || '').trim();
    return value == null || !unit ? null : { value, unit };
  }

  function saveRequirement(form){
    const repo=window.__PA_REPOSITORY__;
    const result=repo.transact((tx)=>{
      const person=tx.create('people',{ name:String(form.get('name')||'').trim(), role:'buyer', primaryPhone:String(form.get('primaryPhone')||'').trim(), alternatePhones:[] });
      const requirement=tx.create('requirements',{ personId:person.id, intent:String(form.get('intent')||'buy'), propertyType:String(form.get('propertyType')||'').trim(), locations:[String(form.get('locality')||'').trim()].filter(Boolean), budgetMin:null, budgetMax:numberOrNull(form.get('budgetMax')), size:sizeFromForm(form) });
      return {person,requirement};
    });
    sessionStorage.removeItem(DRAFT_KEY);
    location.hash=`#/person?id=${encodeURIComponent(result.person.id)}`;
  }

  function saveProperty(form){
    const repo=window.__PA_REPOSITORY__;
    const result=repo.transact((tx)=>{
      const ownerName=String(form.get('name')||'').trim();
      const ownerPhone=String(form.get('primaryPhone')||'').trim();
      const owner=ownerName && ownerPhone ? tx.create('people',{ name:ownerName, role:'owner', primaryPhone:ownerPhone, alternatePhones:[] }) : null;
      const property=tx.create('properties',{ ownerPersonId:owner?.id || null, intent:String(form.get('intent')||'sale'), propertyType:String(form.get('propertyType')||'').trim(), locality:String(form.get('locality')||'').trim(), price:numberOrNull(form.get('price')), size:sizeFromForm(form) });
      return {owner,property};
    });
    sessionStorage.removeItem(DRAFT_KEY);
    location.hash=`#/property?id=${encodeURIComponent(result.property.id)}`;
  }

  function numberOrNull(value){ const text=String(value ?? '').trim(); if(text==='') return null; const number=Number(text); if(!Number.isFinite(number)) throw new Error('Enter a valid number'); return number; }
  function bindRouteButtons(){ document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',()=>{ location.hash=`#/${el.dataset.route}`; })); }
  function renderOwnedRoute(){ const route=currentRoute(); if(route==='type') renderType(); else if(route==='review') renderReview(); }

  window.addEventListener('hashchange',()=>setTimeout(renderOwnedRoute,0));
  window.addEventListener('DOMContentLoaded',()=>setTimeout(renderOwnedRoute,0));
})();
