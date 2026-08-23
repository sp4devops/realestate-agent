import { test, expect } from '@playwright/test';

const requiredStaticRoutes = [
  ['splash','Property Assistant'],
  ['onboarding','Welcome'],
  ['requirements','Requirements'],
  ['properties','Properties'],
  ['after-call','After-call recap'],
  ['ask','Ask'],
  ['people','Contacts'],
  ['matches','Matches'],
  ['poster','Scan Poster'],
  ['poster-review','Poster review'],
  ['followups','Follow-ups'],
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
  await page.getByTestId('type-save').click();
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

test('deferred voice and language deep links fall back to active pilot screens', async ({ page }) => {
  await page.goto('/#/speak');
  await expect(page.getByRole('heading', { name: 'Type & Save', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/#\/type$/);

  await page.goto('/#/language');
  await expect(page.getByRole('heading', { name: 'Settings & Backup', exact: true })).toBeVisible();
  await expect(page.getByTestId('pilot-mode')).toContainText('English typing');
  await expect(page).toHaveURL(/#\/settings$/);
});

test('onboarding is shown once and returning advisors open on Home', async ({ page }) => {
  await page.goto('/#/splash');
  await page.getByRole('button', { name: 'Get started' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue to Home' }).click();
  await expect(page.getByTestId('home-heading')).toContainText('Property Advisor');

  await page.goto('/#/splash');
  await expect(page).toHaveURL(/#\/home$/);
  await expect(page.getByTestId('home-heading')).toContainText('Property Advisor');
});

test('opening the full editor preserves text started on Home', async ({ page }) => {
  await page.goto('/#/home');
  const note='Ramesh needs a 2BHK rental in Erode under 15000 per month';
  await page.getByTestId('home-capture-text').fill(note);
  await page.getByTestId('type-save').click();
  await expect(page.getByTestId('capture-text')).toHaveValue(note);
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
