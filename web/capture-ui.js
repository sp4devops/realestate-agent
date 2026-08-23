(function () {
  'use strict';

  const DRAFT_KEY = 'pa.captureDraft';
  const TYPE_PREFILL_KEY = 'pa.typePrefill';
  const CREATE_PERSON_VALUE = '__create_new_person__';
  const app = document.getElementById('app');
  const extractor = window.PropertyAssistantCapture.createExtractor();
  const uncertaintyLabels = { locality:'Location', propertyType:'Property type', primaryPhone:'Primary phone (can stay pending)', name:'Name', budgetMax:'Budget', price:'Price', targetProperty:'Property to update', targetPerson:'Person', dueAt:'Follow-up time' };

  function currentRoute(){ return (location.hash.replace(/^#\/?/,'') || '').split('?')[0]; }
  function esc(value){ return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function money(value){ return value == null || value === '' ? '' : String(value); }
  function field(label,name,value,type='text'){ return `<label class="capture-field"><span>${label}</span><input data-testid="field-${name}" name="${name}" type="${type}" value="${esc(value)}" /></label>`; }
  function locationField(label,name,value){
    const listId=`location-options-${name}`;
    return `<div class="capture-field location-field"><label for="field-${name}">${label}</label><div class="location-input-row"><input id="field-${name}" data-testid="field-${name}" name="${name}" type="text" value="${esc(value)}" role="combobox" aria-autocomplete="list" aria-controls="${listId}" aria-expanded="false" autocomplete="off" /><button class="pin-location-button" type="button" data-pin-location="${name}">☆ Pin area</button></div><div class="location-options" id="${listId}" data-location-options="${name}" role="listbox" aria-label="Area suggestions" hidden></div></div>`;
  }
  function textArea(label,name,value){ return `<label class="capture-field"><span>${label}</span><textarea data-testid="field-${name}" name="${name}" rows="4">${esc(value)}</textarea></label>`; }
  function selectField(label,name,options,selected='',allowBlank=true){
    const values=(allowBlank?[{value:'',label:'Choose…'}]:[]).concat(options || []);
    return `<label class="capture-field"><span>${label}</span><select data-testid="field-${name}" name="${name}">${values.map(option=>`<option value="${esc(option.value)}"${String(option.value)===String(selected)?' selected':''}>${esc(option.label)}</option>`).join('')}</select></label>`;
  }
  function sizeFields(size,range=false){
    if(range){
      const min=size?.minValue ?? size?.value ?? ''; const max=size?.maxValue ?? '';
      return `<div class="field-row">${field('Size from','sizeMin',min,'number')}${field('Size up to','sizeMax',max,'number')}</div>${field('Size unit','sizeUnit',size?.unit || '')}`;
    }
    return `<div class="field-row">${field('Size','sizeValue',size?.value ?? '','number')}${field('Unit','sizeUnit',size?.unit || '')}</div>`;
  }
  function listValue(values){ return Array.isArray(values) ? values.join(', ') : ''; }
  function sourceOf(parsed){ return String(parsed?.rawTranscript || parsed?.source || '').trim(); }
  function normalizedSourceOf(parsed){ return String(parsed?.normalizedTranscript || parsed?.source || '').trim(); }

  function renderType(){
    let draftSource='';
    try { draftSource=sourceOf(JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null')); } catch (_) { /* Invalid drafts are handled by Review. */ }
    const prefill=sessionStorage.getItem(TYPE_PREFILL_KEY) || draftSource;
    sessionStorage.removeItem(TYPE_PREFILL_KEY);
    app.innerHTML = shell(`<section class="page"><p class="eyebrow">TYPE & SAVE</p><h1>Type & Save</h1><p class="lead">Type a buyer request, available property, price change, rejection or follow-up in plain English. Property Assistant organizes it locally.</p><label class="capture-field"><span>Business note</span><textarea data-testid="capture-text" rows="7" placeholder="Example: Arun wants 5 acre land in Perundurai, budget 25 lakh">${esc(prefill)}</textarea></label><div class="page-actions"><button type="button" class="button primary" data-testid="analyze-capture">Review details</button><button type="button" class="button" data-testid="cancel-capture">Cancel</button></div><p class="capture-error" data-testid="capture-error" hidden></p></section>`, '');
    bindRouteButtons();
    window.PropertyAssistantTypingAssist?.attach(document.querySelector('[data-testid="capture-text"]'),{repository:window.__PA_REPOSITORY__,testId:'type-cursor-suggestion'});
    document.querySelector('[data-testid="cancel-capture"]').addEventListener('click',()=>{
      sessionStorage.removeItem(DRAFT_KEY);
      sessionStorage.removeItem(TYPE_PREFILL_KEY);
      location.hash='#/home';
    });
    document.querySelector('[data-testid="analyze-capture"]').addEventListener('click',async()=>{
      const button=document.querySelector('[data-testid="analyze-capture"]'); const text=document.querySelector('[data-testid="capture-text"]').value; const error=document.querySelector('[data-testid="capture-error"]');
      error.hidden=true; button.disabled=true;
      try { const parsed=await extractor.extract(text); if(!parsed.ok){ error.hidden=false; error.textContent=parsed.error; return; } sessionStorage.setItem(DRAFT_KEY, JSON.stringify(parsed)); location.hash='#/review'; }
      catch (cause) { error.hidden=false; error.textContent=cause?.message || 'The note could not be reviewed safely.'; }
      finally { button.disabled=false; }
    });
  }

  function peopleOptions(){
    return window.__PA_REPOSITORY__.list('people').sort((a,b)=>a.name.localeCompare(b.name)).map(person=>({value:person.id,label:personIdentityLabel(person)}));
  }
  function personIdentityLabel(person){
    const repo=window.__PA_REPOSITORY__;const role=(person.roles||[person.role]).join('/').replaceAll('_',' ');
    const places=[...repo.list('requirements').filter(item=>item.personId===person.id).flatMap(item=>item.locations||[]),...repo.list('properties').filter(item=>item.ownerPersonId===person.id).map(item=>item.locality)].filter(Boolean);
    const context=places[0]||'location pending';const phone=person.primaryPhone?`phone ending ${String(person.primaryPhone).replace(/\D/g,'').slice(-4)}`:'phone pending';
    return `${person.name} · ${role} · ${context} · ${phone}`;
  }
  function propertyOptions(){
    const repo=window.__PA_REPOSITORY__;
    return repo.list('properties').sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).map(property=>{
      const owner=property.ownerPersonId?repo.get('people',property.ownerPersonId):null;
      return {value:property.id,label:`${property.propertyType} · ${property.locality} · ${owner?.name || 'owner pending'}`};
    });
  }
  function suggestedPersonId(parsed){
    const normalize=window.PropertyAssistantPersistence.normalizePhone; const phone=normalize(parsed.person?.primaryPhone);
    const people=window.__PA_REPOSITORY__.list('people');
    if(phone){ const hit=people.find(person=>[person.primaryPhone,...(person.alternatePhones || [])].some(value=>normalize(value)===phone)); if(hit)return hit.id; }
    return '';
  }
  function identityCandidates(parsed){
    const normalize=window.PropertyAssistantPersistence.normalizePhone;const phone=normalize(parsed.person?.primaryPhone);const name=normalizeName(parsed.person?.name);const people=window.__PA_REPOSITORY__.list('people');
    const exactPhone=phone?people.filter(person=>[person.primaryPhone,...(person.alternatePhones||[])].some(value=>normalize(value)===phone)):[];
    if(exactPhone.length)return exactPhone;
    return people.filter(person=>name&&normalizeName(person.name)===name);
  }
  function identityField(label,name,parsed){
    const candidates=identityCandidates(parsed);if(!candidates.length)return '';
    const duplicate=candidates.length>1;
    const selected=suggestedPersonId(parsed);
    const options=[`<option value="${CREATE_PERSON_VALUE}"${selected?'':' selected'}>Create a new person</option>`,...candidates.map(person=>`<option value="${esc(person.id)}"${person.id===selected?' selected':''}>${esc(personIdentityLabel(person))}</option>`)].join('');
    return `<div class="identity-resolution" data-testid="identity-resolution"><strong>${duplicate?'More than one saved person has this name':'A saved person may match'}</strong><p>${duplicate?'Choose using phone, role and area. Names alone never identify a person.':'Confirm whether this is the saved person or create a separate contact.'}</p><label class="capture-field"><span>${label}</span><select data-testid="field-${name}" name="${name}">${options}</select></label></div>`;
  }
  function suggestedPropertyId(parsed){
    const update=parsed.propertyUpdate || parsed.interaction || {}; const name=String(parsed.person?.name || '').trim().toLowerCase(); const repo=window.__PA_REPOSITORY__;
    const candidates=repo.list('properties').filter(property=>{
      const owner=property.ownerPersonId?repo.get('people',property.ownerPersonId):null;
      return (!update.locality||property.locality.toLowerCase()===String(update.locality).toLowerCase())&&(!update.propertyType||property.propertyType===update.propertyType)&&(!name||owner?.name.toLowerCase()===name);
    });
    return candidates.length===1?candidates[0].id:'';
  }
  function dueLocal(dueText){
    const date=new Date(); date.setSeconds(0,0);
    if(dueText==='Today') date.setHours(Math.max(date.getHours()+1,10),0,0,0);
    else if(dueText==='Tomorrow'){ date.setDate(date.getDate()+1); date.setHours(10,0,0,0); }
    else {
      const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; const clean=String(dueText || '').replace(/^Next\s+/,''); const target=days.indexOf(clean);
      if(target>=0){ let add=(target-date.getDay()+7)%7; if(add===0||/^Next\s+/.test(String(dueText))) add+=7; date.setDate(date.getDate()+add); date.setHours(10,0,0,0); }
      else return '';
    }
    const local=new Date(date.getTime()-date.getTimezoneOffset()*60000); return local.toISOString().slice(0,16);
  }

  function reviewBody(parsed){
    const labels=(parsed.uncertain || []).map(key=>uncertaintyLabels[key] || key);
    const uncertain = labels.length ? `<div class="placeholder-card"><strong>Please check these details</strong><p data-testid="uncertain-fields">${esc(labels.join(', '))}</p></div>` : `<div class="placeholder-card"><strong>Looks complete</strong><p>No low-confidence fields were detected by the local rules.</p></div>`;
    if(parsed.kind==='property') return `${uncertain}<form data-testid="review-form">${field('Owner name','name',parsed.person?.name || '')}${field('Primary phone (optional)','primaryPhone',parsed.person?.primaryPhone || '')}${identityField('Existing owner (optional)','targetPerson',parsed)}${field('Property type','propertyType',parsed.property?.propertyType || '')}${sizeFields(parsed.property?.size)}${locationField('Area / locality','locality',parsed.property?.locality || '')}${field('Intent','intent',parsed.property?.intent || 'sale')}${field('Price / rate','price',money(parsed.property?.price),'number')}${selectField('Price basis','priceBasis',[{value:'total',label:'Total price'},{value:'per_month',label:'Per month'},{value:'per_acre',label:'Per acre'},{value:'per_cent',label:'Per cent'},{value:'per_sqft',label:'Per sqft'}],parsed.property?.priceBasis || 'total',false)}${field('Attributes (comma separated)','attributes',listValue(parsed.property?.attributes))}<div class="page-actions"><button class="button primary" type="submit" data-testid="save-capture">Save property</button><button class="button" type="button" data-testid="edit-capture-note">Edit note</button></div></form>`;
    if(parsed.kind==='requirement') return `${uncertain}<form data-testid="review-form">${field('Name','name',parsed.person?.name || '')}${field('Primary phone (optional)','primaryPhone',parsed.person?.primaryPhone || '')}${identityField('Existing contact (optional)','targetPerson',parsed)}${field('Property type','propertyType',parsed.requirement?.propertyType || '')}${sizeFields(parsed.requirement?.size,true)}${locationField('Area / locality','locality',parsed.requirement?.locations?.[0] || '')}${field('Intent','intent',parsed.requirement?.intent || 'buy')}<div class="field-row">${field('Budget from','budgetMin',money(parsed.requirement?.budgetMin),'number')}${field('Budget up to','budgetMax',money(parsed.requirement?.budgetMax),'number')}</div>${field('Move / decision timing','timing',parsed.requirement?.timing || '')}${field('Preferences (comma separated)','preferences',listValue(parsed.requirement?.preferences))}<div class="page-actions"><button class="button primary" type="submit" data-testid="save-capture">Save requirement</button><button class="button" type="button" data-testid="edit-capture-note">Edit note</button></div></form>`;
    if(parsed.kind==='property_update') return `${uncertain}<form data-testid="review-form">${selectField('Property to update','targetProperty',propertyOptions(),suggestedPropertyId(parsed))}${field('New price / rate','price',money(parsed.propertyUpdate?.price),'number')}${selectField('Price basis','priceBasis',[{value:'total',label:'Total price'},{value:'per_month',label:'Per month'},{value:'per_acre',label:'Per acre'},{value:'per_cent',label:'Per cent'},{value:'per_sqft',label:'Per sqft'}],parsed.propertyUpdate?.priceBasis || 'total',false)}${field('Updated attributes','attributes',listValue(parsed.propertyUpdate?.attributes))}${textArea('Original update note','summary',parsed.source)}<div class="page-actions"><button class="button primary" type="submit" data-testid="save-capture">Apply property update</button><button class="button" type="button" data-testid="edit-capture-note">Edit note</button></div></form>`;
    if(parsed.kind==='followup') return `${uncertain}<form data-testid="review-form">${field('Name','name',parsed.person?.name || '')}${field('Primary phone (optional)','primaryPhone',parsed.person?.primaryPhone || '')}${identityField('Existing person (optional)','targetPerson',parsed) || selectField('Existing person (optional)','targetPerson',peopleOptions(),suggestedPersonId(parsed))}${field('Follow-up title','title',parsed.followUp?.title || 'Follow up')}${field('Due at','dueAt',dueLocal(parsed.followUp?.dueText),'datetime-local')}<div class="page-actions"><button class="button primary" type="submit" data-testid="save-capture">Save follow-up</button><button class="button" type="button" data-testid="edit-capture-note">Edit note</button></div></form>`;
    return `${uncertain}<form data-testid="review-form">${field('Name','name',parsed.person?.name || '')}${field('Primary phone (optional)','primaryPhone',parsed.person?.primaryPhone || '')}${identityField('Existing person (optional)','targetPerson',parsed) || selectField('Existing person (optional)','targetPerson',peopleOptions(),suggestedPersonId(parsed))}${selectField('Related property (optional)','targetProperty',propertyOptions(),suggestedPropertyId(parsed))}${textArea('What happened','summary',parsed.interaction?.summary || parsed.source)}${field('Preferences learned (comma separated)','learnedPreferences',listValue(parsed.interaction?.learnedPreferences))}<div class="page-actions"><button class="button primary" type="submit" data-testid="save-capture">Remember update</button><button class="button" type="button" data-testid="edit-capture-note">Edit note</button></div></form>`;
  }

  function renderReview(){
    const raw=sessionStorage.getItem(DRAFT_KEY); if(!raw){ location.hash='#/type'; return; }
    let parsed;
    try { parsed=JSON.parse(raw); if(!parsed || !['property','requirement','property_update','followup','interaction'].includes(parsed.kind)) throw new Error('invalid draft'); }
    catch (_) { sessionStorage.removeItem(DRAFT_KEY); location.hash='#/type'; return; }
    app.innerHTML=shell(`<section class="page"><p class="eyebrow">REVIEW BEFORE SAVE</p><h1>Check what I understood</h1><p class="lead">Correct anything before it becomes part of your local business memory.</p>${reviewBody(parsed)}<p class="capture-error" data-testid="review-error" hidden></p></section>`, '');
    bindRouteButtons();
    bindLocationFields();
    document.querySelector('[data-testid="edit-capture-note"]').addEventListener('click',()=>{
      sessionStorage.setItem(TYPE_PREFILL_KEY,sourceOf(parsed));
      location.hash='#/type';
    });
    document.querySelector('[data-testid="review-form"]').addEventListener('submit',(event)=>{
      event.preventDefault(); const saveButton=document.querySelector('[data-testid="save-capture"]'); const errorEl=document.querySelector('[data-testid="review-error"]'); saveButton.disabled=true; errorEl.hidden=true;
      try {
        const form=new FormData(event.currentTarget);
        if(parsed.kind==='property') saveProperty(form,parsed);
        else if(parsed.kind==='requirement') saveRequirement(form,parsed);
        else if(parsed.kind==='property_update') savePropertyUpdate(form,parsed);
        else if(parsed.kind==='followup') saveFollowUp(form,parsed);
        else saveInteraction(form,parsed);
      } catch(error){ errorEl.hidden=false; errorEl.textContent=error.message || 'Could not save these details.'; saveButton.disabled=false; }
    });
  }
  function bindLocationFields(){
    document.querySelectorAll('[data-location-options]').forEach(list=>{
      const name=list.dataset.locationOptions;const input=document.querySelector(`[name="${name}"]`);const pinButton=document.querySelector(`[data-pin-location="${name}"]`);
      window.PropertyAssistantLocations?.bindTypeahead(input,{repository:window.__PA_REPOSITORY__,list,pinButton});
    });
  }

  function sizeFromForm(form,range=false){
    const unit=String(form.get('sizeUnit') || '').trim(); if(!unit)return null;
    if(range){ const minValue=numberOrNull(form.get('sizeMin')); const maxValue=numberOrNull(form.get('sizeMax')); if(minValue==null&&maxValue==null)return null; if(minValue!=null&&maxValue!=null&&minValue>maxValue)throw new Error('Size from cannot exceed size up to'); return minValue!=null&&maxValue==null?{value:minValue,unit}:{minValue,maxValue,unit}; }
    const value=numberOrNull(form.get('sizeValue')); return value == null ? null : {value,unit};
  }
  function listFromForm(form,name){ return [...new Set(String(form.get(name) || '').split(',').map(value=>value.trim()).filter(Boolean))]; }
  function normalizeName(value){ return String(value || '').trim().replace(/\s+/g,' ').toLowerCase(); }
  function findPerson(tx,{phone=''}){
    const normalize=window.PropertyAssistantPersistence.normalizePhone; const target=normalize(phone); const people=tx.list('people');
    if(target){ const phoneHit=people.find(person=>[person.primaryPhone,...(person.alternatePhones || [])].some(value=>normalize(value)===target)); if(phoneHit)return phoneHit; }
    return null;
  }
  function upsertPerson(tx,{id='',name='',phone='',role='other'}){
    const cleanName=String(name || '').trim(); const cleanPhone=String(phone || '').trim();
    const normalize=window.PropertyAssistantPersistence.normalizePhone;
    const createNew=id===CREATE_PERSON_VALUE; const selectedId=createNew?'':id;
    const explicitlySelected=Boolean(selectedId); const phoneMatch=findPerson(tx,{phone:cleanPhone});
    if(createNew&&phoneMatch) throw new Error(`That phone is already saved for ${phoneMatch.name}. Choose that saved person or use a different number.`);
    let person=explicitlySelected?tx.get('people',selectedId):(createNew?null:phoneMatch);
    if(explicitlySelected&&!person) throw new Error('The selected person no longer exists. Review the identity choice again.');
    if(!person && !cleanName) throw new Error('Add a name or choose an existing person.');
    if(person){
      const roles=[...new Set([...(person.roles || [person.role]),role])];
      const patch={roles,role:person.role==='other'&&role!=='other'?role:person.role};
      if(cleanName&&!explicitlySelected) patch.name=cleanName;
      const normalizedPhone=normalize(cleanPhone); const normalizedPrimary=normalize(person.primaryPhone);
      const normalizedAlternates=(person.alternatePhones || []).map(normalize);
      if(cleanPhone&&!normalizedPrimary){ patch.primaryPhone=cleanPhone; patch.identityStatus='confirmed'; }
      else if(normalizedPhone&&normalizedPhone!==normalizedPrimary&&!normalizedAlternates.includes(normalizedPhone)){
        const conflict=tx.list('people').find(other=>other.id!==person.id&&[other.primaryPhone,...(other.alternatePhones || [])].some(value=>normalize(value)===normalizedPhone));
        if(conflict) throw new Error(`That phone is already saved for ${conflict.name}. Choose the correct saved person.`);
        patch.alternatePhones=[...(person.alternatePhones || []),cleanPhone];
      }
      return tx.update('people',person.id,patch);
    }
    return tx.create('people',{name:cleanName,role,roles:[role],primaryPhone:cleanPhone,identityStatus:cleanPhone?'confirmed':'phone_pending',alternatePhones:[]});
  }
  function syncMatches(){ return window.PropertyAssistantMatching.sync(window.__PA_REPOSITORY__); }
  function finish(){ sessionStorage.removeItem(DRAFT_KEY); sessionStorage.removeItem(TYPE_PREFILL_KEY); }
  function routeForMatches(matches,query,fallback){ finish(); location.hash=matches.length?`#/matches?${query}&new=1`:fallback; }

  function saveRequirement(form,parsed){
    const repo=window.__PA_REPOSITORY__; const phone=String(form.get('primaryPhone')||'').trim(); const intent=String(form.get('intent')||'buy');
    const result=repo.transact(tx=>{
      const role=intent==='rent'||intent==='lease'?'tenant':'buyer';
      const person=upsertPerson(tx,{id:String(form.get('targetPerson')||''),name:String(form.get('name')||'').trim(),phone,role});
      const requirement=tx.create('requirements',{personId:person.id,intent,propertyType:String(form.get('propertyType')||'').trim(),locations:[String(form.get('locality')||'').trim()].filter(Boolean),budgetMin:numberOrNull(form.get('budgetMin')),budgetMax:numberOrNull(form.get('budgetMax')),size:sizeFromForm(form,true),timing:String(form.get('timing')||'').trim(),preferences:listFromForm(form,'preferences'),preferenceEvidence:[],sourceText:sourceOf(parsed),normalizedText:normalizedSourceOf(parsed)});
      return {person,requirement};
    });
    const matches=syncMatches().filter(match=>match.requirementId===result.requirement.id);
    routeForMatches(matches,`requirement=${encodeURIComponent(result.requirement.id)}`,`#/person?id=${encodeURIComponent(result.person.id)}`);
  }

  function saveProperty(form,parsed){
    const repo=window.__PA_REPOSITORY__;
    const result=repo.transact(tx=>{
      const ownerName=String(form.get('name')||'').trim(); const ownerPhone=String(form.get('primaryPhone')||'').trim();
      if(ownerPhone&&!ownerName) throw new Error('Add the owner name so the phone is not stored without an identity.');
      const owner=ownerName?upsertPerson(tx,{id:String(form.get('targetPerson')||''),name:ownerName,phone:ownerPhone,role:'owner'}):null;
      const property=tx.create('properties',{ownerPersonId:owner?.id || null,intent:String(form.get('intent')||'sale'),propertyType:String(form.get('propertyType')||'').trim(),locality:String(form.get('locality')||'').trim(),price:numberOrNull(form.get('price')),priceBasis:String(form.get('priceBasis')||'total'),size:sizeFromForm(form),attributes:listFromForm(form,'attributes'),sourceText:sourceOf(parsed),normalizedText:normalizedSourceOf(parsed)});
      return {owner,property};
    });
    const matches=syncMatches().filter(match=>match.propertyId===result.property.id);
    routeForMatches(matches,`property=${encodeURIComponent(result.property.id)}`,`#/property?id=${encodeURIComponent(result.property.id)}`);
  }

  function savePropertyUpdate(form,parsed){
    const repo=window.__PA_REPOSITORY__; const id=String(form.get('targetProperty') || ''); if(!id)throw new Error('Choose the property whose price or details changed.');
    const result=repo.transact(tx=>{
      const property=tx.get('properties',id); if(!property)throw new Error('The selected property no longer exists.');
      const attributes=[...new Set([...(property.attributes || []),...listFromForm(form,'attributes')])];
      const updated=tx.update('properties',id,{price:numberOrNull(form.get('price')),priceBasis:String(form.get('priceBasis')||'total'),attributes});
      tx.create('interactions',{kind:'note',occurredAt:new Date().toISOString(),personIds:property.ownerPersonId?[property.ownerPersonId]:[],propertyId:id,summary:String(form.get('summary')||parsed.source).trim()});
      return updated;
    });
    const matches=syncMatches().filter(match=>match.propertyId===result.id);
    routeForMatches(matches,`property=${encodeURIComponent(result.id)}`,`#/property?id=${encodeURIComponent(result.id)}`);
  }

  function saveFollowUp(form,parsed){
    const repo=window.__PA_REPOSITORY__; const due=String(form.get('dueAt') || '').trim(); if(!due||Number.isNaN(new Date(due).getTime()))throw new Error('Choose a valid follow-up time.');
    const result=repo.transact(tx=>{
      const person=upsertPerson(tx,{id:String(form.get('targetPerson')||''),name:String(form.get('name')||''),phone:String(form.get('primaryPhone')||''),role:'other'});
      const followUp=tx.create('followUps',{dueAt:new Date(due).toISOString(),status:'open',title:String(form.get('title')||'Follow up').trim(),personId:person.id,sourceText:sourceOf(parsed)});
      return {person,followUp};
    });
    finish(); location.hash=`#/followups?new=${encodeURIComponent(result.followUp.id)}`;
  }

  function saveInteraction(form,parsed){
    const repo=window.__PA_REPOSITORY__; const summary=String(form.get('summary')||'').trim(); if(!summary)throw new Error('Add what happened.');
    const result=repo.transact(tx=>{
      const person=upsertPerson(tx,{id:String(form.get('targetPerson')||''),name:String(form.get('name')||''),phone:String(form.get('primaryPhone')||''),role:'other'});
      const propertyId=String(form.get('targetProperty')||'') || null; const learned=listFromForm(form,'learnedPreferences');
      tx.create('interactions',{kind:'note',occurredAt:new Date().toISOString(),personIds:[person.id],propertyId,summary,learnedPreferences:learned});
      const requirement=tx.list('requirements').filter(item=>item.personId===person.id).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
      if(requirement&&learned.length) tx.update('requirements',requirement.id,{preferences:[...new Set([...(requirement.preferences || []),...learned])],preferenceEvidence:[...new Set([...(requirement.preferenceEvidence || []),summary])]});
      return {person,requirement};
    });
    if(result.requirement)syncMatches(); finish(); location.hash=`#/person?id=${encodeURIComponent(result.person.id)}`;
  }

  function numberOrNull(value){ const text=String(value ?? '').trim(); if(text==='') return null; const number=Number(text); if(!Number.isFinite(number)||number<0) throw new Error('Enter a valid number'); return number; }
  function bindRouteButtons(){ document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',()=>{ location.hash=`#/${el.dataset.route}`; })); }
  function renderOwnedRoute(){ const route=currentRoute(); if(route==='type') renderType(); else if(route==='review') renderReview(); }
  window.addEventListener('hashchange',()=>setTimeout(renderOwnedRoute,0)); window.addEventListener('DOMContentLoaded',()=>setTimeout(renderOwnedRoute,0));
})();
