import { test, expect } from '@playwright/test';

test('settings creates an encrypted local backup and shows privacy/status', async ({ page }) => {
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: 'Settings & Backup', exact: true })).toBeVisible();
  await expect(page.getByText(/Core data is not uploaded by default/i)).toBeVisible();
  await page.getByTestId('backup-password').fill('device-safe-123');
  await page.getByTestId('backup-password-confirm').fill('device-safe-123');
  const downloadPromise=page.waitForEvent('download');
  await page.getByTestId('create-backup').click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^phone-copy-.*\.json$/);
  await expect(page.getByTestId('settings-status')).toContainText('Encrypted backup created');
  await expect(page.getByTestId('backup-status')).toContainText('Last backup:');
});

test('backup creation rejects mismatched password confirmation', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByTestId('backup-password').fill('device-safe-123');
  await page.getByTestId('backup-password-confirm').fill('device-safe-456');
  await page.getByTestId('create-backup').click();
  await expect(page.getByTestId('settings-status')).toContainText('Backup passwords do not match');
  await expect(page.getByTestId('backup-status')).toHaveText('No backup created yet.');
});

test('a produced encrypted backup restores through the file-upload UI', async ({ page }) => {
  await page.goto('/#/settings');
  const encrypted=await page.evaluate(async()=>{
    const core=(window as any).PropertyAssistantBackup;
    const payload=await core.createPayload({repository:(window as any).__PA_REPOSITORY__,imageStore:(window as any).PropertyAssistantPosterImages,storage:localStorage});
    return core.encryptPayload(payload,'restore-safe-123');
  });
  await page.evaluate(()=>{
    localStorage.setItem('pa.displayLanguage','ta');
    (window as any).__PA_REPOSITORY__.create('people',{id:'person-temporary',name:'Temporary',role:'buyer',primaryPhone:'+91 90000 00009',alternatePhones:[]});
  });
  await page.getByTestId('restore-file').setInputFiles({name:'produced-phone-copy.json',mimeType:'application/json',buffer:Buffer.from(encrypted)});
  await page.getByTestId('restore-password').fill('restore-safe-123');
  const loadPromise=page.waitForEvent('load');
  await page.getByTestId('restore-backup').click();
  await loadPromise;
  await expect(page.getByRole('heading',{name:'Settings & Backup',exact:true})).toBeVisible();
  const restored=await page.evaluate(()=>({display:localStorage.getItem('pa.displayLanguage'),temporary:(window as any).__PA_REPOSITORY__.get('people','person-temporary')}));
  expect(restored.display).toBe('en');
  expect(restored.temporary).toBeNull();
});

test('wrong restore password fails safely without changing local records', async ({ page }) => {
  await page.goto('/#/settings');
  const encrypted=await page.evaluate(async()=>{
    const core=(window as any).PropertyAssistantBackup;
    const payload=await core.createPayload({repository:(window as any).__PA_REPOSITORY__,imageStore:(window as any).PropertyAssistantPosterImages,storage:localStorage});
    return core.encryptPayload(payload,'correct-safe-123');
  });
  const before=await page.evaluate(()=>JSON.stringify((window as any).__PA_REPOSITORY__.loadSnapshot()));
  await page.getByTestId('restore-file').setInputFiles({name:'safe-phone-copy.json',mimeType:'application/json',buffer:Buffer.from(encrypted)});
  await page.getByTestId('restore-password').fill('wrong-safe-123');
  await page.getByTestId('restore-backup').click();
  await expect(page.getByTestId('settings-status')).toContainText(/wrong or the backup is corrupted/i);
  const after=await page.evaluate(()=>JSON.stringify((window as any).__PA_REPOSITORY__.loadSnapshot()));
  expect(after).toBe(before);
});

test('settings clearly identifies the focused English typing pilot', async ({ page }) => {
  await page.goto('/#/settings');
  const before=await page.evaluate(()=>JSON.stringify((window as any).__PA_REPOSITORY__.loadSnapshot()));
  await expect(page.getByTestId('pilot-mode')).toContainText('English typing');
  await expect(page.getByTestId('pilot-mode')).toContainText('Voice and additional languages are deferred');
  await expect(page.getByRole('button',{name:/Language settings/})).toHaveCount(0);
  const after=await page.evaluate(()=>JSON.stringify((window as any).__PA_REPOSITORY__.loadSnapshot()));
  expect(after).toBe(before);
});
