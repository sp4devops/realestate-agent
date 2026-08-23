import { test, expect } from '@playwright/test';

test('Type & Save extracts, allows correction, and saves a buyer locally', async ({ page }) => {
  await page.goto('/#/type');
  await page.getByTestId('capture-text').fill('Arun wants land in Erode, budget 25 lakh, phone 98765 43210');
  await page.getByTestId('analyze-capture').click();
  await expect(page.getByRole('heading', { name: 'Check what I understood' })).toBeVisible();
  await expect(page.getByTestId('field-name')).toHaveValue('Arun');
  await page.getByTestId('field-name').fill('Arun Kumar');
  await page.getByTestId('save-capture').click();
  await expect(page.getByTestId('person-name')).toHaveText('Arun Kumar');
  await expect(page.getByTestId('primary-phone')).toHaveText('+91 98765 43210');
  await page.reload();
  await expect(page.getByTestId('person-name')).toHaveText('Arun Kumar');
  const saved = await page.evaluate(() => window.__PA_REPOSITORY__.list('requirements').find(item => item.personId && window.__PA_REPOSITORY__.get('people', item.personId)?.name === 'Arun Kumar'));
  expect(saved.propertyType).toBe('land');
  expect(saved.locations).toEqual(['Erode']);
  expect(saved.budgetMax).toBe(2500000);
});

test('Edit note returns to the full original draft without losing work', async ({ page }) => {
  const note='Ramesh needs a 2BHK rental near Erode Railway Station. Budget 15,000 per month. Moving next month.';
  await page.goto('/#/type');
  await page.getByTestId('capture-text').fill(note);
  await page.getByTestId('analyze-capture').click();
  await expect(page.getByRole('heading', { name: 'Check what I understood' })).toBeVisible();
  await page.getByTestId('edit-capture-note').click();
  await expect(page.getByTestId('capture-text')).toHaveValue(note);
});

test('Type & Save saves a property and preserves its owner contact without AI', async ({ page }) => {
  await page.goto('/#/type');
  await page.getByTestId('capture-text').fill('Name is Selvam, land for sale in Salem price 1800000 phone 96543 21098');
  await page.getByTestId('analyze-capture').click();
  await expect(page.getByTestId('field-name')).toHaveValue('Selvam');
  await expect(page.getByTestId('field-primaryPhone')).toHaveValue('+91 96543 21098');
  await expect(page.getByTestId('field-locality')).toHaveValue('Salem');
  await page.getByTestId('save-capture').click();
  await expect(page.getByTestId('property-title')).toContainText('land in Salem');
  const linked = await page.evaluate(() => {
    const property = window.__PA_REPOSITORY__.list('properties').find(item => item.locality === 'Salem' && item.price === 1800000);
    const owner = property?.ownerPersonId ? window.__PA_REPOSITORY__.get('people', property.ownerPersonId) : null;
    return { property, owner };
  });
  expect(linked.owner.name).toBe('Selvam');
  expect(linked.owner.primaryPhone).toBe('+91 96543 21098');
});

test('empty typed capture gives a useful local validation error', async ({ page }) => {
  await page.goto('/#/type');
  await page.getByTestId('analyze-capture').click();
  await expect(page.getByTestId('capture-error')).toContainText('Type something');
});

test('invalid reviewed buyer details do not leave an orphan person', async ({ page }) => {
  await page.goto('/#/type');
  await page.getByTestId('capture-text').fill('Rollback Demo wants land in Erode, budget 20 lakh, phone 97654 32109');
  await page.getByTestId('analyze-capture').click();
  await expect(page.getByRole('heading', { name: 'Check what I understood' })).toBeVisible();
  await page.getByTestId('field-name').fill('Rollback Demo');
  await page.getByTestId('field-intent').fill('invalid-intent');
  await page.getByTestId('save-capture').click();
  await expect(page.getByTestId('review-error')).toContainText('requirement intent is invalid');
  const orphanCount = await page.evaluate(() => window.__PA_REPOSITORY__.list('people').filter(person => person.name === 'Rollback Demo').length);
  expect(orphanCount).toBe(0);
});

test('phone-less requirement is remembered as a provisional contact',async({page})=>{
  await page.goto('/#/type');
  await page.getByTestId('capture-text').fill('Ramesh needs a 2BHK rental near Erode Railway Station. Budget 15,000 per month. Moving next month.');
  await page.getByTestId('analyze-capture').click();
  await expect(page.getByTestId('field-primaryPhone')).toHaveValue('');
  await page.getByTestId('save-capture').click();
  await expect(page.getByTestId('person-name')).toHaveText('Ramesh');
  await expect(page.getByTestId('primary-phone')).toHaveText('Phone pending');
  const saved=await page.evaluate(()=>{
    const person=(window as any).__PA_REPOSITORY__.list('people').find((item:any)=>item.name==='Ramesh');
    const requirement=(window as any).__PA_REPOSITORY__.list('requirements').find((item:any)=>item.personId===person?.id);
    return {person,requirement};
  });
  expect(saved.person.identityStatus).toBe('phone_pending');
  expect(saved.requirement.budgetMax).toBe(15000);

  await page.goto('/#/type');
  await page.getByTestId('capture-text').fill('Ramesh wants 2BHK rent in Erode Railway Station budget 16k phone 98765 40009');
  await page.getByTestId('analyze-capture').click();
  await page.getByTestId('save-capture').click();
  const enriched=await page.evaluate(()=>({
    people:(window as any).__PA_REPOSITORY__.list('people').filter((item:any)=>item.name==='Ramesh'),
    requirements:(window as any).__PA_REPOSITORY__.list('requirements')
  }));
  expect(enriched.people).toHaveLength(1);
  expect(enriched.people[0]).toMatchObject({primaryPhone:'+91 98765 40009',identityStatus:'confirmed'});
  expect(enriched.requirements).toHaveLength(2);
});

test('phone-less owner remains linked and a per-acre rate is not stored as a total',async({page})=>{
  await page.goto('/#/type');
  await page.getByTestId('capture-text').fill('2 acre land available near Chennimalai, ₹55 lakh/acre, owner Subramani, negotiable.');
  await page.getByTestId('analyze-capture').click();
  await expect(page.getByTestId('field-name')).toHaveValue('Subramani');
  await expect(page.getByTestId('field-priceBasis')).toHaveValue('per_acre');
  await page.getByTestId('save-capture').click();
  await expect(page.getByTestId('property-title')).toContainText('land in Chennimalai');
  const saved=await page.evaluate(()=>{
    const property=(window as any).__PA_REPOSITORY__.list('properties')[0];
    const owner=(window as any).__PA_REPOSITORY__.get('people',property.ownerPersonId);
    return {property,owner};
  });
  expect(saved.owner).toMatchObject({name:'Subramani',primaryPhone:'',identityStatus:'phone_pending'});
  expect(saved.property).toMatchObject({price:5500000,priceBasis:'per_acre',size:{value:2,unit:'acre'}});
});
