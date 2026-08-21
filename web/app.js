const STORAGE_KEYS = { display: 'pa.displayLanguage', input: 'pa.inputLanguage' };
const app = document.getElementById('app');
const repository = window.PropertyAssistantPersistence.createRepository(localStorage);
repository.migrateAndPersist();
repository.seedSynthetic();
window.__PA_REPOSITORY__ = repository;

const displayLanguages = {
  en: { label:'English', nav:{home:'Home',ask:'Ask',matches:'Matches',people:'People',more:'More'}, actions:{speak:'Speak & Save',type:'Type & Save',scan:'Scan Poster'}, today:"Today's opportunities", subtitle:'Capture quickly. Remember clearly. Match automatically.' },
  ta: { label:'தமிழ்', nav:{home:'முகப்பு',ask:'கேள்',matches:'பொருத்தங்கள்',people:'நபர்கள்',more:'மேலும்'}, actions:{speak:'பேசி சேமி',type:'தட்டச்சு செய்து சேமி',scan:'போஸ்டர் ஸ்கேன்'}, today:'இன்றைய வாய்ப்புகள்', subtitle:'விரைவாக பதிவு செய். தெளிவாக நினைவில் வை. தானாக பொருத்து.' },
  tg: { label:'Tanglish', nav:{home:'Home',ask:'Kelu',matches:'Matches',people:'People',more:'More'}, actions:{speak:'Pesitu Save Pannu',type:'Type Panni Save Pannu',scan:'Poster Scan Pannu'}, today:'Innaiku Opportunities', subtitle:'Fast-ah capture pannu. Clear-ah remember pannu. Automatic-ah match pannu.' }
};

const inputLanguages = [
  {id:'auto',label:'Auto detect'}, {id:'ta',label:'Tamil'}, {id:'en',label:'English'}, {id:'tg',label:'Tanglish'}
];

const routes = {
  splash: ['Property Assistant','Private, local-first memory and deal assistant for Property Advisors.'],
  onboarding: ['Welcome','Set up the app without technical steps.'],
  home: ['Home','Capture new business memory and see what needs attention.'],
  speak: ['Speak & Save','Voice capture will be added in Phase P4. Typed capture remains independent.'],
  type: ['Type & Save','Natural-language typed capture will be implemented in Phase P3.'],
  review: ['Review','Confirm extracted information before saving.'],
  'after-call': ['After-call recap','Quickly capture what changed after a call without recording the call itself.'],
  ask: ['Ask','Search your local business memory with voice or typing.'],
  people: ['People','Remember Property Advisors, owners, buyers, tenants and contacts.'],
  person: ['Person detail','Contact and requirement details will live here.'],
  property: ['Property detail','Property facts and actions will live here.'],
  matches: ['Matches','Demand and supply will connect here automatically.'],
  match: ['Match detail','Understand why a match exists and take the next action.'],
  poster: ['Scan Poster','Capture a poster or choose an image.'],
  'poster-review': ['Poster review','Confirm phone number and extracted details before save.'],
  'poster-lead': ['Poster lead','Keep poster details separate from photo capture location.'],
  followups: ['Follow-ups','See useful next actions without CRM complexity.'],
  language: ['Language','Display language and speech/input language are separate settings.'],
  settings: ['Settings & Backup','Privacy, backup and restore controls will live here.']
};

const primaryNav = [
  ['home','⌂'], ['ask','⌕'], ['matches','◇'], ['people','◎'], ['settings','⋯']
];

const seed = Object.freeze({ id:'synthetic-shell-record', phone:'+91 90000 00000', intent:'buy', location:'Erode' });
window.__PA_SEED__ = seed;

function escapeHtml(value){ return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
function getDisplayLanguage(){ return localStorage.getItem(STORAGE_KEYS.display) || 'en'; }
function getInputLanguage(){ return localStorage.getItem(STORAGE_KEYS.input) || 'auto'; }
function route(){ return (location.hash.replace(/^#\/?/,'') || 'splash').split('?')[0]; }
function routeParams(){ const query=location.hash.split('?')[1] || ''; return new URLSearchParams(query); }
function go(id){ location.hash = `#/${id}`; }
function t(){ return displayLanguages[getDisplayLanguage()] || displayLanguages.en; }

function button(label, target, className='button secondary'){
  return `<button class="${className}" data-route="${target}" type="button">${label}</button>`;
}

function shell(content, active){
  const text=t();
  const nav = primaryNav.map(([id,icon]) => {
    const key=id==='settings'?'more':id;
    return `<button type="button" class="nav-item ${active===id?'active':''}" data-route="${id}" aria-label="${text.nav[key]}" data-testid="nav-${id}"><span aria-hidden="true">${icon}</span><small>${text.nav[key]}</small></button>`;
  }).join('');
  return `<div class="app-shell"><header class="topbar"><button class="brand" data-route="home" aria-label="Property Assistant home"><span class="brand-mark">PA</span><span>Property Assistant</span></button><button class="language-chip" data-route="language" data-testid="language-chip">${text.label}</button></header><main>${content}</main><nav class="bottom-nav" aria-label="Primary navigation">${nav}</nav></div>`;
}

function renderHome(){
  const text=t();
  return shell(`<section class="hero"><p class="eyebrow">PROPERTY ASSISTANT</p><h1>${text.today}</h1><p>${text.subtitle}</p><div class="capture-grid"><button class="capture voice" data-route="speak" data-testid="speak-save"><span class="capture-icon">●</span><strong>${text.actions.speak}</strong><small>Voice-first capture</small></button><button class="capture type" data-route="type" data-testid="type-save"><span class="capture-icon">Aa</span><strong>${text.actions.type}</strong><small>Quick natural-language note</small></button></div></section><section><div class="section-heading"><h2>Needs attention</h2><button data-route="followups" class="text-button">View all</button></div><div class="card opportunity"><span class="status-dot"></span><div><strong>Local memory is ready</strong><p>Your saved people and properties stay on this device and remain available without a model.</p></div></div><div class="quick-actions">${button(text.actions.scan,'poster')}${button('After-call recap','after-call')}${button('Follow-ups','followups')}</div></section>`, 'home');
}

function renderPeople(){
  const people=repository.list('people').sort((a,b)=>a.name.localeCompare(b.name));
  const cards=people.map(person=>`<article class="card person-card" data-testid="person-card"><div><strong>${escapeHtml(person.name)}</strong><p>${escapeHtml(person.role.replaceAll('_',' '))} · ${escapeHtml(person.primaryPhone)}</p></div><button type="button" class="button" data-person-id="${escapeHtml(person.id)}">Open</button></article>`).join('');
  return shell(`<section class="page"><p class="eyebrow">LOCAL MEMORY</p><h1>People</h1><p class="lead">People and their contact numbers are stored locally in language-neutral records.</p><div class="choice-list" data-testid="people-list">${cards || '<div class="placeholder-card">No people saved yet.</div>'}</div></section>`, 'people');
}

function renderPerson(){
  const id=routeParams().get('id') || 'person-suresh';
  const person=repository.get('people', id);
  if(!person) return shell(`<section class="page"><h1>Person not found</h1><p class="lead">This local record no longer exists.</p>${button('Back to People','people')}</section>`, 'people');
  const alternates=(person.alternatePhones || []).map(phone=>`<li>${escapeHtml(phone)}</li>`).join('') || '<li>None</li>';
  const property=repository.list('properties').find(item=>item.ownerPersonId===person.id);
  return shell(`<section class="page"><p class="eyebrow">LOCAL MEMORY</p><h1 data-testid="person-name">${escapeHtml(person.name)}</h1><p class="lead">${escapeHtml(person.role.replaceAll('_',' '))}</p><div class="placeholder-card"><strong>Primary phone</strong><p data-testid="primary-phone">${escapeHtml(person.primaryPhone)}</p><strong>Alternate phones</strong><ul>${alternates}</ul></div><div class="page-actions">${property ? `<button class="button primary" type="button" data-property-id="${escapeHtml(property.id)}">Open property</button>` : ''}${button('Back to People','people')}</div></section>`, 'people');
}

function renderProperty(){
  const id=routeParams().get('id') || 'property-murugan';
  const property=repository.get('properties', id);
  if(!property) return shell(`<section class="page"><h1>Property not found</h1><p class="lead">This local record no longer exists.</p>${button('Back to Home','home')}</section>`, '');
  return shell(`<section class="page"><p class="eyebrow">LOCAL MEMORY</p><h1 data-testid="property-title">${escapeHtml(property.propertyType)} in ${escapeHtml(property.locality)}</h1><p class="lead">${escapeHtml(property.intent)} · ${property.price == null ? 'Price not set' : `₹${Number(property.price).toLocaleString('en-IN')}`}</p><div class="placeholder-card"><strong>Stored locally</strong><p>This structured property record is independent of display language and AI availability.</p></div><div class="page-actions">${button('View Matches','matches')}</div></section>`, '');
}

function renderLanguage(){
  const display=getDisplayLanguage(), input=getInputLanguage();
  const displayOptions=Object.entries(displayLanguages).map(([id,value]) => `<button type="button" class="choice ${display===id?'selected':''}" data-display-language="${id}" aria-pressed="${display===id}"><strong>${value.label}</strong><small>Changes menus, buttons and guidance</small></button>`).join('');
  const inputOptions=inputLanguages.map(item => `<button type="button" class="choice ${input===item.id?'selected':''}" data-input-language="${item.id}" aria-pressed="${input===item.id}"><strong>${item.label}</strong><small>Speech and typed understanding preference</small></button>`).join('');
  return shell(`<section class="page"><p class="eyebrow">PERSONALIZE</p><h1>Language</h1><p class="lead">Display language and input understanding are intentionally independent.</p><h2>App display language</h2><div class="choice-list" data-testid="display-language-options">${displayOptions}</div><h2>Voice & typing language</h2><div class="choice-list" data-testid="input-language-options">${inputOptions}</div></section>`, 'settings');
}

function renderGeneric(id){
  const [title,description]=routes[id] || ['Not found','This screen does not exist.'];
  const actions={splash:button('Get started','onboarding','button primary'),onboarding:button('Continue to Home','home','button primary'),speak:button('Use Type & Save instead','type','button primary'),type:button('Review example','review','button primary'),review:button('Back to Home','home','button primary'),'after-call':button('Back to Home','home','button primary'),ask:button('Back to Home','home'),matches:button('Open match detail','match'),match:button('Follow up','followups'),poster:button('Review captured poster','poster-review','button primary'),'poster-review':button('Save poster lead','poster-lead','button primary'),'poster-lead':button('View Matches','matches'),followups:button('Back to Home','home'),settings:button('Language','language','button primary')}[id] || button('Back to Home','home');
  const content=`<section class="page"><p class="eyebrow">PROPERTY ASSISTANT</p><h1 data-testid="screen-title">${title}</h1><p class="lead">${description}</p><div class="placeholder-card"><strong>Phase-owned workflow</strong><p>This route is wired and intentionally avoids fake AI or matching behavior before its owning phase.</p></div><div class="page-actions">${actions}</div></section>`;
  if(id==='splash') return `<div class="splash">${content}</div>`;
  return shell(content, primaryNav.some(([nav])=>nav===id)?id:'');
}

function render(){
  const id=route();
  app.innerHTML = id==='home' ? renderHome() : id==='language' ? renderLanguage() : id==='people' ? renderPeople() : id==='person' ? renderPerson() : id==='property' ? renderProperty() : renderGeneric(id);
  document.documentElement.lang = getDisplayLanguage()==='ta'?'ta':'en';
  bind();
}

function bind(){
  document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',()=>go(el.dataset.route)));
  document.querySelectorAll('[data-person-id]').forEach(el=>el.addEventListener('click',()=>{ location.hash=`#/person?id=${encodeURIComponent(el.dataset.personId)}`; }));
  document.querySelectorAll('[data-property-id]').forEach(el=>el.addEventListener('click',()=>{ location.hash=`#/property?id=${encodeURIComponent(el.dataset.propertyId)}`; }));
  document.querySelectorAll('[data-display-language]').forEach(el=>el.addEventListener('click',()=>{ localStorage.setItem(STORAGE_KEYS.display,el.dataset.displayLanguage); render(); }));
  document.querySelectorAll('[data-input-language]').forEach(el=>el.addEventListener('click',()=>{ localStorage.setItem(STORAGE_KEYS.input,el.dataset.inputLanguage); render(); }));
}

window.addEventListener('hashchange',render);
window.addEventListener('DOMContentLoaded',render);
