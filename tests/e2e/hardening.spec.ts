import { test, expect } from '@playwright/test';

test('corrupt local domain data shows recovery instead of a blank app and keeps Settings reachable', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('pa.domain.v1','{broken-json'));
  await page.goto('/#/home');
  await expect(page.getByRole('heading',{name:'Saved on this phone needs a copy'})).toBeVisible();
  await expect(page.getByTestId('boot-error')).toContainText('corrupted');
  await page.getByRole('button',{name:'Open Settings & Backup'}).click();
  await expect(page.getByRole('heading',{name:'Settings & Backup',exact:true})).toBeVisible();
});

test('Android-style native backup export completes only after host success callback', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__nativeBackup = null;
    (window as any).PropertyAssistantHost = {
      exportBackup: (name:string, encrypted:string) => {
        (window as any).__nativeBackup = {name, encrypted};
        setTimeout(() => (window as any).__PA_BACKUP_EXPORT_RESULT__?.({ok:true,message:'Encrypted backup saved locally.'}), 0);
      }
    };
  });
  await page.goto('/#/settings');
  await page.getByTestId('backup-password').fill('device-safe-123');
  await page.getByTestId('backup-password-confirm').fill('device-safe-123');
  await page.getByTestId('create-backup').click();
  await expect(page.getByTestId('settings-status')).toContainText('saved locally');
  await expect(page.getByTestId('backup-status')).toContainText('Last backup:');
  const exported=await page.evaluate(()=>(window as any).__nativeBackup);
  expect(exported.name).toMatch(/\.pabackup$/);
  expect(exported.encrypted).toContain('property-assistant-backup');
});

test('repeated capture with the same mobile reuses one person instead of creating ambiguous identities', async ({ page }) => {
  await page.goto('/#/type');
  await page.getByTestId('capture-text').fill('Arun wants land in Erode budget 25 lakh phone 98765 43210');
  await page.getByTestId('analyze-capture').click();
  await page.getByTestId('save-capture').click();
  await expect(page.getByTestId('person-name')).toHaveText('Arun');
  await page.goto('/#/type');
  await page.getByTestId('capture-text').fill('Arun wants 2 acre land in Perundurai budget 30 lakh phone 98765-43210');
  await page.getByTestId('analyze-capture').click();
  await page.getByTestId('save-capture').click();
  const counts=await page.evaluate(() => ({
    people:(window as any).__PA_REPOSITORY__.list('people').filter((p:any)=>String(p.primaryPhone).replace(/\D/g,'').endsWith('9876543210')).length,
    requirements:(window as any).__PA_REPOSITORY__.list('requirements').length
  }));
  expect(counts).toEqual({people:1,requirements:2});
});
