import { test, expect } from '@playwright/test';

test('same-name people are resolved by stable identity instead of silently merged',async({page})=>{
 await page.goto('/#/type');
 await page.evaluate(()=>{
  const repo=(window as any).__PA_REPOSITORY__;
  repo.create('people',{id:'ramesh-erode',name:'Ramesh',role:'buyer',roles:['buyer'],primaryPhone:'+91 98765 40001',alternatePhones:[],identityStatus:'confirmed'});
  repo.create('people',{id:'ramesh-perundurai',name:'Ramesh',role:'buyer',roles:['buyer'],primaryPhone:'+91 98765 40002',alternatePhones:[],identityStatus:'confirmed'});
  repo.create('requirements',{personId:'ramesh-erode',intent:'buy',propertyType:'land',locations:['Erode']});
  repo.create('requirements',{personId:'ramesh-perundurai',intent:'buy',propertyType:'house',locations:['Perundurai']});
 });
 await page.getByTestId('capture-text').fill('Ramesh wants land in Bhavani budget 25 lakh');
 await page.getByTestId('analyze-capture').click();
 await expect(page.getByTestId('identity-resolution')).toContainText('More than one saved person has this name');
 await expect(page.getByTestId('field-targetPerson').locator('option')).toHaveCount(3);
 await page.getByTestId('field-targetPerson').selectOption('ramesh-perundurai');
 await page.getByTestId('save-capture').click();
 const result=await page.evaluate(()=>({
  people:(window as any).__PA_REPOSITORY__.list('people').filter((item:any)=>item.name==='Ramesh'),
  linked:(window as any).__PA_REPOSITORY__.list('requirements').filter((item:any)=>item.locations?.includes('Bhavani'))
 }));
 expect(result.people).toHaveLength(2);
 expect(result.linked).toHaveLength(1);
 expect(result.linked[0].personId).toBe('ramesh-perundurai');
});

test('Create a new person never reuses a sole name-only match',async({page})=>{
 await page.goto('/#/type');
 await page.evaluate(()=>{
  (window as any).__PA_REPOSITORY__.create('people',{id:'existing-ramesh',name:'Ramesh',role:'buyer',roles:['buyer'],primaryPhone:'',alternatePhones:[],identityStatus:'phone_pending'});
  sessionStorage.setItem('pa.captureDraft',JSON.stringify({ok:true,kind:'requirement',source:'Ramesh wants land in Erode',person:{name:'Ramesh'},requirement:{intent:'buy',propertyType:'land',locations:['Erode']},uncertain:[]}));
  location.hash='#/review';
 });
 await expect(page.getByTestId('identity-resolution')).toBeVisible();
 await expect(page.getByTestId('field-targetPerson')).toHaveValue('__create_new_person__');
 await page.getByTestId('save-capture').click();
 const people=await page.evaluate(()=>(window as any).__PA_REPOSITORY__.list('people').filter((person:any)=>person.name==='Ramesh'));
 expect(people).toHaveLength(2);
 expect(people.map((person:any)=>person.id)).toContain('existing-ramesh');
});

test('a new phone still requires an explicit same-name identity choice',async({page})=>{
 await page.goto('/#/type');
 await page.evaluate(()=>{
  const repo=(window as any).__PA_REPOSITORY__;
  repo.create('people',{id:'pending-ramesh',name:'Ramesh',role:'buyer',roles:['buyer'],primaryPhone:'',alternatePhones:[],identityStatus:'phone_pending'});
  repo.create('people',{id:'other-ramesh',name:'Ramesh',role:'owner',roles:['owner'],primaryPhone:'9876540001',alternatePhones:[],identityStatus:'confirmed'});
  sessionStorage.setItem('pa.captureDraft',JSON.stringify({ok:true,kind:'requirement',source:'Ramesh 9876540002 wants land in Erode',person:{name:'Ramesh',primaryPhone:'9876540002'},requirement:{intent:'buy',propertyType:'land',locations:['Erode']},uncertain:[]}));
  location.hash='#/review';
 });
 await expect(page.getByTestId('field-targetPerson').locator('option')).toHaveCount(3);
 await expect(page.getByTestId('field-targetPerson')).toHaveValue('__create_new_person__');
 await page.getByTestId('save-capture').click();
 const result=await page.evaluate(()=>({people:(window as any).__PA_REPOSITORY__.list('people'),pending:(window as any).__PA_REPOSITORY__.get('people','pending-ramesh')}));
 expect(result.people.filter((person:any)=>person.name==='Ramesh')).toHaveLength(3);
 expect(result.pending.primaryPhone).toBe('');
 expect(result.people.some((person:any)=>person.primaryPhone==='9876540002')).toBe(true);
});

for(const kind of ['followup','interaction'] as const){
 test(`${kind} capture disambiguates duplicate names before linking`,async({page})=>{
  await page.goto('/#/type');
  await page.evaluate((captureKind)=>{
   const repo=(window as any).__PA_REPOSITORY__;
   repo.create('people',{id:'ramesh-one',name:'Ramesh',role:'buyer',roles:['buyer'],primaryPhone:'9876540011',alternatePhones:[],identityStatus:'confirmed'});
   repo.create('people',{id:'ramesh-two',name:'Ramesh',role:'owner',roles:['owner'],primaryPhone:'9876540012',alternatePhones:[],identityStatus:'confirmed'});
   const draft=captureKind==='followup'
    ?{ok:true,kind:captureKind,source:'Follow up Ramesh tomorrow',person:{name:'Ramesh'},followUp:{title:'Follow up Ramesh',dueText:'Tomorrow'},uncertain:[]}
    :{ok:true,kind:captureKind,source:'Ramesh rejected this property',person:{name:'Ramesh'},interaction:{summary:'Ramesh rejected this property',learnedPreferences:[]},uncertain:[]};
   sessionStorage.setItem('pa.captureDraft',JSON.stringify(draft));location.hash='#/review';
  },kind);
  await expect(page.getByTestId('identity-resolution')).toContainText('More than one saved person has this name');
  await expect(page.getByTestId('field-targetPerson')).toHaveValue('__create_new_person__');
  await page.getByTestId('field-targetPerson').selectOption('ramesh-two');
  await page.getByTestId('save-capture').click();
  const people=await page.evaluate(()=>(window as any).__PA_REPOSITORY__.list('people').filter((person:any)=>person.name==='Ramesh'));
  expect(people).toHaveLength(2);
 });
}

test('Cursor-style completion accepts an area with Tab',async({page})=>{
 await page.goto('/#/home');
 const composer=page.getByTestId('home-capture-text');
 await composer.fill('Ramesh wants land in Peru');
 await expect(page.getByTestId('home-cursor-suggestion')).toContainText('ndurai');
 await composer.press('Tab');
 await expect(composer).toHaveValue('Ramesh wants land in Perundurai');
});

test('tapping a Cursor-style completion keeps focus in the composer',async({page})=>{
 await page.goto('/#/home');
 const composer=page.getByTestId('home-capture-text');
 await composer.fill('Ramesh wants land in Peru');
 await page.getByTestId('home-cursor-suggestion').click();
 await expect(composer).toHaveValue('Ramesh wants land in Perundurai');
 await expect(composer).toBeFocused();
});

const identityDrafts={
 requirement:{ok:true,kind:'requirement',source:'Ramesh wants land in Erode',person:{name:'Ramesh',primaryPhone:'9876540002'},requirement:{intent:'buy',propertyType:'land',locations:['Erode']},uncertain:[]},
 property:{ok:true,kind:'property',source:'Ramesh has land in Erode',person:{name:'Ramesh',primaryPhone:'9876540002'},property:{intent:'sale',propertyType:'land',locality:'Erode',price:2000000,priceBasis:'total',attributes:[]},uncertain:[]},
 followup:{ok:true,kind:'followup',source:'Follow up Ramesh tomorrow',person:{name:'Ramesh',primaryPhone:'9876540002'},followUp:{title:'Follow up Ramesh',dueText:'Tomorrow'},uncertain:[]},
 interaction:{ok:true,kind:'interaction',source:'Ramesh prefers Erode',person:{name:'Ramesh',primaryPhone:'9876540002'},interaction:{summary:'Ramesh prefers Erode',learnedPreferences:['Erode']},uncertain:[]}
} as const;

for(const kind of Object.keys(identityDrafts) as Array<keyof typeof identityDrafts>){
 test(`${kind} create-new choice never silently reuses an existing phone`,async({page})=>{
  await page.goto('/#/type');
  await page.evaluate(({draft})=>{
   (window as any).__PA_REPOSITORY__.create('people',{id:'saved-ramesh',name:'Saved Ramesh',role:'buyer',roles:['buyer'],primaryPhone:'9876540002',alternatePhones:[],identityStatus:'confirmed'});
   sessionStorage.setItem('pa.captureDraft',JSON.stringify(draft));location.hash='#/review';
  },{draft:identityDrafts[kind]});
  await page.getByTestId('field-targetPerson').selectOption({label:'Create a new person'});
  await page.getByTestId('save-capture').click();
  await expect(page.getByTestId('review-error')).toContainText('already saved for Saved Ramesh');
  const state=await page.evaluate(()=>({people:(window as any).__PA_REPOSITORY__.list('people'),requirements:(window as any).__PA_REPOSITORY__.list('requirements'),properties:(window as any).__PA_REPOSITORY__.list('properties'),followUps:(window as any).__PA_REPOSITORY__.list('followUps'),interactions:(window as any).__PA_REPOSITORY__.list('interactions')}));
  expect(state.people).toHaveLength(1);
  expect(state.requirements).toHaveLength(0);expect(state.properties).toHaveLength(0);expect(state.followUps).toHaveLength(0);expect(state.interactions).toHaveLength(0);
 });

 test(`${kind} explicit saved-person choice preserves a different captured phone as alternate`,async({page})=>{
  await page.goto('/#/type');
  await page.evaluate(({draft})=>{
   (window as any).__PA_REPOSITORY__.create('people',{id:'saved-ramesh',name:'Ramesh',role:'buyer',roles:['buyer'],primaryPhone:'9876540001',alternatePhones:[],identityStatus:'confirmed'});
   sessionStorage.setItem('pa.captureDraft',JSON.stringify(draft));location.hash='#/review';
  },{draft:identityDrafts[kind]});
  await page.getByTestId('field-targetPerson').selectOption('saved-ramesh');
  await page.getByTestId('save-capture').click();
  const saved=await page.evaluate(()=>{
   const person=(window as any).__PA_REPOSITORY__.get('people','saved-ramesh');
   return {people:(window as any).__PA_REPOSITORY__.list('people').length,alternatePhones:person.alternatePhones.map((phone:string)=>(window as any).PropertyAssistantPersistence.normalizePhone(phone))};
  });
  expect(saved.people).toBe(1);
  expect(saved.alternatePhones).toContain('9876540002');
 });
}

test('area typeahead supports prefix selection and local pinning',async({page})=>{
 await page.goto('/#/type');
 await page.getByTestId('capture-text').fill('Ravi wants land in Erode budget 20 lakh');
 await page.getByTestId('analyze-capture').click();
 const area=page.getByTestId('field-locality');
 await area.fill('Elec');
 await page.getByRole('option',{name:'Electronic City'}).click();
 await expect(area).toHaveValue('Electronic City');
 await page.getByRole('button',{name:'Pin area'}).click();
 await expect(page.getByRole('button',{name:'Pinned area'})).toBeVisible();
 const pinned=await page.evaluate(()=>JSON.parse(localStorage.getItem('pa.pinnedLocations.v1')||'[]'));
 expect(pinned).toEqual(['Electronic City']);
 await page.goto('/#/settings');
 await expect(page.getByTestId('pinned-locations')).toContainText('Electronic City');
});
