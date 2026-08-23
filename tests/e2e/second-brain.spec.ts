import { test, expect } from '@playwright/test';

test('Assistant home understands an everyday Tanglish note before review', async ({ page }) => {
  await page.goto('/#/home');
  const note='Ramesh-ku Erode railway station pakkathula 2BHK rent venum. Budget 15k. Family only. Next month move pannuvaaru. Phone 98765 40101.';
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

test('core second-brain surfaces change display language without rewriting memory', async ({ page }) => {
  await page.goto('/#/home');
  await page.evaluate(() => (window as any).__PA_REPOSITORY__.seedSynthetic());
  const before = await page.evaluate(() => JSON.stringify((window as any).__PA_REPOSITORY__.loadSnapshot().entities));

  await page.getByRole('button', { name: 'TA', exact: true }).click();
  await expect(page.getByTestId('home-heading')).toContainText('வணக்கம்');
  await expect(page.getByTestId('nav-requirements')).toContainText('தேவைகள்');
  await page.getByTestId('nav-requirements').click();
  await expect(page.getByRole('heading', { name: 'தேவைகள்', exact: true })).toBeVisible();

  const after = await page.evaluate(() => JSON.stringify((window as any).__PA_REPOSITORY__.loadSnapshot().entities));
  expect(after).toBe(before);
});
