(function(root){
'use strict';
const PLACES=['Erode','Perundurai','Bhavani','Chithode','Coimbatore','Pollachi','Mettupalayam','Chennai','Tambaram','Avadi','Salem','Omalur','Attur','Madurai','Trichy','Tiruppur'];
const TAMIL_ALIASES=[
 ['ஈரோடு','Erode'],['கோயம்புத்தூர்','Coimbatore'],['கோவை','Coimbatore'],['சென்னை','Chennai'],['சேலம்','Salem'],['மதுரை','Madurai'],['திருச்சி','Trichy'],['திருப்பூர்','Tiruppur'],
 ['நிலம்','land'],['மனை','land'],['வீடு','house'],['பிளாட்','apartment'],['அபார்ட்மெண்ட்','apartment'],['வாடகை','rent'],['லட்சம்','lakh'],['லட்சத்துக்கு','lakh'],['கோடி','crore']
];
const TYPE_PATTERNS=[['land',/\b(?:land|plot|site|manai|nilam)\b/i],['house',/\b(?:house|home|veedu)\b/i],['apartment',/\b(?:apartment|flat)\b/i]];
function normalizeQuery(value){
 let text=root.PropertyAssistantVoice?root.PropertyAssistantVoice.normalizeTranscript(value):String(value||'');
 for(const [from,to] of TAMIL_ALIASES) text=text.replaceAll(from,to);
 return text;
}
function money(text){
 const m=String(text).match(/(?:under|below|max|budget(?:\s+is)?|upto|up to|கீழ்)\s*(?:₹|rs\.?\s*)?([\d.]+)\s*(crore|cr|lakh|lac|lakhs)?/i)||String(text).match(/([\d.]+)\s*(crore|cr|lakh|lac|lakhs)\s*(?:under|below|கீழ்)/i); if(!m)return null;
 const n=Number(m[1]); if(!Number.isFinite(n)||n<0)return null; const u=(m[2]||'').toLowerCase(); return n*(u.startsWith('cr')||u==='crore'?10000000:u.startsWith('la')?100000:1);
}
function interpret(input){
 const raw=String(input||'').trim(); if(!raw) return {raw,terms:[],phoneTerm:null,location:null,propertyType:null,maxPrice:null,entity:'all',intent:null,personRole:null};
 const normalized=normalizeQuery(raw);
 const lower=normalized.toLowerCase();
 const location=PLACES.find(p=>new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(normalized))||null;
 const pair=TYPE_PATTERNS.find(([,re])=>re.test(lower));
 const phoneMatch=lower.match(/\d[\d\s()+-]{3,}\d/); const phoneTerm=phoneMatch?phoneMatch[0].replace(/\D/g,''):null;
 const personRole=/\bowners?\b/i.test(lower)?'owner':/\bsellers?\b/i.test(lower)?'seller':/\btenants?\b/i.test(lower)?'tenant':/\bbuyers?\b/i.test(lower)?'buyer':null;
 const entity=/\b(?:match|matches|suitable|fit)\b/i.test(lower)?'matches':/\b(?:owners?|sellers?|buyers?|tenants?|person|people|contacts?|phone|number)\b/i.test(lower)?'people':/\b(?:property|properties|land|plot|site|house|home|flat|apartment|veedu|manai|nilam)\b/i.test(lower)?'properties':'all';
 const intent=/\b(?:rent|rental|vaadagai|vadagai)\b/i.test(lower)?'rent':/\b(?:buy|purchase|want|need)\b/i.test(lower)?'buy':/\b(?:sale|sell|selling)\b/i.test(lower)?'sale':null;
 const stop=new Set(['show','find','me','all','the','in','at','for','under','below','max','budget','is','up','to','properties','property','people','person','contact','contacts','phone','number','owner','owners','seller','sellers','tenant','tenants','matches','match','buyer','buyers','land','plot','site','house','home','flat','apartment','buy','sale','sell','selling','rent','rental','want','wants','need','needs','looking','with','who','lakh','lakhs','lac','crore','cr','rs']);
 const terms=lower.replace(/[^a-z0-9+\s]/g,' ').split(/\s+/).filter(x=>x.length>1&&!stop.has(x)&&!PLACES.some(p=>p.toLowerCase()===x)&&!/^\d/.test(x));
 return {raw,normalized,terms,phoneTerm,location,propertyType:pair?pair[0]:null,maxPrice:money(normalized),entity,intent,personRole};
}
function includesTerms(values,terms){const hay=values.filter(Boolean).join(' ').toLowerCase();return terms.every(t=>hay.includes(t));}
function digits(value){return String(value||'').replace(/\D/g,'');}
function samePlace(value,location){return String(value||'').trim().toLowerCase()===String(location||'').trim().toLowerCase();}
function intentMatchesRequirement(intent,requirementIntent){
 if(!intent)return true;
 if(intent==='sale')return requirementIntent==='sell';
 if(intent==='rent')return requirementIntent==='rent'||requirementIntent==='lease';
 return requirementIntent===intent;
}
function intentMatchesProperty(intent,propertyIntent){
 if(!intent)return true;
 if(intent==='buy'||intent==='sale')return propertyIntent==='sale';
 if(intent==='rent')return propertyIntent==='rent'||propertyIntent==='lease';
 return true;
}
function requirementMatches(r,q){
 if(!intentMatchesRequirement(q.intent,r.intent))return false;
 if(q.location&&!(r.locations||[]).some(location=>samePlace(location,q.location)))return false;
 if(q.propertyType&&r.propertyType!==q.propertyType)return false;
 if(q.maxPrice!=null){
   const high=r.budgetMax==null?null:Number(r.budgetMax),low=r.budgetMin==null?null:Number(r.budgetMin);
   if(high!=null&&Number.isFinite(high)){if(high>q.maxPrice)return false;}
   else if(low!=null&&Number.isFinite(low)){if(low>q.maxPrice)return false;}
   else return false;
 }
 return true;
}
function propertyMatches(p,q){
 if(q.location&&!samePlace(p.locality,q.location))return false;
 if(q.propertyType&&p.propertyType!==q.propertyType)return false;
 if(q.maxPrice!=null){if(p.price==null||!Number.isFinite(Number(p.price))||Number(p.price)>q.maxPrice)return false;}
 if(!intentMatchesProperty(q.intent,p.intent))return false;
 return true;
}
function search(snapshot,q){
 const e=snapshot.entities||snapshot; const out=[]; const hasPropertyFilters=Boolean(q.location||q.propertyType||q.maxPrice!=null||q.intent);
 const requirements=Object.values(e.requirements||{}),properties=Object.values(e.properties||{});
 for(const p of Object.values(e.people||{})) if(q.entity==='people'||(q.entity==='all'&&!hasPropertyFilters)){
   if(q.personRole&&p.role!==q.personRole)continue;
   if(q.phoneTerm&&!digits([p.primaryPhone,...(p.alternatePhones||[])].join(' ')).includes(q.phoneTerm))continue;
   const personRequirements=requirements.filter(r=>r.personId===p.id),ownedProperties=properties.filter(property=>property.ownerPersonId===p.id);
   if(hasPropertyFilters){
     const requirementHit=personRequirements.some(r=>requirementMatches(r,q));
     const propertyHit=ownedProperties.some(property=>propertyMatches(property,q));
     const structuredHit=(q.personRole==='buyer'||q.personRole==='tenant')?requirementHit:(q.personRole==='owner'||q.personRole==='seller')?propertyHit:(requirementHit||propertyHit);
     if(!structuredHit)continue;
   }
   const linkedTerms=[...personRequirements.flatMap(r=>[r.propertyType,r.intent,...(r.locations||[])]),...ownedProperties.flatMap(property=>[property.propertyType,property.intent,property.locality])];
   if(includesTerms([p.name,p.primaryPhone,(p.alternatePhones||[]).join(' '),...linkedTerms],q.terms)) out.push({kind:'person',id:p.id,title:p.name,subtitle:`${p.role.replaceAll('_',' ')} · ${p.primaryPhone}`});
 }
 for(const p of properties) if(q.entity==='all'||q.entity==='properties'){
   if(!propertyMatches(p,q))continue;
   if(!includesTerms([p.propertyType,p.locality,p.intent],q.terms))continue;
   out.push({kind:'property',id:p.id,title:`${p.propertyType} in ${p.locality}`,subtitle:`${p.intent} · ${p.price==null?'Price not set':`₹${Number(p.price).toLocaleString('en-IN')}`}`});
 }
 for(const m of Object.values(e.matches||{})) if(q.entity==='matches'){
   const r=e.requirements?.[m.requirementId],p=e.properties?.[m.propertyId],person=r?e.people?.[r.personId]:null; if(!r||!p)continue;
   if(q.personRole&&person?.role!==q.personRole)continue;
   if(!requirementMatches(r,q)||!propertyMatches(p,q))continue;
   if(!includesTerms([person?.name,p.propertyType,p.locality,(m.reasons||[]).join(' ')],q.terms))continue;
   out.push({kind:'match',id:m.id,title:`${person?.name||'Buyer'} ↔ ${p.propertyType} in ${p.locality}`,subtitle:`Match score ${m.score} · ${(m.reasons||[])[0]||''}`});
 }
 return out;
}
root.PropertyAssistantQuery={interpret,search,normalizeQuery};
})(globalThis);
