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
 const persisted=await page.evaluate(()=>(window as any).__PA_REPOSITORY__.loadSnapshot());
 const lead=Object.values((persisted as any).entities.posterLeads).find((item:any)=>item.phone==='9876543210') as any;
 expect(lead.posterLocation).toBe('Erode'); expect(lead.captureLocation).toBe(null); expect(lead.imageRef).toBe(null);
 expect(Object.values((persisted as any).entities.followUps).some((f:any)=>String(f.title).includes('9876543210'))).toBe(true);
});

test('local OCR adapter preserves original image outside domain storage and keeps poster place separate from one-shot GPS',async({page,context})=>{
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
 await expect(page.getByTestId('saved-poster-image')).toHaveText('Saved locally');
 const result=await page.evaluate(async()=>{
   const persisted=(window as any).__PA_REPOSITORY__.loadSnapshot();
   const lead=Object.values(persisted.entities.posterLeads).find((item:any)=>item.phone==='9123456789') as any;
   const image=await (window as any).PropertyAssistantPosterImages.get(lead.imageRef);
   return {lead,image:{size:image?.size,type:image?.type,name:image?.name}};
 });
 expect(result.lead.posterLocation).toBe('Chennai'); expect(result.lead.captureLocation).toContain('11.341');
 expect(result.lead.imageRef).toMatch(/^poster-image-/); expect(result.lead.imageRef).not.toContain('data:');
 expect(result.image).toEqual({size:10,type:'image/png',name:'poster.png'});
});

test('OCR unavailable is a recoverable user-facing state',async({page})=>{
 await page.goto('/#/poster');
 await page.getByTestId('poster-image').setInputFiles({name:'poster.png',mimeType:'image/png',buffer:Buffer.from('fake-image')});
 await page.getByTestId('read-poster').click();
 await expect(page.getByTestId('poster-status')).toContainText('Local OCR is unavailable');
 await expect(page.getByTestId('poster-text')).toBeEditable();
});
