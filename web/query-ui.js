(function(){
'use strict';
const app=document.getElementById('app'),repo=window.__PA_REPOSITORY__;
function route(){return (location.hash.replace(/^#\/?/,'')||'').split('?')[0];}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function bindResultActions(){
 document.querySelectorAll('[data-query-open-kind]').forEach(button=>button.addEventListener('click',()=>{
  const target={person:'person',property:'property',match:'match'}[button.dataset.queryOpenKind];
  if(target)location.hash=`#/${target}?id=${encodeURIComponent(button.dataset.queryOpenId)}`;
 }));
}
function renderResults(results){
 const box=document.querySelector('[data-testid="query-results"]');if(!box)return;
 box.innerHTML=results.length?results.map(result=>`<article class="card opportunity" data-testid="query-result-card"><div><strong>${esc(result.title)}</strong><p>${esc(result.subtitle)}</p></div><button class="button primary" type="button" data-query-open-kind="${result.kind}" data-query-open-id="${esc(result.id)}">Open</button></article>`).join(''):'<div class="placeholder-card">No local results found. Try a name, place, property type or budget.</div>';
 bindResultActions();
}
function runQuery(text){
 const value=String(text||'').trim();
 const summary=document.querySelector('[data-testid="query-summary"]');
 if(!value){
  const box=document.querySelector('[data-testid="query-results"]');
  if(box)box.innerHTML='';
  if(summary){summary.hidden=false;summary.textContent='Type what you want to find first.';}
  return [];
 }
 const query=window.PropertyAssistantQuery.interpret(value);
 const results=window.PropertyAssistantQuery.search(repo.loadSnapshot(),query);
 renderResults(results);
 if(summary){summary.hidden=false;summary.textContent=`${results.length} result${results.length===1?'':'s'} from local memory.`;}
 return results;
}
function render(){
 app.innerHTML=shell(`<section class="page"><p class="eyebrow">LOCAL SEARCH</p><h1>Ask</h1><p class="lead">Type what you need in English. Property Assistant searches only your local memory and returns useful cards.</p><label class="field"><span>What do you need?</span><input data-testid="query-input" placeholder="Example: land in Erode under 25 lakh" autocomplete="off" /></label><div class="page-actions"><button class="button primary" type="button" data-testid="run-query">Search local memory</button></div><p data-testid="query-summary" class="action-status" aria-live="polite" hidden></p><div class="choice-list" data-testid="query-results"></div></section>`,'ask');
 bind();
}
function bind(){
 document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',()=>{location.hash=`#/${el.dataset.route}`;}));
 document.querySelector('[data-testid="run-query"]')?.addEventListener('click',()=>runQuery(document.querySelector('[data-testid="query-input"]').value));
 document.querySelector('[data-testid="query-input"]')?.addEventListener('keydown',event=>{if(event.key==='Enter')runQuery(event.currentTarget.value);});
 bindResultActions();
}
function owned(){if(route()==='ask')render();}
window.__PA_RUN_QUERY__=runQuery;
window.addEventListener('hashchange',()=>setTimeout(owned,0));
window.addEventListener('DOMContentLoaded',()=>setTimeout(owned,0));
})();
