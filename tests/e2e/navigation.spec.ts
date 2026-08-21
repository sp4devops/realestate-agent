import { test, expect } from '@playwright/test';

const requiredRoutes = [
  ['splash','Property Assistant'],
  ['onboarding','Welcome'],
  ['speak','Speak & Save'],
  ['type','Type & Save'],
  ['review','Review'],
  ['after-call','After-call recap'],
  ['ask','Ask'],
  ['people','People'],
  ['person','Person detail'],
  ['property','Property detail'],
  ['matches','Matches'],
  ['match','Match detail'],
  ['poster','Scan Poster'],
  ['poster-review','Poster review'],
  ['poster-lead','Poster lead'],
  ['followups','Follow-ups'],
  ['language','Language'],
  ['settings','Settings & Backup']
];

test('all approved P1 shell routes render', async ({ page }) => {
  await page.goto('/#/home');
  await expect(page.getByRole('heading', { name: "Today's opportunities" })).toBeVisible();
  for (const [route, heading] of requiredRoutes) {
    await page.goto(`/#/${route}`);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
});

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

test('capture shortcuts reach poster and after-call shells', async ({ page }) => {
  await page.goto('/#/home');
  await page.getByRole('button', { name: /Scan Poster/ }).click();
  await expect(page.getByRole('heading', { name: 'Scan Poster' })).toBeVisible();
  await page.goto('/#/home');
  await page.getByRole('button', { name: 'After-call recap' }).click();
  await expect(page.getByRole('heading', { name: 'After-call recap' })).toBeVisible();
});

test('display language and input language are independent', async ({ page }) => {
  await page.goto('/#/language');
  const before = await page.evaluate(() => JSON.stringify(window.__PA_SEED__));
  const displayOptions = page.getByTestId('display-language-options');
  const inputOptions = page.getByTestId('input-language-options');

  await displayOptions.getByRole('button', { name: /^தமிழ்/ }).click();
  await expect(page.getByTestId('nav-home')).toContainText('முகப்பு');
  await displayOptions.getByRole('button', { name: /^Tanglish/ }).click();
  await expect(page.getByTestId('nav-ask')).toContainText('Kelu');
  await inputOptions.getByRole('button', { name: /^Tamil/ }).click();

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
