import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const criticalRoutes = ['home','requirements','properties','type','ask','matches','people','followups','poster','settings'];
const artifactDir = 'p10-artifacts';

function projectSlug(name: string) {
  return name.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
}

test('P10 captures startup, heap and local-storage measurements', async ({ page }, testInfo) => {
  await page.goto('/#/home');
  await expect(page.getByRole('heading', { name: /Property Advisor/ })).toBeVisible();

  const metrics = await page.evaluate(async () => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const perfMemory = (performance as any).memory;
    const storage = navigator.storage?.estimate ? await navigator.storage.estimate() : {};
    return {
      domContentLoadedMs: nav ? nav.domContentLoadedEventEnd - nav.startTime : null,
      loadEventMs: nav ? nav.loadEventEnd - nav.startTime : null,
      encodedResourceBytes: resources.reduce((sum, item) => sum + (item.encodedBodySize || 0), 0),
      resourceCount: resources.length,
      usedJsHeapBytes: perfMemory?.usedJSHeapSize ?? null,
      jsHeapLimitBytes: perfMemory?.jsHeapSizeLimit ?? null,
      storageUsageBytes: storage.usage ?? null,
      storageQuotaBytes: storage.quota ?? null,
    };
  });

  mkdirSync(artifactDir, { recursive: true });
  const metricJson = JSON.stringify(metrics, null, 2);
  writeFileSync(`${artifactDir}/${projectSlug(testInfo.project.name)}-runtime-metrics.json`, metricJson);
  console.log(`[P10_METRICS:${testInfo.project.name}] ${JSON.stringify(metrics)}`);
  await testInfo.attach('p10-runtime-metrics.json', {
    body: Buffer.from(metricJson),
    contentType: 'application/json',
  });

  expect(metrics.domContentLoadedMs ?? 0).toBeLessThan(3000);
  expect(metrics.encodedResourceBytes).toBeLessThan(2 * 1024 * 1024);
  if (metrics.usedJsHeapBytes != null) expect(metrics.usedJsHeapBytes).toBeLessThan(128 * 1024 * 1024);
  if (metrics.storageUsageBytes != null) expect(metrics.storageUsageBytes).toBeLessThan(20 * 1024 * 1024);
});

test('P10 critical screens have names, focusable controls, visual baselines and no horizontal overflow', async ({ page }, testInfo) => {
  mkdirSync(artifactDir, { recursive: true });
  const project = projectSlug(testInfo.project.name);

  for (const route of criticalRoutes) {
    await page.goto(`/#/${route}`);
    await expect(page.getByRole('heading').first()).toBeVisible();

    const audit = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button:not([hidden])')] as HTMLButtonElement[];
      const inputs = [...document.querySelectorAll('input:not([hidden]),textarea:not([hidden]),select:not([hidden])')] as (HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement)[];
      const unnamed = buttons.filter((button) => {
        const name = button.getAttribute('aria-label') || button.textContent || button.title;
        return !name.trim();
      }).length;
      const unlabeledInputs = inputs.filter((input) => !input.labels?.length && !input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')).length;
      const doc = document.documentElement;
      const primaryTargets = [...document.querySelectorAll('.button,.nav-item,.brand,.text-button,.choice,.capture')] as HTMLElement[];
      const undersized = primaryTargets.filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
      }).length;
      const undersizedInputs = inputs.filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 120 || rect.height < 44);
      }).length;
      return {
        unnamed,
        unlabeledInputs,
        undersized,
        undersizedInputs,
        overflowPx: Math.max(0, doc.scrollWidth - doc.clientWidth),
        lang: document.documentElement.lang,
      };
    });

    expect(audit.unnamed, `${route}: unnamed buttons`).toBe(0);
    expect(audit.unlabeledInputs, `${route}: unlabeled form controls`).toBe(0);
    expect(audit.undersized, `${route}: undersized primary touch targets`).toBe(0);
    expect(audit.undersizedInputs, `${route}: undersized form controls`).toBe(0);
    expect(audit.overflowPx, `${route}: horizontal overflow`).toBeLessThanOrEqual(1);
    expect(audit.lang).toBe('en');

    await page.screenshot({
      path: `${artifactDir}/${project}-${route}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }

  await page.goto('/#/home');
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();
  const outline = await focused.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});

test('P10 retains populated second-brain visual evidence on action-dense screens',async({page},testInfo)=>{
  mkdirSync(artifactDir,{recursive:true}); const project=projectSlug(testInfo.project.name);
  await page.goto('/#/home');
  await page.evaluate(()=>{
    const repo=(window as any).__PA_REPOSITORY__;
    repo.seedSynthetic();
    repo.create('followUps',{id:'visual-followup',dueAt:new Date(Date.now()+3600000).toISOString(),status:'open',title:'Confirm Murugan asking price',personId:'person-murugan',propertyId:'property-murugan'});
    (window as any).PropertyAssistantMatching.sync(repo);
  });
  for(const route of ['home','requirements','properties','matches','people','followups']){
    await page.goto(`/#/${route}`);
    await expect(page.getByRole('heading').first()).toBeVisible();
    await page.screenshot({path:`${artifactDir}/${project}-populated-${route}.png`,fullPage:true,animations:'disabled'});
  }
});

test('P10 core local workflow remains usable after network is lost', async ({ page, context }) => {
  await page.goto('/#/home');
  await expect(page.getByRole('heading', { name: /Property Advisor/ })).toBeVisible();
  await context.setOffline(true);

  await page.getByTestId('type-save').click();
  await expect(page.getByRole('heading', { name: 'Type & Save' })).toBeVisible();
  await page.getByTestId('capture-text').fill('Ravi wants land in Erode budget 25 lakh phone 98765 43219');
  await page.getByTestId('analyze-capture').click();
  await expect(page.getByRole('heading', { name: 'Check what I understood' })).toBeVisible();
  await page.getByTestId('save-capture').click();
  await expect(page.getByTestId('person-name')).toContainText('Ravi');

  await page.evaluate(() => { location.hash = '#/people'; });
  await expect(page.getByText('Ravi')).toBeVisible();
  await page.evaluate(() => { location.hash = '#/matches'; });
  await expect(page.getByRole('heading').first()).toBeVisible();
});

test('P10 focused pilot keeps English typed capture and local persistence usable', async ({ page }) => {
  await page.goto('/#/speak');
  await expect(page.getByRole('heading', { name: 'Type & Save' })).toBeVisible();
  await page.getByTestId('capture-text').fill('Meena wants land in Erode budget 30 lakh phone 98765 43218');
  await page.getByTestId('analyze-capture').click();
  await expect(page.getByRole('heading', { name: 'Check what I understood' })).toBeVisible();
  await page.getByTestId('save-capture').click();

  const saved = await page.evaluate(() => (window as any).__PA_REPOSITORY__.list('people').some((person:any) => person.name === 'Meena'));
  expect(saved).toBe(true);
  await page.evaluate(() => { location.hash = '#/home'; });
  await expect(page.getByRole('heading', { name: /Property Advisor/ })).toBeVisible();
});
