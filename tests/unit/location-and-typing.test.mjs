import test from 'node:test';
import assert from 'node:assert/strict';

await import('../../web/location-core.js');
await import('../../web/typing-assist.js');

function storage(initial={}){
 const values=new Map(Object.entries(initial));
 return {getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
}
function repository(){
 const entities={people:[{id:'person-ramesh',name:'Ramesh'}],requirements:[{locations:['Bhavani']}],properties:[{locality:'Thindal'}],posterLeads:[{posterLocation:'Solar'}]};
 return {list:type=>entities[type]||[]};
}

test('area typeahead matches prefixes, remembered areas and pinned areas locally',()=>{
 const local=storage();const repo=repository();
 assert.equal(globalThis.PropertyAssistantLocations.suggest('Elec',{repository:repo,storage:local})[0].location,'Electronic City');
 assert.equal(globalThis.PropertyAssistantLocations.suggest('Thin',{repository:repo,storage:local})[0].location,'Thindal');
 globalThis.PropertyAssistantLocations.pin('Bhavani',local);
 const empty=globalThis.PropertyAssistantLocations.suggest('',{repository:repo,storage:local});
 assert.deepEqual(empty[0],{location:'Bhavani',pinned:true,rank:0});
 globalThis.PropertyAssistantLocations.unpin('BHAVANI',local);
 assert.equal(globalThis.PropertyAssistantLocations.isPinned('Bhavani',local),false);
});

test('Cursor-style typing assist completes people, property terms and area prefixes',()=>{
 const repo=repository();
 assert.equal(globalThis.PropertyAssistantTypingAssist.completionFor('Meet Ram',repo).candidate,'Ramesh');
 assert.equal(globalThis.PropertyAssistantTypingAssist.completionFor('Needs land in Peru',repo).candidate,'Perundurai');
 assert.equal(globalThis.PropertyAssistantTypingAssist.completionFor('Needs 2B',repo).candidate,'2BHK');
 assert.equal(globalThis.PropertyAssistantTypingAssist.completionFor('Ramesh wants',repo).candidate,'wants a 2BHK in');
 assert.equal(globalThis.PropertyAssistantTypingAssist.completionFor('Complete sentence.',repo),null);
});
