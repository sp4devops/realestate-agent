const STORAGE_KEYS = { display: 'pa.displayLanguage', input: 'pa.inputLanguage' };
const app = document.getElementById('app');
const repository = window.PropertyAssistantPersistence.createRepository(localStorage);
let bootError = null;
try {
  repository.migrateAndPersist();
} catch (error) {
  bootError = error instanceof Error ? error.message : 'Local data could not be opened safely.';
}
window.__PA_REPOSITORY__ = repository;
window.__PA_BOOT_ERROR__ = bootError;

const displayLanguages = {
  en: {
    label:'English',
    short:'EN',
    nav:{home:'Home',requirements:'Requirements',properties:'Properties',matches:'Matches',followups:'Follow-ups'},
    actions:{speak:'Speak & Save',type:'Type & Save',scan:'Scan Poster'},
    ui:{
      greeting:'Good morning, Property Advisor',
      greetingHint:"Let's find the right property or person.",
      captureTitle:'Capture a lead, property or update',
      captureHint:'Speak or type naturally. I will organize it for you.',
      capturePlaceholder:'Example: Ramesh needs 2BHK rent in Erode under ₹15k',
      understood:'I understood',
      reviewSave:'Review & Save',
      suggested:'Suggested matches',
      recent:'Recent activity',
      quickTools:'Quick tools',
      viewAll:'View all',
      requirements:'Requirements',
      requirementsHint:'People actively looking for a property.',
      properties:'Properties',
      propertiesHint:'Available sale, rent and lease inventory.',
      matches:'Matches',
      matchesHint:'Smart links between requirements and properties.',
      followups:'Follow-ups',
      followupsHint:'The right people to contact next.',
      all:'All',
      buyers:'Buyers',
      tenants:'Tenants',
      sale:'Sale',
      rent:'Rent',
      lease:'Lease',
      call:'Call',
      whatsapp:'WhatsApp',
      done:'Done',
      open:'Open',
      today:'Today',
      upcoming:'Upcoming',
      completed:'Completed',
      noRequirements:'No requirements yet. Capture what a buyer or tenant needs.',
      noProperties:'No properties yet. Capture an owner or available property.',
      noMatches:'No useful matches yet. Add one requirement and one property.',
      noFollowups:'Nothing pending. Your follow-up queue is clear.'
    }
  },
  ta: {
    label:'தமிழ்',
    short:'TA',
    nav:{home:'முகப்பு',requirements:'தேவைகள்',properties:'சொத்துகள்',matches:'பொருத்தங்கள்',followups:'தொடர்புகள்'},
    actions:{speak:'பேசி சேமி',type:'தட்டச்சு செய்து சேமி',scan:'போஸ்டர் ஸ்கேன்'},
    ui:{
      greeting:'வணக்கம், Property Advisor',
      greetingHint:'சரியான சொத்து அல்லது நபரை கண்டுபிடிப்போம்.',
      captureTitle:'தேவை, சொத்து அல்லது மாற்றத்தை பதிவு செய்க',
      captureHint:'இயல்பாக பேசுங்கள் அல்லது தட்டச்சு செய்யுங்கள். நான் ஒழுங்குபடுத்துகிறேன்.',
      capturePlaceholder:'உதாரணம்: ரமேஷுக்கு ஈரோட்டில் ₹15k-க்கு 2BHK வாடகை வேண்டும்',
      understood:'நான் புரிந்துகொண்டது',
      reviewSave:'சரிபார்த்து சேமி',
      suggested:'பரிந்துரைக்கப்பட்ட பொருத்தங்கள்',
      recent:'சமீபத்திய செயல்கள்',
      quickTools:'விரைவு கருவிகள்',
      viewAll:'அனைத்தும்',
      requirements:'தேவைகள்',
      requirementsHint:'சொத்து தேடும் வாங்குபவர்கள் மற்றும் வாடகையாளர்கள்.',
      properties:'சொத்துகள்',
      propertiesHint:'விற்பனை, வாடகை மற்றும் குத்தகை சொத்துகள்.',
      matches:'பொருத்தங்கள்',
      matchesHint:'தேவைகளுக்கும் சொத்துகளுக்கும் உள்ள சிறந்த இணைப்புகள்.',
      followups:'தொடர்புகள்',
      followupsHint:'அடுத்து தொடர்புகொள்ள வேண்டியவர்கள்.',
      all:'அனைத்தும்',
      buyers:'வாங்குபவர்கள்',
      tenants:'வாடகையாளர்கள்',
      sale:'விற்பனை',
      rent:'வாடகை',
      lease:'குத்தகை',
      call:'அழை',
      whatsapp:'WhatsApp',
      done:'முடிந்தது',
      open:'திற',
      today:'இன்று',
      upcoming:'அடுத்து',
      completed:'முடிக்கப்பட்டவை',
      noRequirements:'தேவைகள் இல்லை. வாங்குபவர் அல்லது வாடகையாளரின் தேவையை பதிவு செய்க.',
      noProperties:'சொத்துகள் இல்லை. உரிமையாளர் அல்லது கிடைக்கும் சொத்தை பதிவு செய்க.',
      noMatches:'பொருத்தம் இல்லை. ஒரு தேவையும் ஒரு சொத்தும் சேர்க்கவும்.',
      noFollowups:'நிலுவை இல்லை. தொடர்பு பட்டியல் காலியாக உள்ளது.'
    }
  },
  tg: {
    label:'Tanglish',
    short:'Tanglish',
    nav:{home:'Home',requirements:'Thevaigal',properties:'Properties',matches:'Matches',followups:'Follow-ups'},
    actions:{speak:'Pesitu Save Pannu',type:'Type Panni Save Pannu',scan:'Poster Scan Pannu'},
    ui:{
      greeting:'Vanakkam, Property Advisor',
      greetingHint:'Correct property illa person-ah find pannalam.',
      captureTitle:'Lead, property illa update-ah capture pannu',
      captureHint:'Natural-ah pesu illa type pannu. Naan organize panren.',
      capturePlaceholder:'Example: Ramesh-ku Erode-la ₹15k-kulla 2BHK rent venum',
      understood:'Naan purinjukittadhu',
      reviewSave:'Check panni Save',
      suggested:'Suggested matches',
      recent:'Recent activity',
      quickTools:'Quick tools',
      viewAll:'Ellam paaru',
      requirements:'Thevaigal',
      requirementsHint:'Property thedura buyers and tenants.',
      properties:'Properties',
      propertiesHint:'Sale, rent and lease-ku available inventory.',
      matches:'Matches',
      matchesHint:'Requirements-um properties-um smart-ah connect aagum.',
      followups:'Follow-ups',
      followupsHint:'Aduthu yaarukku contact pannanum.',
      all:'Ellam',
      buyers:'Buyers',
      tenants:'Tenants',
      sale:'Sale',
      rent:'Rent',
      lease:'Lease',
      call:'Call',
      whatsapp:'WhatsApp',
      done:'Done',
      open:'Open',
      today:'Innaiku',
      upcoming:'Upcoming',
      completed:'Completed',
      noRequirements:'Requirement illa. Buyer illa tenant enna theduraanga-nu capture pannu.',
      noProperties:'Property illa. Owner illa available property-ah capture pannu.',
      noMatches:'Useful match illa. Oru requirement-um property-um add pannu.',
      noFollowups:'Pending edhuvum illa. Follow-up queue clear.'
    }
  }
};

const inputLanguages = [
  {id:'auto',label:'Auto detect'}, {id:'ta',label:'Tamil'}, {id:'en',label:'English'}, {id:'tg',label:'Tanglish'}
];

const routes = {
  splash: ['Property Assistant','Private, local-first memory and deal assistant for Property Advisors.'],
  onboarding: ['Welcome','Set up the app in a few simple steps. Your business memory stays on this device.'],
  home: ['Home','Capture new business memory and see what needs attention.'],
  requirements: ['Requirements','People actively looking for a property.'],
  properties: ['Properties','Available property supply.'],
  speak: ['Speak & Save','Capture a spoken note using on-device speech recognition when available.'],
  type: ['Type & Save','Capture a natural-language business note and review the extracted details before saving.'],
  review: ['Review','Confirm extracted information before saving.'],
  'after-call': ['After-call recap','Quickly capture what changed after a call without recording the call itself.'],
  ask: ['Ask','Search your local business memory with voice or typing.'],
  people: ['People','Remember Property Advisors, owners, buyers, tenants and contacts.'],
  person: ['Person detail','View contact details and saved requirements.'],
  property: ['Property detail','View structured property facts and related actions.'],
  matches: ['Matches','See demand and supply connections with clear match reasons.'],
  match: ['Match detail','Understand why a match exists and take the next action.'],
  poster: ['Scan Poster','Capture a poster or choose an image.'],
  'poster-review': ['Poster review','Confirm phone number and extracted details before save.'],
  'poster-lead': ['Poster lead','Review saved poster details and matching opportunities.'],
  followups: ['Follow-ups','See useful next actions without CRM complexity.'],
  language: ['Language','Display language and speech/input language are separate settings.'],
  settings: ['Settings & Backup','Manage privacy, encrypted backup, restore and personalization.']
};

const primaryNav = [
  ['home','home'], ['requirements','requirements'], ['properties','properties'], ['matches','matches'], ['followups','followups']
];

const iconPaths = {
  home:'<path d="M3 10.8 12 3l9 7.8"/><path d="M5.5 9.8V21h13V9.8"/><path d="M9.5 21v-7h5v7"/>',
  requirements:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 8 1.3 1.3L12 6.5M8 13l1.3 1.3L12 11.5M14.5 8H17M14.5 13H17M8 18h9"/>',
  properties:'<path d="M4 21V8h7v13M11 21V3h9v18M2 21h20"/><path d="M7 11h1M7 15h1M15 7h1M15 11h1M15 15h1"/>',
  matches:'<path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',
  followups:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  microphone:'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>',
  keyboard:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M18 10h.01M7 14h.01M11 14h6"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  pin:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  sparkles:'<path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM5 15l.7 2.3L8 18l-2.3.7L5 21l-.7-2.3L2 18l2.3-.7L5 15ZM19 13l.7 2.3L22 16l-2.3.7L19 19l-.7-2.3L16 16l2.3-.7L19 13Z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  arrow:'<path d="m9 18 6-6-6-6"/>',
  camera:'<path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z"/><circle cx="12" cy="13" r="4"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>'
};

function icon(name,className='icon'){
  return '<svg class="'+className+'" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+(iconPaths[name] || iconPaths.sparkles)+'</svg>';
}

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

function titleCase(value){ return String(value || '').replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase()); }
function initials(value){
  const parts=String(value || 'Property Advisor').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0,2).map(part=>part[0]).join('').toUpperCase();
}
function formatMoney(value,monthly=false){
  if(value == null) return 'Price not set';
  const amount=Number(value);
  let label;
  if(amount >= 10000000) label=`₹${(amount/10000000).toFixed(amount%10000000===0?0:1)} Cr`;
  else if(amount >= 100000) label=`₹${(amount/100000).toFixed(amount%100000===0?0:1)} L`;
  else label=`₹${amount.toLocaleString('en-IN')}`;
  return monthly ? `${label} / month` : label;
}
function sizeLabel(size){ return size ? `${escapeHtml(size.value)} ${escapeHtml(size.unit)}` : 'Size not set'; }
function propertyTitle(property){ return `${titleCase(property?.propertyType || 'Property')} in ${property?.locality || 'Location pending'}`; }
function matchRecordId(requirementId,propertyId){ return `match-${requirementId}-${propertyId}`; }
function requirementPerson(requirement){ return requirement ? repository.get('people',requirement.personId) : null; }
function propertyOwner(property){ return property?.ownerPersonId ? repository.get('people',property.ownerPersonId) : null; }
function rankedMatches(){
  return window.PropertyAssistantMatching
    ? window.PropertyAssistantMatching.rank(repository.list('requirements'),repository.list('properties'))
    : [];
}
function matchContext(match){
  const requirement=repository.get('requirements',match.requirementId);
  const property=repository.get('properties',match.propertyId);
  return {match,requirement,property,person:requirementPerson(requirement),owner:propertyOwner(property)};
}
function parsedSummary(parsed){
  if(!parsed?.ok) return [];
  const record=parsed.kind==='requirement' ? parsed.requirement : parsed.property;
  const chips=[];
  chips.push({icon:'user',label:parsed.kind==='requirement' ? titleCase(parsed.person?.role || 'buyer') : 'Owner / Property'});
  if(record?.intent) chips.push({icon:'sparkles',label:titleCase(record.intent)});
  if(record?.propertyType) chips.push({icon:'properties',label:titleCase(record.propertyType)});
  const locality=parsed.kind==='requirement' ? record?.locations?.[0] : record?.locality;
  if(locality) chips.push({icon:'pin',label:locality});
  const amount=parsed.kind==='requirement' ? record?.budgetMax : record?.price;
  if(amount != null) chips.push({icon:'sparkles',label:formatMoney(amount,record?.intent==='rent')});
  if(record?.size) chips.push({icon:'requirements',label:sizeLabel(record.size)});
  if(record?.timing) chips.push({icon:'followups',label:record.timing});
  for(const preference of (parsed.kind==='requirement' ? record?.preferences : record?.attributes) || []) chips.push({icon:'check',label:preference});
  return chips;
}

function shell(content, active){
  const text=t();
  const nav = primaryNav.map(([id,iconName]) => {
    const selected=active===id;
    return `<button type="button" class="nav-item ${selected?'active':''}" data-route="${id}" aria-label="${text.nav[id]}"${selected?' aria-current="page"':''} data-testid="nav-${id}">${icon(iconName,'nav-icon')}<small>${text.nav[id]}</small></button>`;
  }).join('');
  const language=Object.entries(displayLanguages).map(([id,value])=>`<button type="button" class="quick-language ${getDisplayLanguage()===id?'active':''}" data-quick-language="${id}" aria-pressed="${getDisplayLanguage()===id}">${value.short}</button>`).join('<span aria-hidden="true">|</span>');
  return `<div class="app-shell"><header class="topbar"><button class="brand" data-route="home" aria-label="Property Assistant home"><span class="brand-mark"><span>P</span></span><span class="brand-copy"><strong>Property Assistant</strong><small>Your local property second brain</small></span></button><div class="topbar-actions"><div class="language-chip" role="group" aria-label="App display language" data-testid="language-chip">${language}</div><button class="icon-button" data-route="ask" type="button" aria-label="Search local memory" data-testid="header-search">${icon('search')}</button></div></header><main>${content}</main><nav class="bottom-nav" aria-label="Primary navigation">${nav}</nav></div>`;
}

function renderHome(){
  const text=t();
  const copy=text.ui;
  const matches=rankedMatches().slice(0,2).map(matchContext).filter(item=>item.requirement&&item.property&&item.person);
  const matchCards=matches.map(({match,property,person})=>`<article class="mini-property-card" data-testid="home-match-card"><div class="property-visual ${escapeHtml(property.propertyType)}">${icon(property.propertyType==='land'?'pin':'properties','property-visual-icon')}</div><div class="mini-property-copy"><div class="card-topline"><span class="match-pill">${match.score}% Match</span><button class="bookmark-button" type="button" data-open-match="${escapeHtml(matchRecordId(match.requirementId,match.propertyId))}" aria-label="Open match">${icon('arrow')}</button></div><strong>${escapeHtml(propertyTitle(property))}</strong><p>${icon('pin','inline-icon')}${escapeHtml(property.locality)}</p><b>${formatMoney(property.price,property.intent==='rent')}</b><small>${sizeLabel(property.size)} · for ${escapeHtml(person.name)}</small></div></article>`).join('');
  const requirements=repository.list('requirements').sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0,2);
  const followups=repository.list('followUps').filter(item=>item.status==='open').sort((a,b)=>new Date(a.dueAt)-new Date(b.dueAt)).slice(0,2);
  const activity=[
    ...requirements.map(requirement=>({kind:'requirement',requirement,person:requirementPerson(requirement),date:requirement.updatedAt})),
    ...followups.map(followup=>({kind:'followup',followup,date:followup.updatedAt || followup.createdAt}))
  ].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,3);
  const activityRows=activity.map(item=>{
    if(item.kind==='requirement'){
      const person=item.person;
      return `<button class="activity-row" type="button" data-person-id="${escapeHtml(person?.id || '')}"><span class="avatar">${initials(person?.name)}</span><span><strong>${escapeHtml(person?.name || 'Saved requirement')} — ${titleCase(item.requirement.propertyType)} ${titleCase(item.requirement.intent)}</strong><small>${escapeHtml(item.requirement.locations?.join(' / ') || 'Location pending')} · ${item.requirement.budgetMax==null?'Budget pending':formatMoney(item.requirement.budgetMax)}</small></span><span class="status-badge new">New</span>${icon('arrow')}</button>`;
    }
    return `<button class="activity-row" type="button" data-route="followups"><span class="avatar gold">${icon('followups')}</span><span><strong>${escapeHtml(item.followup.title)}</strong><small>${new Date(item.followup.dueAt).toLocaleString()}</small></span><span class="status-badge">Pending</span>${icon('arrow')}</button>`;
  }).join('');
  return shell(`<section class="assistant-intro"><div class="greeting-mark" aria-hidden="true">☀</div><div><h1 data-testid="home-heading">${copy.greeting}</h1><p>${copy.greetingHint}</p></div></section><section class="assistant-capture" aria-labelledby="capture-title"><div class="capture-heading"><span class="capture-person">${icon('user')}</span><div><h2 id="capture-title">${copy.captureTitle}</h2><p>${copy.captureHint}</p></div></div><div class="capture-composer"><button class="mic-button" type="button" data-route="speak" data-testid="speak-save" aria-label="${text.actions.speak}">${icon('microphone','mic-icon')}</button><label class="sr-only" for="home-capture">Natural-language property note</label><textarea id="home-capture" data-testid="home-capture-text" rows="2" placeholder="${copy.capturePlaceholder}"></textarea><button class="keyboard-button" type="button" data-route="type" data-testid="type-save" aria-label="${text.actions.type}">${icon('keyboard')}</button></div><div class="parsed-summary" data-testid="home-parsed-summary" hidden><div class="parsed-label">${icon('sparkles')}<strong>${copy.understood}</strong></div><div class="summary-chips" data-testid="home-summary-chips"></div></div><div class="capture-footer"><button class="detail-button" type="button" data-route="type">${icon('plus')} Add detail</button><button class="button primary save-memory" type="button" data-testid="home-review-save" disabled>${icon('check')} ${copy.reviewSave}</button></div><p class="capture-error" data-testid="home-capture-error" hidden></p></section><section class="home-section"><div class="section-heading"><h2>${copy.suggested}</h2><button data-route="matches" class="text-button">${copy.viewAll} ${icon('arrow')}</button></div><div class="match-scroll" data-testid="home-matches">${matchCards || `<div class="empty-state compact">${icon('matches')}<p>${copy.noMatches}</p><button class="button" type="button" data-route="type">${text.actions.type}</button></div>`}</div></section><section class="home-section"><div class="section-heading"><h2>${copy.recent}</h2><button data-route="requirements" class="text-button">${copy.viewAll} ${icon('arrow')}</button></div><div class="activity-list" data-testid="recent-activity">${activityRows || `<div class="empty-state compact">${icon('sparkles')}<p>Every saved conversation will appear here as useful business memory.</p></div>`}</div></section><section class="home-section quick-tools-section"><div class="section-heading"><h2>${copy.quickTools}</h2></div><div class="quick-actions"><button class="tool-button" type="button" data-route="people">${icon('user')} Contacts</button><button class="tool-button" type="button" data-route="poster">${icon('camera')} ${text.actions.scan}</button><button class="tool-button" type="button" data-route="after-call">${icon('phone')} After-call recap</button><button class="tool-button" type="button" data-route="settings">${icon('settings')} Settings & Backup</button></div></section>`, 'home');
}

function renderRequirements(){
  const copy=t().ui;
  const matches=rankedMatches();
  const requirements=repository.list('requirements').sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const cards=requirements.map(requirement=>{
    const person=requirementPerson(requirement);
    const role=person?.role==='tenant'?'tenant':'buyer';
    const related=matches.filter(match=>match.requirementId===requirement.id).sort((a,b)=>b.score-a.score);
    const interaction=repository.list('interactions').filter(item=>(item.personIds||[]).includes(person?.id)).sort((a,b)=>new Date(b.occurredAt)-new Date(a.occurredAt))[0];
    const note=interaction?.summary || requirement.sourceText || `${person?.name || 'This person'} needs ${requirement.propertyType || 'a property'} in ${requirement.locations?.join(' / ') || 'a location to confirm'}.`;
    const preferenceChips=(requirement.preferences || []).map(value=>`<span>${icon('check','inline-icon')}${escapeHtml(value)}</span>`).join('');
    return `<article class="memory-card requirement-card" data-testid="requirement-card" data-role="${role}"><div class="memory-card-head"><span class="avatar">${initials(person?.name)}</span><div><h2>${escapeHtml(person?.name || 'Unknown person')} <span class="status-badge active">Active</span></h2><p>Updated ${new Date(requirement.updatedAt || requirement.createdAt).toLocaleDateString()}</p></div><button class="more-button" type="button" data-person-id="${escapeHtml(person?.id || '')}" aria-label="Open ${escapeHtml(person?.name || 'person')}">${icon('arrow')}</button></div><div class="memory-facts"><div><span>${icon('home')} Requirement</span><strong>${titleCase(requirement.propertyType)} ${titleCase(requirement.intent)}</strong></div><div><span>${icon('pin')} Location</span><strong>${escapeHtml(requirement.locations?.join(' / ') || 'Not set')}</strong></div><div><span>₹ Budget</span><strong>${requirement.budgetMin!=null?formatMoney(requirement.budgetMin)+' – ':''}${requirement.budgetMax!=null?formatMoney(requirement.budgetMax):'Not set'}</strong></div><div><span>${icon('requirements')} Size</span><strong>${sizeLabel(requirement.size)}</strong></div><div><span>${icon('followups')} Timing</span><strong>${escapeHtml(requirement.timing || 'Not set')}</strong></div></div>${preferenceChips?`<div class="reason-chips preference-chips">${preferenceChips}</div>`:''}<div class="ai-memory-note"><span>${icon('sparkles')}</span><div><strong>Remembered note</strong><p>${escapeHtml(note)}</p></div></div><div class="memory-card-foot"><span>${related.length} match${related.length===1?'':'es'} found</span><button class="text-button" type="button" data-route="matches">${copy.viewAll} ${icon('arrow')}</button></div></article>`;
  }).join('');
  return shell(`<section class="screen-page"><div class="screen-heading"><div><h1>${copy.requirements}</h1><p>${copy.requirementsHint}</p></div><button class="icon-button" type="button" data-route="type" aria-label="Add requirement">${icon('plus')}</button></div><div class="filter-tabs" role="group" aria-label="Requirement filters"><button class="filter-tab active" type="button" data-requirement-filter="all">${copy.all}</button><button class="filter-tab" type="button" data-requirement-filter="buyer">${copy.buyers}</button><button class="filter-tab" type="button" data-requirement-filter="tenant">${copy.tenants}</button></div><div class="memory-list" data-testid="requirements-list">${cards || `<div class="empty-state">${icon('requirements')}<p>${copy.noRequirements}</p><button class="button primary" type="button" data-route="type">${t().actions.type}</button></div>`}</div></section>`,'requirements');
}

function renderProperties(){
  const copy=t().ui;
  const matches=rankedMatches();
  const properties=repository.list('properties').sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const cards=properties.map(property=>{
    const owner=propertyOwner(property);
    const related=matches.filter(match=>match.propertyId===property.id);
    const attributeChips=(property.attributes || []).map(value=>`<span>${escapeHtml(value)}</span>`).join('');
    return `<article class="memory-card property-memory-card" data-testid="property-card" data-intent="${escapeHtml(property.intent)}"><div class="property-card-layout"><div class="property-visual large ${escapeHtml(property.propertyType)}">${icon(property.propertyType==='land'?'pin':'properties','property-visual-icon')}</div><div class="property-card-copy"><div class="memory-card-head compact"><div><h2>${escapeHtml(propertyTitle(property))}</h2><p>${escapeHtml(owner?.name || 'Owner not linked')} · ${titleCase(property.intent)}</p></div><button class="more-button" type="button" data-property-id="${escapeHtml(property.id)}" aria-label="Open property">${icon('arrow')}</button></div><strong class="property-price">${formatMoney(property.price,property.intent==='rent')}</strong><p>${sizeLabel(property.size)} · ${escapeHtml(property.locality)}</p><div class="reason-chips"><span>${related.length} buyer match${related.length===1?'':'es'}</span>${attributeChips}<span>Stored locally</span></div></div></div></article>`;
  }).join('');
  return shell(`<section class="screen-page"><div class="screen-heading"><div><h1>${copy.properties}</h1><p>${copy.propertiesHint}</p></div><button class="icon-button" type="button" data-route="type" aria-label="Add property">${icon('plus')}</button></div><div class="filter-tabs" role="group" aria-label="Property filters"><button class="filter-tab active" type="button" data-property-filter="all">${copy.all}</button><button class="filter-tab" type="button" data-property-filter="sale">${copy.sale}</button><button class="filter-tab" type="button" data-property-filter="rent">${copy.rent}</button><button class="filter-tab" type="button" data-property-filter="lease">${copy.lease}</button></div><div class="memory-list" data-testid="properties-list">${cards || `<div class="empty-state">${icon('properties')}<p>${copy.noProperties}</p><button class="button primary" type="button" data-route="type">${t().actions.type}</button></div>`}</div></section>`,'properties');
}

function renderPeople(){
  const people=repository.list('people').sort((a,b)=>a.name.localeCompare(b.name));
  const cards=people.map(person=>{
    const requirements=repository.list('requirements').filter(item=>item.personId===person.id).length;
    const properties=repository.list('properties').filter(item=>item.ownerPersonId===person.id).length;
    const notes=repository.list('interactions').filter(item=>(item.personIds||[]).includes(person.id)).length;
    return `<article class="memory-card contact-card" data-testid="person-card"><span class="avatar">${initials(person.name)}</span><div><h2>${escapeHtml(person.name)}</h2><p>${titleCase(person.role)} · ${escapeHtml(person.primaryPhone)}</p><small>${requirements} requirement${requirements===1?'':'s'} · ${properties} propert${properties===1?'y':'ies'} · ${notes} remembered note${notes===1?'':'s'}</small></div><button type="button" class="button" data-person-id="${escapeHtml(person.id)}">${t().ui.open}</button></article>`;
  }).join('');
  return shell(`<section class="screen-page"><div class="screen-heading"><div><h1>Contacts</h1><p>Owners, customers, builders and Property Advisors remembered locally.</p></div><button class="icon-button" type="button" data-route="type" aria-label="Add contact">${icon('plus')}</button></div><div class="memory-list" data-testid="people-list">${cards || `<div class="empty-state">${icon('user')}<h2>No contacts yet</h2><p>Capture a person naturally and their contact will appear here.</p><button class="button primary" type="button" data-route="type">${t().actions.type}</button></div>`}</div></section>`, '');
}

function renderPerson(){
  const id=routeParams().get('id') || '';
  const person=id ? repository.get('people', id) : null;
  if(!person) return shell(`<section class="page"><h1>Person not found</h1><p class="lead">This local record no longer exists.</p>${button('Back to People','people')}</section>`, 'people');
  const alternates=(person.alternatePhones || []).map(phone=>`<li>${escapeHtml(phone)}</li>`).join('') || '<li>None</li>';
  const requirements=repository.list('requirements').filter(item=>item.personId===person.id);
  const properties=repository.list('properties').filter(item=>item.ownerPersonId===person.id);
  const interactions=repository.list('interactions').filter(item=>(item.personIds||[]).includes(person.id)).sort((a,b)=>new Date(b.occurredAt)-new Date(a.occurredAt));
  const followups=repository.list('followUps').filter(item=>item.personId===person.id&&item.status==='open').sort((a,b)=>new Date(a.dueAt)-new Date(b.dueAt));
  const requirementCards=requirements.map(item=>`<button class="linked-memory-row" type="button" data-route="requirements"><span>${icon('requirements')}</span><span><strong>${titleCase(item.propertyType)} ${titleCase(item.intent)}</strong><small>${escapeHtml(item.locations?.join(' / ') || 'Location pending')} · ${item.budgetMax==null?'Budget pending':formatMoney(item.budgetMax)}</small></span>${icon('arrow')}</button>`).join('');
  const propertyCards=properties.map(item=>`<button class="linked-memory-row" type="button" data-property-id="${escapeHtml(item.id)}"><span>${icon('properties')}</span><span><strong>${escapeHtml(propertyTitle(item))}</strong><small>${formatMoney(item.price,item.intent==='rent')} · ${sizeLabel(item.size)}</small></span>${icon('arrow')}</button>`).join('');
  const memories=[
    ...interactions.map(item=>({date:item.occurredAt,summary:item.summary || titleCase(item.kind)})),
    ...requirements.filter(item=>item.sourceText).map(item=>({date:item.createdAt,summary:item.sourceText})),
    ...properties.filter(item=>item.sourceText).map(item=>({date:item.createdAt,summary:item.sourceText}))
  ].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const history=memories.map(item=>`<li><span>${new Date(item.date).toLocaleDateString()}</span><p>${escapeHtml(item.summary)}</p></li>`).join('');
  return shell(`<section class="screen-page detail-page"><div class="person-hero"><span class="avatar large">${initials(person.name)}</span><div><p class="eyebrow">PROPERTY MEMORY</p><h1 data-testid="person-name">${escapeHtml(person.name)}</h1><p>${titleCase(person.role)}</p></div></div><div class="detail-grid"><section class="detail-panel"><h2>Contact</h2><strong data-testid="primary-phone">${escapeHtml(person.primaryPhone)}</strong><p>Alternate phones</p><ul>${alternates}</ul></section><section class="detail-panel"><h2>Next action</h2>${followups[0]?`<strong>${escapeHtml(followups[0].title)}</strong><p>${new Date(followups[0].dueAt).toLocaleString()}</p><button class="button" type="button" data-route="followups">Open follow-up</button>`:'<p>No open follow-up.</p><button class="button" type="button" data-route="after-call">Add recap</button>'}</section></div>${requirements.length?`<section class="detail-panel"><h2>Requirements</h2>${requirementCards}</section>`:''}${properties.length?`<section class="detail-panel"><h2>Properties</h2>${propertyCards}</section>`:''}<section class="detail-panel"><div class="section-heading"><h2>What I remember</h2><button class="text-button" type="button" data-route="after-call">${icon('plus')} Add recap</button></div>${history?`<ol class="memory-timeline">${history}</ol>`:'<div class="empty-inline">No conversation history yet. Add a recap after the next call.</div>'}</section><div class="page-actions">${button('Back to Contacts','people')}</div></section>`, '');
}

function renderProperty(){
  const id=routeParams().get('id') || '';
  const property=id ? repository.get('properties', id) : null;
  if(!property) return shell(`<section class="page"><h1>Property not found</h1><p class="lead">This local record no longer exists.</p>${button('Back to Home','home')}</section>`, '');
  const size=property.size ? ` · ${escapeHtml(property.size.value)} ${escapeHtml(property.size.unit)}` : '';
  const owner=propertyOwner(property);
  const matches=rankedMatches().filter(item=>item.propertyId===property.id).map(matchContext);
  const buyerRows=matches.map(item=>`<button class="linked-memory-row" type="button" data-open-match="${escapeHtml(matchRecordId(item.match.requirementId,item.match.propertyId))}"><span class="match-score-small">${item.match.score}%</span><span><strong>${escapeHtml(item.person?.name || 'Buyer')}</strong><small>${escapeHtml(item.match.reasons.slice(1).join(' · '))}</small></span>${icon('arrow')}</button>`).join('');
  const attributes=(property.attributes || []).map(value=>`<span>${icon('check','inline-icon')}${escapeHtml(value)}</span>`).join('');
  return shell(`<section class="screen-page detail-page"><div class="property-detail-hero"><div class="property-visual large ${escapeHtml(property.propertyType)}">${icon(property.propertyType==='land'?'pin':'properties','property-visual-icon')}</div><div><p class="eyebrow">AVAILABLE ${escapeHtml(property.intent).toUpperCase()}</p><h1 data-testid="property-title">${escapeHtml(property.propertyType)} in ${escapeHtml(property.locality)}</h1><strong class="property-price">${formatMoney(property.price,property.intent==='rent')}</strong><p>${titleCase(property.intent)}${size}</p></div></div><div class="detail-grid"><section class="detail-panel"><h2>Owner</h2>${owner?`<button class="linked-memory-row simple" type="button" data-person-id="${escapeHtml(owner.id)}"><span class="avatar">${initials(owner.name)}</span><span><strong>${escapeHtml(owner.name)}</strong><small>${escapeHtml(owner.primaryPhone)}</small></span>${icon('arrow')}</button>`:'<p>Owner not linked yet.</p>'}</section><section class="detail-panel"><h2>Memory status</h2><strong>Stored privately on this device</strong><p>Updated ${new Date(property.updatedAt || property.createdAt).toLocaleDateString()}</p></section></div>${attributes?`<section class="detail-panel"><h2>Property attributes</h2><div class="reason-chips">${attributes}</div></section>`:''}${property.sourceText?`<section class="detail-panel"><h2>Original capture</h2><p>${escapeHtml(property.sourceText)}</p></section>`:''}<section class="detail-panel"><div class="section-heading"><h2>Suitable people</h2><button class="text-button" type="button" data-route="matches">${t().ui.viewAll} ${icon('arrow')}</button></div>${buyerRows || '<div class="empty-inline">No suitable requirements yet.</div>'}</section><div class="page-actions">${button('View all properties','properties')}${button('View Matches','matches','button primary')}</div></section>`, 'properties');
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
  const trust = id==='splash'
    ? `<div class="welcome-card"><strong>Private by default</strong><p>Capture people, properties and requirements without sending your business memory to a cloud account.</p></div>`
    : id==='onboarding'
      ? `<div class="welcome-card"><strong>Ready for everyday work</strong><p>Choose your language, capture a note, review the details and save. You can change settings later.</p></div>`
      : `<div class="welcome-card"><strong>Local-first</strong><p>Your core records remain on this device and stay usable without an AI model.</p></div>`;
  const content=`<section class="page"><p class="eyebrow">PROPERTY ASSISTANT</p><h1 data-testid="screen-title">${title}</h1><p class="lead">${description}</p>${trust}<div class="page-actions">${actions}</div></section>`;
  if(id==='splash') return `<div class="splash">${content}</div>`;
  return shell(content, primaryNav.some(([nav])=>nav===id)?id:'');
}

function renderRecovery(){
  const message=escapeHtml(bootError || 'Local data could not be opened safely.');
  return shell(`<section class="page"><p class="eyebrow">RECOVERY REQUIRED</p><h1>Local memory needs recovery</h1><p class="lead">Property Assistant stopped before changing your stored business data.</p><div class="placeholder-card"><strong>What happened</strong><p data-testid="boot-error">${message}</p><p>Restore a known-good encrypted backup from Settings. Do not clear app data unless you have already secured a backup.</p></div><div class="page-actions">${button('Open Settings & Backup','settings','button primary')}</div></section>`,'settings');
}

function render(){
  const id=route();
  if(bootError && id!=='settings') {
    app.innerHTML=renderRecovery();
    bind();
    return;
  }
  try {
    app.innerHTML = id==='home' ? renderHome() : id==='requirements' ? renderRequirements() : id==='properties' ? renderProperties() : id==='language' ? renderLanguage() : id==='people' ? renderPeople() : id==='person' ? renderPerson() : id==='property' ? renderProperty() : renderGeneric(id);
  } catch (error) {
    bootError = error instanceof Error ? error.message : 'Local data could not be opened safely.';
    window.__PA_BOOT_ERROR__ = bootError;
    app.innerHTML=renderRecovery();
  }
  document.documentElement.lang = getDisplayLanguage()==='ta'?'ta':'en';
  bind();
}

function bind(){
  document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',()=>go(el.dataset.route)));
  document.querySelectorAll('[data-person-id]').forEach(el=>el.addEventListener('click',()=>{ if(el.dataset.personId) location.hash=`#/person?id=${encodeURIComponent(el.dataset.personId)}`; }));
  document.querySelectorAll('[data-property-id]').forEach(el=>el.addEventListener('click',()=>{ location.hash=`#/property?id=${encodeURIComponent(el.dataset.propertyId)}`; }));
  document.querySelectorAll('[data-open-match]').forEach(el=>el.addEventListener('click',()=>{ location.hash=`#/match?id=${encodeURIComponent(el.dataset.openMatch)}`; }));
  document.querySelectorAll('[data-display-language]').forEach(el=>el.addEventListener('click',()=>setDisplayLanguage(el.dataset.displayLanguage)));
  document.querySelectorAll('[data-input-language]').forEach(el=>el.addEventListener('click',()=>{ localStorage.setItem(STORAGE_KEYS.input,el.dataset.inputLanguage); render(); }));
  document.querySelectorAll('[data-requirement-filter]').forEach(el=>el.addEventListener('click',()=>{
    const filter=el.dataset.requirementFilter;
    document.querySelectorAll('[data-requirement-filter]').forEach(item=>item.classList.toggle('active',item===el));
    document.querySelectorAll('[data-testid="requirement-card"]').forEach(card=>{ card.hidden=filter!=='all'&&card.dataset.role!==filter; });
  }));
  document.querySelectorAll('[data-property-filter]').forEach(el=>el.addEventListener('click',()=>{
    const filter=el.dataset.propertyFilter;
    document.querySelectorAll('[data-property-filter]').forEach(item=>item.classList.toggle('active',item===el));
    document.querySelectorAll('[data-testid="property-card"]').forEach(card=>{ card.hidden=filter!=='all'&&card.dataset.intent!==filter; });
  }));
  const capture=document.querySelector('[data-testid="home-capture-text"]');
  const save=document.querySelector('[data-testid="home-review-save"]');
  if(capture&&save){
    let draft=null;
    const summary=document.querySelector('[data-testid="home-parsed-summary"]');
    const chips=document.querySelector('[data-testid="home-summary-chips"]');
    const error=document.querySelector('[data-testid="home-capture-error"]');
    const update=()=>{
      const value=capture.value.trim();
      error.hidden=true;
      if(!value){ draft=null; summary.hidden=true; save.disabled=true; chips.innerHTML=''; return; }
      draft=window.PropertyAssistantCapture.parse(value);
      if(!draft.ok){ summary.hidden=true; save.disabled=true; return; }
      chips.innerHTML=parsedSummary(draft).map(item=>`<span class="summary-chip">${icon(item.icon,'inline-icon')}${escapeHtml(item.label)}</span>`).join('');
      summary.hidden=false;
      save.disabled=false;
    };
    capture.addEventListener('input',update);
    capture.addEventListener('keydown',event=>{ if((event.ctrlKey||event.metaKey)&&event.key==='Enter'&&!save.disabled) save.click(); });
    save.addEventListener('click',()=>{
      if(!draft?.ok){ error.hidden=false; error.textContent='Add a useful property note before reviewing.'; return; }
      sessionStorage.setItem('pa.captureDraft',JSON.stringify(draft));
      go('review');
    });
  }
}

function setDisplayLanguage(language){
  if(!displayLanguages[language]) return;
  localStorage.setItem(STORAGE_KEYS.display,language);
  render();
  setTimeout(()=>window.dispatchEvent(new HashChangeEvent('hashchange')),0);
}

function updateKeyboardState(){
  const viewport=window.visualViewport;
  if(!viewport){ document.body.classList.remove('keyboard-open'); return; }
  const keyboardLikelyOpen=(window.innerHeight - viewport.height) > 140;
  document.body.classList.toggle('keyboard-open', keyboardLikelyOpen);
}

window.visualViewport?.addEventListener('resize', updateKeyboardState);
window.addEventListener('focusin',()=>setTimeout(updateKeyboardState,60));
window.addEventListener('focusout',()=>setTimeout(updateKeyboardState,160));
document.addEventListener('click',event=>{
  const languageButton=event.target.closest?.('[data-quick-language]');
  if(languageButton) setDisplayLanguage(languageButton.dataset.quickLanguage);
});
window.addEventListener('hashchange',render);
window.addEventListener('DOMContentLoaded',()=>{ render(); updateKeyboardState(); });
