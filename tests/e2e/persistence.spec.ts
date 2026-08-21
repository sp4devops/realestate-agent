import { test, expect } from '@playwright/test';

test('local person CRUD survives page reload without a model or network', async ({ page }) => {
  await page.goto('/#/people');

  await page.evaluate(() => {
    window.__PA_REPOSITORY__.create('people', {
      id: 'person-persisted-demo',
      name: 'Kavitha (Demo)',
      role: 'buyer',
      primaryPhone: '+91 90000 00201',
      alternatePhones: ['+91 90000 00202']
    });
  });
  await page.reload();
  await expect(page.getByTestId('people-list')).toContainText('Kavitha (Demo)');
  await expect(page.getByTestId('people-list')).toContainText('+91 90000 00201');

  await page.evaluate(() => {
    window.__PA_REPOSITORY__.update('people', 'person-persisted-demo', { name: 'Kavitha Buyer (Demo)' });
  });
  await page.reload();
  await expect(page.getByTestId('people-list')).toContainText('Kavitha Buyer (Demo)');

  await page.getByRole('button', { name: 'Open' }).last().click();
  await expect(page.getByTestId('primary-phone')).toHaveText('+91 90000 00201');
  await expect(page.getByText('+91 90000 00202')).toBeVisible();

  await page.evaluate(() => window.__PA_REPOSITORY__.remove('people', 'person-persisted-demo'));
  await page.goto('/#/people');
  await expect(page.getByTestId('people-list')).not.toContainText('Kavitha Buyer (Demo)');
});

test('display-language changes do not mutate persisted domain records', async ({ page }) => {
  await page.goto('/#/people');
  const before = await page.evaluate(() => JSON.stringify(window.__PA_REPOSITORY__.loadSnapshot()));
  await page.goto('/#/language');
  await page.getByTestId('display-language-options').getByRole('button', { name: /^தமிழ்/ }).click();
  const after = await page.evaluate(() => JSON.stringify(window.__PA_REPOSITORY__.loadSnapshot()));
  expect(after).toBe(before);
});
