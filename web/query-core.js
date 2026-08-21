(function(root){
'use strict';
const PLACES=['Erode','Coimbatore','Chennai','Salem','Madurai','Trichy','Tiruppur'];
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
 const n=Number(m[1]); if(!Number.isFinite(n))return null; const u=(m[2]||'').toLowerCase(); return n*(u.startsWith('cr')||u==='crore'?10000000:u.startsWith('la')?100000:1);
}
function interpret(input){
 const raw=String(input||'').trim(); if(!raw) return {raw,terms:[],phoneTerm:null,location:null,propertyType:null,maxPrice:null,entity:'all',intent:null};
 const normalized=normalizeQuery(raw);
 const lower=normalized.toLowerCase();
 const location=PLACES.find(p=>lower.includes(p.toLowerCase()))||null;
 const pair=TYPE_PATTERNS.find(([,re])=>re.test(lower));
 const phoneMatch=lower.match(/\d[\d\s()+-]{3,}\d/); const phoneTerm=phoneMatch?phoneMatch[0].replace(/\D/g,''):null;
 const entity=/\b(?:owner|buyer|tenant|person|people|contact|phone|number)\b/i.test(lower)?'people':/\b(?:match|matches|suitable|fit)\b/i.test(lower)?'matches':/\b(?:property|properties|land|plot|site|house|home|flat|apartment|veedu|manai|nilam)\b/i.test(lower)?'properties':'all';
 const intent=/\b(?:rent|rental|vaadagai|vadagai)\b/i.test(lower)?'rent':/\b(?:buy|buyer|purchase|want|need)\b/i.test(lower)?'buy':/\b(?:sale|sell|selling)\b/i.test(lower)?'sale':null;
 const stop=new Set(['show','find','me','all','the','in','at','for','under','below','max','budget','is','up','to','properties','property','people','person','contact','contacts','phone','number','owner','tenant','matches','match','buyer','buyers','land','plot','site','house','home','flat','apartment','buy','sale','sell','rent','rental','lakh','lakhs','lac','crore','cr','rs']);
 const terms=lower.replace(/[^a-z0-9+\s]/g,' ').split(/\s+/).filter(x=>x.length>1&&!stop.has(x)&&!PLACES.some(p=>p.toLowerCase()===x)&&!/^\d/.test(x));
 return {raw,normalized,terms,phoneTerm,location,propertyType:pair?pair[0]:null,maxPrice:money(normalized),entity,intent};
}
function includesTerms(values,terms){const hay=values.filter(Boolean).join(' ').toLowerCase();return terms.every(t=>hay.includes(t));}
function digits(value){return String(value||'').replace(/\D/g,'');}
function search(snapshot,q){
 const e=snapshot.entities||snapshot; const out=[]; const hasPropertyFilters=Boolean(q.location||q.propertyType||q.maxPrice!=null||q.intent);
 for(const p of Object.values(e.people||{})) if(q.entity==='people'||(q.entity==='all'&&!hasPropertyFilters)){
   if(q.phoneTerm&&!digits([p.primaryPhone,...(p.alternatePhones||[])].join(' ')).includes(q.phoneTerm))continue;
   if(includesTerms([p.name,p.primaryPhone,(p.alternatePhones||[]).join(' ')],q.terms)) out.push({kind:'person',id:p.id,title:p.name,subtitle:`${p.role.replaceAll('_',' ')} · ${p.primaryPhone}`});
 }
 for(const p of Object.values(e.properties||{})) if(q.entity==='all'||q.entity==='properties'){
   if(q.location&&p.locality.toLowerCase()!==q.location.toLowerCase())continue; if(q.propertyType&&p.propertyType!==q.propertyType)continue; if(q.maxPrice!=null&&p.price!=null&&p.price>q.maxPrice)continue;
   if(q.intent==='rent'&&p.intent!=='rent'&&p.intent!=='lease')continue; if(q.intent==='sale'&&p.intent!=='sale')continue;
   if(!includesTerms([p.propertyType,p.locality,p.intent],q.terms))continue;
   out.push({kind:'property',id:p.id,title:`${p.propertyType} in ${p.locality}`,subtitle:`${p.intent} · ${p.price==null?'Price not set':`₹${Number(p.price).toLocaleString('en-IN')}`}`});
 }
 for(const m of Object.values(e.matches||{})) if(q.entity==='matches'){
   const r=e.requirements?.[m.requirementId],p=e.properties?.[m.propertyId],person=r?e.people?.[r.personId]:null; if(!r||!p)continue;
   if(q.location&&p.locality.toLowerCase()!==q.location.toLowerCase())continue; if(q.propertyType&&p.propertyType!==q.propertyType)continue;
   if(!includesTerms([person?.name,p.propertyType,p.locality,(m.reasons||[]).join(' ')],q.terms))continue;
   out.push({kind:'match',id:m.id,title:`${person?.name||'Buyer'} ↔ ${p.propertyType} in ${p.locality}`,subtitle:`Match score ${m.score} · ${(m.reasons||[])[0]||''}`});
 }
 return out;
}
root.PropertyAssistantQuery={interpret,search,normalizeQuery};
})(globalThis);
