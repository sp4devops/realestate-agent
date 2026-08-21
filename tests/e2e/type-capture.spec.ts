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
  const saved = await page.evaluate(() => window.__PA_REPOSITORY__.list('requirements').find(item => item.personId && window.__PA_REPOSITORY__.get('people', item.personId)?.name === 'Arun Kumar'));
  expect(saved.propertyType).toBe('land');
  expect(saved.locations).toEqual(['Erode']);
  expect(saved.budgetMax).toBe(2500000);
});

test('Type & Save can save a property without AI', async ({ page }) => {
  await page.goto('/#/type');
  await page.getByTestId('capture-text').fill('Land for sale in Salem price 1800000');
  await page.getByTestId('analyze-capture').click();
  await expect(page.getByTestId('field-locality')).toHaveValue('Salem');
  await page.getByTestId('save-capture').click();
  await expect(page.getByTestId('property-title')).toContainText('land in Salem');
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
