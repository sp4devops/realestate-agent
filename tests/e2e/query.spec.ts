import { test, expect } from '@playwright/test';

async function seedDemo(page) {
  await page.goto('/#/home');
  await page.evaluate(() => (window as any).__PA_REPOSITORY__.seedSynthetic());
  await page.goto('/#/ask');
}

test('typed Ask returns an actionable local property card',async({page})=>{
  await seedDemo(page);
  await page.getByTestId('query-input').fill('show land in Erode under 25 lakh');
  await page.getByTestId('run-query').click();
  const card=page.getByTestId('query-result-card').filter({hasText:'land in Erode'});
  await expect(card).toContainText('₹22,00,000');
  await card.getByRole('button',{name:'Open'}).click();
  await expect(page.getByTestId('property-title')).toContainText('land in Erode');
});

test('typed Ask supports keyboard submit and contact lookup',async({page})=>{
  await seedDemo(page);
  await page.getByTestId('query-input').fill('find Suresh contact');
  await page.getByTestId('query-input').press('Enter');
  await expect(page.getByTestId('query-result-card').filter({hasText:'Suresh (Demo)'})).toBeVisible();
  await expect(page.getByTestId('query-summary')).toHaveText('1 result from local memory.');
});

test('empty Ask input shows guidance instead of dumping all local memory',async({page})=>{
  await seedDemo(page);
  await page.getByTestId('run-query').click();
  await expect(page.getByTestId('query-summary')).toHaveText('Type what you want to find first.');
  await expect(page.getByTestId('query-result-card')).toHaveCount(0);
  await expect(page.getByText(/No local results found/)).toHaveCount(0);
});

test('Ask exposes typing only in the focused pilot',async({page})=>{
  await page.goto('/#/ask');
  await expect(page.getByRole('heading',{name:'Ask',exact:true})).toBeVisible();
  await expect(page.getByText(/Type what you need in English/)).toBeVisible();
  await expect(page.getByTestId('start-query-voice')).toHaveCount(0);
  await expect(page.getByTestId('stop-query-voice')).toHaveCount(0);
});
