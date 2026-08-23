import { test, expect } from '@playwright/test';

const requiredStaticRoutes = [
  ['splash','Property Assistant'],
  ['onboarding','Welcome'],
  ['requirements','Requirements'],
  ['properties','Properties'],
  ['speak','Speak & Save'],
  ['after-call','After-call recap'],
  ['ask','Ask'],
  ['people','Contacts'],
  ['matches','Matches'],
  ['poster','Scan Poster'],
  ['poster-review','Poster review'],
  ['followups','Follow-ups'],
  ['language','Language'],
  ['settings','Settings & Backup']
];

async function seedDemo(page) {
  await page.goto('/#/home');
  await page.evaluate(() => (window as any).__PA_REPOSITORY__.seedSynthetic());
}

test('all approved shell routes render, including dynamic persistence/capture/match routes', async ({ page }) => {
  await page.goto('/#/home');
  await expect(page.getByRole('heading', { name: /Property Advisor/ })).toBeVisible();
  for (const [route, heading] of requiredStaticRoutes) {
    await page.goto(`/#/${route}`);
    await expect(page.getByRole('heading', { name: heading, exact: true, level: 1 })).toBeVisible();
  }

  await seedDemo(page);
  await page.goto('/#/type');
  await expect(page.getByRole('heading', { name: 'Type & Save', exact: true })).toBeVisible();
  await page.goto('/#/person?id=person-suresh');
  await expect(page.getByTestId('person-name')).toHaveText('Suresh (Demo)');
  await page.goto('/#/property?id=property-murugan');
  await expect(page.getByTestId('property-title')).toContainText('land in Erode');
  await page.goto('/#/matches');
  await page.goto('/#/match?id=match-requirement-suresh-property-murugan');
  await expect(page.getByTestId('match-title')).toContainText('Suresh (Demo)');

  await page.goto('/#/home');
  const posterLeadId = await page.evaluate(() => {
    const repository = (window as any).__PA_REPOSITORY__;
    return repository.create('posterLeads', {
      id: 'poster-nav-demo',
      phone: '9876543210',
      imageRef: 'text:navigation fixture',
      posterLocation: 'Erode',
      captureLocation: null,
      capturedAt: '2026-08-21T00:00:00.000Z'
    }).id;
  });
  await page.goto(`/#/poster-lead?id=${posterLeadId}`);
  await expect(page.getByRole('heading', { name: 'Poster lead', exact: true })).toBeVisible();
  await expect(page.getByTestId('saved-poster-phone')).toHaveText('9876543210');
});

test('primary shell navigation is wired with no dead primary controls', async ({ page }) => {
  await page.goto('/#/home');
  await expect(page.getByRole('heading', { name: /Property Advisor/ })).toBeVisible();
  for (const [testId, heading] of [['nav-requirements','Requirements'],['nav-properties','Properties'],['nav-matches','Matches'],['nav-followups','Follow-ups']]) {
    await page.getByTestId(testId).click();
    await expect(page.getByRole('heading', { name: heading, exact: true, level: 1 })).toBeVisible();
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
  const before = await page.evaluate(() => JSON.stringify((window as any).__PA_SEED__));
  const displayOptions = page.getByTestId('display-language-options');
  const inputOptions = page.getByTestId('input-language-options');

  await displayOptions.getByRole('button', { name: /^தமிழ்/ }).click();
  await expect(page.getByTestId('nav-home')).toContainText('முகப்பு');
  await displayOptions.getByRole('button', { name: /^Tanglish/ }).click();
  await expect(page.getByTestId('nav-requirements')).toContainText('Thevaigal');
  await inputOptions.getByRole('button', { name: /^Tamil/ }).click();

  const after = await page.evaluate(() => JSON.stringify((window as any).__PA_SEED__));
  expect(after).toBe(before);
  expect(await page.evaluate(() => localStorage.getItem('pa.displayLanguage'))).toBe('tg');
  expect(await page.evaluate(() => localStorage.getItem('pa.inputLanguage'))).toBe('ta');
});

test('fresh install does not inject synthetic people or properties', async ({ page }) => {
  await page.goto('/#/home');
  const counts = await page.evaluate(() => ({
    people: (window as any).__PA_REPOSITORY__.list('people').length,
    properties: (window as any).__PA_REPOSITORY__.list('properties').length,
    requirements: (window as any).__PA_REPOSITORY__.list('requirements').length
  }));
  expect(counts).toEqual({ people: 0, properties: 0, requirements: 0 });
});

test('mobile shell has no unintended horizontal overflow', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'));
  await page.goto('/#/home');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
