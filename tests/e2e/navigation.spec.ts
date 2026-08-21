import { test, expect } from '@playwright/test';

test('primary shell navigation is wired with no dead primary controls', async ({ page }) => {
  await page.goto('/#/home');
  await expect(page.getByRole('heading', { name: "Today's opportunities" })).toBeVisible();
  for (const [testId, heading] of [['nav-ask','Ask'],['nav-matches','Matches'],['nav-people','People']]) {
    await page.getByTestId(testId).click();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
  await page.getByTestId('nav-home').click();
  await page.getByTestId('speak-save').click();
  await expect(page.getByRole('heading', { name: 'Speak & Save' })).toBeVisible();
  await page.getByRole('button', { name: 'Use Type & Save instead' }).click();
  await expect(page.getByRole('heading', { name: 'Type & Save' })).toBeVisible();
});

test('display language and input language are independent', async ({ page }) => {
  await page.goto('/#/language');
  const before = await page.evaluate(() => JSON.stringify(window.__PA_SEED__));
  await page.getByRole('button', { name: /தமிழ்/ }).click();
  await expect(page.getByTestId('nav-home')).toContainText('முகப்பு');
  await page.getByRole('button', { name: /^Tanglish/ }).click();
  await expect(page.getByTestId('nav-ask')).toContainText('Kelu');
  await page.getByRole('button', { name: /^TamilSpeech and typed/ }).click();
  const after = await page.evaluate(() => JSON.stringify(window.__PA_SEED__));
  expect(after).toBe(before);
  expect(await page.evaluate(() => localStorage.getItem('pa.displayLanguage'))).toBe('tg');
  expect(await page.evaluate(() => localStorage.getItem('pa.inputLanguage'))).toBe('ta');
});

test('mobile shell has no unintended horizontal overflow', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'));
  await page.goto('/#/home');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
