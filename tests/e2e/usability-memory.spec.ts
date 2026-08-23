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

test('Cursor-style completion accepts an area with Tab',async({page})=>{
 await page.goto('/#/home');
 const composer=page.getByTestId('home-capture-text');
 await composer.fill('Ramesh wants land in Peru');
 await expect(page.getByTestId('home-cursor-suggestion')).toContainText('ndurai');
 await composer.press('Tab');
 await expect(composer).toHaveValue('Ramesh wants land in Perundurai');
});

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
