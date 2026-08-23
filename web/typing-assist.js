(function(root){
'use strict';

const BASE_WORDS=['available','available in','apartment','area','budget','budget up to','buyer','cent','contact','follow-up','house','land','land available in','lakh','lease','location','negotiable','needs','needs a 2BHK in','owner','owner has land available in','Perundurai','property','rent','sale','tenant','wants','wants a 2BHK in','WhatsApp','1BHK','2BHK','3BHK','4BHK'];
function unique(values){const seen=new Set();return (values||[]).filter(value=>{const key=String(value||'').toLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true;});}
function candidates(repository){
 const values=[...BASE_WORDS];
 try{values.push(...repository.list('people').map(item=>item.name));}catch(_){}
 try{values.push(...root.PropertyAssistantLocations.all(repository));}catch(_){}
 return unique(values);
}
function completionFor(text,repository){
 const source=String(text||'');const match=source.match(/(^|[\s,.;:()])([A-Za-z0-9][A-Za-z0-9-]{1,})$/);if(!match)return null;
 const typed=match[2];const lower=typed.toLowerCase();
 const candidate=candidates(repository).filter(value=>String(value).toLowerCase().startsWith(lower)&&String(value).length>typed.length)
  .sort((a,b)=>String(a).length-String(b).length||String(a).localeCompare(String(b)))[0];
 if(!candidate)return null;
 return {typed,candidate:String(candidate),suffix:String(candidate).slice(typed.length),start:source.length-typed.length};
}
function attach(input,{repository,host,testId='typing-suggestion'}={}){
 if(!input)return ()=>{};
 const target=host||input.parentElement;const suggestion=document.createElement('button');
 suggestion.type='button';suggestion.className='typing-suggestion';suggestion.dataset.testid=testId;suggestion.hidden=true;
 target.insertAdjacentElement('afterend',suggestion);
 let current=null;
 const render=()=>{
  current=completionFor(input.value,repository);
  suggestion.hidden=!current;
  if(current){suggestion.innerHTML=`<span>${current.typed}<strong>${current.suffix}</strong></span><small>Tab to complete</small>`;suggestion.setAttribute('aria-label',`Complete ${current.candidate}`);}
 };
 const accept=()=>{if(!current)return false;input.setRangeText(current.candidate,current.start,input.value.length,'end');input.dispatchEvent(new Event('input',{bubbles:true}));return true;};
 const keydown=event=>{if(current&&(event.key==='Tab'||event.key==='ArrowRight')&&input.selectionStart===input.value.length&&input.selectionEnd===input.value.length){event.preventDefault();accept();}};
 input.addEventListener('input',render);input.addEventListener('focus',render);input.addEventListener('keydown',keydown);suggestion.addEventListener('click',accept);render();
 return ()=>{input.removeEventListener('input',render);input.removeEventListener('focus',render);input.removeEventListener('keydown',keydown);suggestion.remove();};
}

root.PropertyAssistantTypingAssist={completionFor,attach};
})(globalThis);
