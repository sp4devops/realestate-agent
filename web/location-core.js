(function(root){
'use strict';

const STORAGE_KEY='pa.pinnedLocations.v1';
const DEFAULT_LOCATIONS=[
  'Erode','Perundurai','Chennimalai','Bhavani','Gobichettipalayam','Sathyamangalam','Modakurichi','Kodumudi','Anthiyur','Nambiyur',
  'Surampatti','Veerappanchatram','Thindal','Solar','Rangampalayam','Moolapalayam','Kollampalayam','Karungalpalayam','Teachers Colony','Nasiyanur',
  'Tiruppur','Avinashi','Kangeyam','Dharapuram','Coimbatore','Peelamedu','Gandhipuram','Saravanampatti','Singanallur','Sulur','Pollachi',
  'Salem','Namakkal','Karur','Trichy','Madurai','Chennai','Electronic City'
];

function clean(value){return String(value||'').trim().replace(/\s+/g,' ').slice(0,80);}
function key(value){return clean(value).toLocaleLowerCase('en-IN');}
function unique(values){
 const seen=new Set();const output=[];
 for(const value of values||[]){const location=clean(value);const identity=key(location);if(!location||seen.has(identity))continue;seen.add(identity);output.push(location);}
 return output;
}
function readPinned(storage=root.localStorage){
 if(!storage||typeof storage.getItem!=='function')return [];
 try{const parsed=JSON.parse(storage.getItem(STORAGE_KEY)||'[]');return Array.isArray(parsed)?unique(parsed).slice(0,30):[];}catch(_){return [];}
}
function writePinned(values,storage=root.localStorage){
 const next=unique(values).slice(0,30);if(storage&&typeof storage.setItem==='function')storage.setItem(STORAGE_KEY,JSON.stringify(next));return next;
}
function pin(value,storage=root.localStorage){const location=clean(value);if(!location)return readPinned(storage);return writePinned([location,...readPinned(storage)],storage);}
function unpin(value,storage=root.localStorage){const target=key(value);return writePinned(readPinned(storage).filter(item=>key(item)!==target),storage);}
function isPinned(value,storage=root.localStorage){const target=key(value);return Boolean(target&&readPinned(storage).some(item=>key(item)===target));}
function rememberedLocations(repository){
 if(!repository||typeof repository.list!=='function')return [];
 const locations=[];
 try{
  for(const item of repository.list('requirements'))locations.push(...(item.locations||[]));
  for(const item of repository.list('properties'))locations.push(item.locality);
  for(const item of repository.list('posterLeads'))locations.push(item.posterLocation);
 }catch(_){return [];}
 return unique(locations);
}
function all(repository,storage=root.localStorage){return unique([...readPinned(storage),...rememberedLocations(repository),...DEFAULT_LOCATIONS]);}
function score(location,query,pinned){
 const value=key(location);const needle=key(query);let rank=pinned?0:100;
 if(!needle)return rank;
 if(value===needle)return rank;
 if(value.startsWith(needle))return rank+1;
 if(value.split(/\s+/).some(part=>part.startsWith(needle)))return rank+2;
 if(value.includes(needle))return rank+3;
 return Number.POSITIVE_INFINITY;
}
function suggest(query,{repository,storage=root.localStorage,limit=8}={}){
 const pinnedKeys=new Set(readPinned(storage).map(key));
 return all(repository,storage).map(location=>({location,pinned:pinnedKeys.has(key(location)),rank:score(location,query,pinnedKeys.has(key(location))) }))
  .filter(item=>Number.isFinite(item.rank)).sort((a,b)=>a.rank-b.rank||a.location.localeCompare(b.location)).slice(0,limit);
}
function bindTypeahead(input,{repository,storage=root.localStorage,list,pinButton}={}){
 if(!input||!list)return ()=>{};
 let active=-1;let visible=[];
 const refreshPin=()=>{
  if(!pinButton)return;
  const pinned=isPinned(input.value,storage);pinButton.dataset.pinned=String(pinned);pinButton.textContent=pinned?'★ Pinned area':'☆ Pin area';pinButton.disabled=!clean(input.value);
 };
 const choose=location=>{input.value=location;input.dispatchEvent(new Event('input',{bubbles:true}));list.hidden=true;active=-1;refreshPin();};
 const render=()=>{
  visible=suggest(input.value,{repository,storage});list.replaceChildren();active=-1;
  for(const item of visible){
   const row=document.createElement('div');row.className='location-option-row';
   const option=document.createElement('button');option.type='button';option.className='location-option';option.setAttribute('role','option');option.textContent=item.location;option.addEventListener('mousedown',event=>event.preventDefault());option.addEventListener('click',()=>choose(item.location));
   const pinControl=document.createElement('button');pinControl.type='button';pinControl.className='location-option-pin';pinControl.setAttribute('aria-label',`${item.pinned?'Unpin':'Pin'} ${item.location}`);pinControl.textContent=item.pinned?'★':'☆';pinControl.addEventListener('mousedown',event=>event.preventDefault());pinControl.addEventListener('click',()=>{item.pinned?unpin(item.location,storage):pin(item.location,storage);render();refreshPin();});
   row.append(option,pinControl);list.append(row);
  }
  list.hidden=visible.length===0;refreshPin();
 };
 const keydown=event=>{
  if(event.key==='Escape'){list.hidden=true;return;}
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
   if(list.hidden)render();if(!visible.length)return;event.preventDefault();active=(active+(event.key==='ArrowDown'?1:-1)+visible.length)%visible.length;
   [...list.querySelectorAll('[role="option"]')].forEach((option,index)=>option.setAttribute('aria-selected',String(index===active)));
   list.querySelectorAll('[role="option"]')[active]?.scrollIntoView({block:'nearest'});
  }else if(event.key==='Enter'&&active>=0&&visible[active]){event.preventDefault();choose(visible[active].location);}
 };
 const blur=()=>setTimeout(()=>{list.hidden=true;active=-1;},120);
 const togglePin=()=>{const value=clean(input.value);if(!value)return;isPinned(value,storage)?unpin(value,storage):pin(value,storage);render();refreshPin();};
 input.addEventListener('input',render);input.addEventListener('focus',render);input.addEventListener('keydown',keydown);input.addEventListener('blur',blur);pinButton?.addEventListener('click',togglePin);refreshPin();
 return ()=>{input.removeEventListener('input',render);input.removeEventListener('focus',render);input.removeEventListener('keydown',keydown);input.removeEventListener('blur',blur);pinButton?.removeEventListener('click',togglePin);};
}

root.PropertyAssistantLocations={STORAGE_KEY,DEFAULT_LOCATIONS:[...DEFAULT_LOCATIONS],clean,readPinned,pin,unpin,isPinned,rememberedLocations,all,suggest,bindTypeahead};
})(globalThis);
