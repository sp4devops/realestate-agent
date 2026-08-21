import { test, expect } from '@playwright/test';

test('settings creates an encrypted local backup and shows privacy/status', async ({ page }) => {
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: 'Settings & Backup', exact: true })).toBeVisible();
  await expect(page.getByText(/Core data is not uploaded by default/i)).toBeVisible();
  await page.getByTestId('backup-password').fill('device-safe-123');
  const downloadPromise=page.waitForEvent('download');
  await page.getByTestId('create-backup').click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pabackup$/);
  await expect(page.getByTestId('settings-status')).toContainText('Encrypted backup created');
  await expect(page.getByTestId('backup-status')).toContainText('Last backup:');
});

test('wrong restore password fails safely without changing local records', async ({ page }) => {
  await page.goto('/#/settings');
  const encrypted=await page.evaluate(async()=>{
    const core=(window as any).PropertyAssistantBackup;
    const payload=await core.createPayload({repository:(window as any).__PA_REPOSITORY__,imageStore:(window as any).PropertyAssistantPosterImages,storage:localStorage});
    return core.encryptPayload(payload,'correct-safe-123');
  });
  const before=await page.evaluate(()=>JSON.stringify((window as any).__PA_REPOSITORY__.loadSnapshot()));
  await page.getByTestId('restore-file').setInputFiles({name:'safe.pabackup',mimeType:'application/json',buffer:Buffer.from(encrypted)});
  await page.getByTestId('restore-password').fill('wrong-safe-123');
  await page.getByTestId('restore-backup').click();
  await expect(page.getByTestId('settings-status')).toContainText(/wrong or the backup is corrupted/i);
  const after=await page.evaluate(()=>JSON.stringify((window as any).__PA_REPOSITORY__.loadSnapshot()));
  expect(after).toBe(before);
});

test('display-language changes UI while structured memory remains unchanged', async ({ page }) => {
  await page.goto('/#/language');
  const before=await page.evaluate(()=>JSON.stringify((window as any).__PA_REPOSITORY__.loadSnapshot()));
  await page.getByTestId('display-language-options').getByRole('button',{name:/தமிழ்/}).click();
  await page.goto('/#/home');
  await expect(page.getByRole('heading',{name:'இன்றைய வாய்ப்புகள்'})).toBeVisible();
  const after=await page.evaluate(()=>JSON.stringify((window as any).__PA_REPOSITORY__.loadSnapshot()));
  expect(after).toBe(before);
});
