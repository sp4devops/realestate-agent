import { test, expect } from '@playwright/test';

test('typed poster fallback saves phone-first lead and creates follow-up without GPS',async({page})=>{
 await page.goto('/#/poster');
 await page.getByTestId('poster-text').fill('Land for sale. Location: Erode. Call 9876543210');
 await page.getByTestId('use-poster-text').click();
 await expect(page.getByRole('heading',{name:'Poster review'})).toBeVisible();
 await expect(page.getByTestId('poster-phone')).toHaveValue('9876543210');
 await expect(page.getByTestId('poster-location')).toHaveValue('Erode');
 await expect(page.getByTestId('capture-location')).toContainText('GPS is optional');
 await page.getByTestId('save-poster-lead').click();
 await expect(page.getByRole('heading',{name:'Poster lead'})).toBeVisible();
 await expect(page.getByTestId('saved-poster-phone')).toHaveText('9876543210');
 const persisted=await page.evaluate(()=>window.__PA_REPOSITORY__.loadSnapshot());
 expect(Object.values((persisted as any).entities.posterLeads).some((lead:any)=>lead.phone==='9876543210'&&lead.posterLocation==='Erode'&&!lead.captureLocation)).toBe(true);
 expect(Object.values((persisted as any).entities.followUps).some((f:any)=>String(f.title).includes('9876543210'))).toBe(true);
});

test('local OCR adapter reads selected image and keeps poster place separate from one-shot GPS',async({page,context})=>{
 await context.grantPermissions(['geolocation']); await context.setGeolocation({latitude:11.3410,longitude:77.7172});
 await page.addInitScript(()=>{(window as any).__PA_LOCAL_OCR__={recognize:async()=>({text:'House for rent. Location: Chennai. Contact 9123456789'})};});
 await page.goto('/#/poster');
 await page.getByTestId('poster-image').setInputFiles({name:'poster.png',mimeType:'image/png',buffer:Buffer.from('fake-image')});
 await page.getByTestId('read-poster').click();
 await expect(page.getByTestId('poster-phone')).toHaveValue('9123456789');
 await expect(page.getByTestId('poster-location')).toHaveValue('Chennai');
 await page.getByTestId('get-capture-location').click();
 await expect(page.getByTestId('capture-location')).toContainText('11.341');
 await expect(page.getByTestId('capture-location')).toContainText('77.7172');
 await page.getByTestId('save-poster-lead').click();
 const persisted=await page.evaluate(()=>window.__PA_REPOSITORY__.loadSnapshot());
 const lead=Object.values((persisted as any).entities.posterLeads).find((item:any)=>item.phone==='9123456789') as any;
 expect(lead.posterLocation).toBe('Chennai'); expect(lead.captureLocation).toContain('11.341');
});

test('OCR unavailable is a recoverable user-facing state',async({page})=>{
 await page.goto('/#/poster');
 await page.getByTestId('poster-image').setInputFiles({name:'poster.png',mimeType:'image/png',buffer:Buffer.from('fake-image')});
 await page.getByTestId('read-poster').click();
 await expect(page.getByTestId('poster-status')).toContainText('Local OCR is unavailable');
 await expect(page.getByTestId('poster-text')).toBeEditable();
});
