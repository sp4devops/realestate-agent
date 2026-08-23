import { test, expect } from '@playwright/test';

async function seedDemo(page) {
  await page.goto('/#/home');
  await page.evaluate(() => (window as any).__PA_REPOSITORY__.seedSynthetic());
  await page.goto('/#/matches');
}

test('Suresh and Murugan seed records produce an explained match and idempotent follow-up action', async ({ page }) => {
  await seedDemo(page);
  const card=page.getByTestId('match-card').filter({hasText:'Suresh (Demo)'});
  await expect(card).toContainText(/land in Erode/i);
  await expect(card).toContainText('Match score 100');
  await card.getByRole('button',{name:'Why this match?'}).click();
  await expect(page.getByTestId('match-title')).toContainText('Suresh (Demo)');
  await expect(page.getByTestId('match-reasons')).toContainText('Exact location: Erode');
  await expect(page.getByTestId('match-reasons')).toContainText('Within stated budget');
  await page.getByRole('button',{name:'Follow up'}).click();
  await expect(page.getByTestId('match-action-status')).toContainText('saved locally');
  await page.getByRole('button',{name:'Follow up'}).click();
  await expect(page.getByTestId('match-action-status')).toContainText('already exists');
  const count=await page.evaluate(()=>(window as any).__PA_REPOSITORY__.list('followUps').filter(item=>item.personId==='person-suresh' && item.propertyId==='property-murugan' && item.status==='open').length);
  expect(count).toBe(1);
});

test('match recalculates when supply changes', async ({ page }) => {
  await seedDemo(page);
  await expect(page.getByTestId('match-card').filter({hasText:'Suresh (Demo)'})).toBeVisible();
  await page.evaluate(()=>(window as any).__PA_REPOSITORY__.update('properties','property-murugan',{price:3000000}));
  await page.reload();
  await expect(page.getByText('No useful matches yet.')).toBeVisible();
  const removed=await page.evaluate(()=>(window as any).__PA_REPOSITORY__.get('matches','match-requirement-suresh-property-murugan'));
  expect(removed).toBeNull();
});

test('typed capture remains usable after matching phase', async ({ page }) => {
  await page.goto('/#/type');
  await expect(page.getByRole('heading',{name:'Type & Save'})).toBeVisible();
  await page.getByTestId('capture-text').fill('Kumar wants land in Salem budget 18 lakh phone 98765 12345');
  await page.getByTestId('analyze-capture').click();
  await expect(page.getByRole('heading',{name:'Check what I understood'})).toBeVisible();
});
