import { test, expect } from '@playwright/test';

test('Assistant home understands an everyday English note before review', async ({ page }) => {
  await page.goto('/#/home');
  const note='Ramesh needs a 2BHK rental near Erode Railway Station. Budget 15k. Family only. Moving next month. Phone 98765 40101.';
  await page.getByTestId('home-capture-text').fill(note);

  await expect(page.getByTestId('home-parsed-summary')).toBeVisible();
  await expect(page.getByTestId('home-summary-chips')).toContainText('Tenant');
  await expect(page.getByTestId('home-summary-chips')).toContainText('2bhk');
  await expect(page.getByTestId('home-summary-chips')).toContainText('Erode Railway Station');
  await expect(page.getByTestId('home-summary-chips')).toContainText('₹15,000 / month');
  await expect(page.getByTestId('home-summary-chips')).toContainText('Family only');
  await expect(page.getByTestId('home-summary-chips')).toContainText('Next month');

  await page.getByTestId('home-review-save').click();
  await expect(page.getByRole('heading', { name: 'Check what I understood' })).toBeVisible();
  await expect(page.getByTestId('field-name')).toHaveValue('Ramesh');
  await expect(page.getByTestId('field-locality')).toHaveValue('Erode Railway Station');
  await expect(page.getByTestId('field-budgetMax')).toHaveValue('15000');
  await page.getByTestId('save-capture').click();
  await expect(page.getByTestId('person-name')).toHaveText('Ramesh');
  const saved=await page.evaluate(()=>(window as any).__PA_REPOSITORY__.list('requirements')[0]);
  expect(saved.sourceText).toBe(note);
  expect(saved.timing).toBe('Next month');
  expect(saved.preferences).toContain('Family only');
});

test('saved demand and supply appear as memory cards and an automatic match', async ({ page }) => {
  await page.goto('/#/home');
  await page.evaluate(() => (window as any).__PA_REPOSITORY__.seedSynthetic());
  await page.reload();

  await expect(page.getByTestId('home-match-card')).toContainText('100% Match');
  await page.getByTestId('nav-requirements').click();
  await expect(page.getByTestId('requirement-card')).toContainText('Suresh (Demo)');
  await expect(page.getByTestId('requirement-card')).toContainText('1 match found');

  await page.getByTestId('nav-properties').click();
  await expect(page.getByTestId('property-card')).toContainText('Murugan (Demo)');
  await expect(page.getByTestId('property-card')).toContainText('1 buyer match');

  await page.getByTestId('nav-matches').click();
  await expect(page.getByTestId('match-card')).toContainText('Suresh (Demo)');
  await expect(page.getByTestId('match-card')).toContainText('100%');
});

test('new memory persists matches immediately without visiting Matches first',async({page})=>{
  await page.goto('/#/type');
  await page.getByTestId('capture-text').fill('Subramani owner has 2100 sqft plot for sale in Perundurai asking 31 lakh');
  await page.getByTestId('analyze-capture').click();
  await page.getByTestId('save-capture').click();
  await expect(page.getByTestId('property-title')).toContainText('land in Perundurai');

  await page.goto('/#/type');
  await page.getByTestId('capture-text').fill('Kumar wants plot in Perundurai, size 1500-2500 sqft, budget 25-35 lakh');
  await page.getByTestId('analyze-capture').click();
  await page.getByTestId('save-capture').click();
  await expect(page.getByTestId('automatic-match-summary')).toContainText('1 possible match found immediately');
  await expect(page.getByTestId('match-card')).toContainText('Kumar');
  const count=await page.evaluate(()=>(window as any).__PA_REPOSITORY__.list('matches').length);
  expect(count).toBe(1);
});

test('price changes, reminders and rejection learning update connected memory',async({page})=>{
  await page.goto('/#/home');
  await page.evaluate(()=>(window as any).__PA_REPOSITORY__.seedSynthetic());

  await page.getByTestId('home-capture-text').fill('Price changed to 24 lakhs');
  await page.getByTestId('home-review-save').click();
  await expect(page.getByTestId('field-targetProperty')).toHaveValue('property-murugan');
  await page.getByTestId('save-capture').click();
  expect(await page.evaluate(()=>(window as any).__PA_REPOSITORY__.get('properties','property-murugan').price)).toBe(2400000);

  await page.goto('/#/type');
  await page.getByTestId('capture-text').fill('Call Suresh Tuesday');
  await page.getByTestId('analyze-capture').click();
  await page.getByTestId('field-targetPerson').selectOption('person-suresh');
  await page.getByTestId('save-capture').click();
  await expect(page.getByTestId('followup-list')).toContainText('Call Suresh');

  await page.goto('/#/type');
  await page.getByTestId('capture-text').fill('Suresh rejected this because road too narrow');
  await page.getByTestId('analyze-capture').click();
  await page.getByTestId('field-targetPerson').selectOption('person-suresh');
  await page.getByTestId('save-capture').click();
  const memory=await page.evaluate(()=>({
    requirement:(window as any).__PA_REPOSITORY__.get('requirements','requirement-suresh'),
    matches:(window as any).__PA_REPOSITORY__.list('matches')
  }));
  expect(memory.requirement.preferences).toContain('Wider road required');
  expect(memory.matches[0].reasons.join(' ')).toContain('prior narrow-road rejection');
});

test('legacy language preferences cannot change the English pilot or rewrite memory', async ({ page }) => {
  await page.goto('/#/home');
  await page.evaluate(() => (window as any).__PA_REPOSITORY__.seedSynthetic());
  const before = await page.evaluate(() => {
    const { matches: _derivedMatches, ...sourceMemory } = (window as any).__PA_REPOSITORY__.loadSnapshot().entities;
    return JSON.stringify(sourceMemory);
  });

  await page.evaluate(() => {
    localStorage.setItem('pa.displayLanguage','ta');
    localStorage.setItem('pa.inputLanguage','tg');
  });
  await page.reload();
  await expect(page.getByTestId('home-heading')).toContainText('Good morning');
  await expect(page.getByTestId('nav-requirements')).toContainText('Requirements');
  await expect(page.getByTestId('language-chip')).toHaveCount(0);
  await page.getByTestId('nav-requirements').click();
  await expect(page.getByRole('heading', { name: 'Requirements', exact: true })).toBeVisible();

  const after = await page.evaluate(() => {
    const { matches: _derivedMatches, ...sourceMemory } = (window as any).__PA_REPOSITORY__.loadSnapshot().entities;
    return JSON.stringify(sourceMemory);
  });
  expect(after).toBe(before);
});
