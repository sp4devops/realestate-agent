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

test('OCR-confused phone digits are recovered with an explicit review warning',async({page})=>{
 await page.addInitScript(()=>{(window as any).__PA_LOCAL_OCR__={recognize:async()=>({text:'LAND FOR SALE\nHighway\nCall: 9B765-43210'})};});
 await page.goto('/#/poster');
 await page.getByTestId('poster-image').setInputFiles({name:'noisy-poster.png',mimeType:'image/png',buffer:Buffer.from('noisy-image')});
 await page.getByTestId('read-poster').click();
 await expect(page.getByTestId('poster-phone')).toHaveValue('9876543210');
 await expect(page.getByTestId('poster-phone-warning')).toContainText('Compare the number');
 await expect(page.getByTestId('poster-phone')).toHaveAttribute('aria-describedby','poster-phone-warning');
 await page.getByTestId('save-poster-lead').click();
 await expect(page.getByTestId('poster-review-status')).toContainText('Confirm that the recovered phone number');
 await page.getByTestId('confirm-poster-phone').click();
 await expect(page.getByTestId('poster-phone-warning')).toHaveCount(0);
 await expect(page.getByTestId('poster-phone')).not.toHaveAttribute('aria-describedby');
});

for(const noisyPhone of ['So123-456-789','90123-456-789']){
 test(`ambiguous screenshot OCR ${noisyPhone} stays blank instead of inventing a phone number`,async({page})=>{
  await page.addInitScript(value=>{(window as any).__PA_LOCAL_OCR__={recognize:async()=>({text:`LAND FOR SALE\nHighway\n${value}`})};},noisyPhone);
  await page.goto('/#/poster');
  await page.getByTestId('poster-image').setInputFiles({name:'ambiguous-poster.png',mimeType:'image/png',buffer:Buffer.from('ambiguous-image')});
  await page.getByTestId('read-poster').click();
  await expect(page.getByTestId('poster-phone')).toHaveValue('');
  await expect(page.getByTestId('poster-phone-warning')).toHaveCount(0);
  await expect(page.getByTestId('poster-review-text')).toContainText(noisyPhone);
 });
}

test('local OCR adapter preserves original image outside domain storage and keeps poster place separate from one-shot GPS',async({page,context})=>{
 await context.grantPermissions(['geolocation']); await context.setGeolocation({latitude:11.3410,longitude:77.7172});
 await page.addInitScript(()=>{(window as any).__PA_LOCAL_OCR__={recognize:async()=>({text:'House for rent. Location: Chennai. Contact 9123456789'})};});
 await page.goto('/#/poster');
 await page.getByTestId('poster-image').setInputFiles({name:'poster.png',mimeType:'image/png',buffer:Buffer.from('fake-image')});
 await page.getByTestId('read-poster').click();
 await expect(page.getByTestId('poster-phone')).toHaveValue('9123456789');
 await expect(page.getByTestId('poster-preview')).toBeVisible();
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

test('one-shot GPS preserves corrected poster phone, area and text through save',async({page,context})=>{
 await context.grantPermissions(['geolocation']); await context.setGeolocation({latitude:11.3410,longitude:77.7172});
 await page.addInitScript(()=>{(window as any).__PA_LOCAL_OCR__={recognize:async()=>({text:'Wrong text. Location: Chennai. Contact 9123456789'})};});
 await page.goto('/#/poster');
 await page.getByTestId('poster-image').setInputFiles({name:'poster.png',mimeType:'image/png',buffer:Buffer.from('fake-image')});
 await page.getByTestId('read-poster').click();
 await page.getByTestId('poster-phone').fill('9345678901');
 await page.getByTestId('poster-location').fill('Perundurai');
 await page.getByTestId('poster-review-text').fill('Corrected land poster in Perundurai. Call 9345678901');
 await page.getByTestId('get-capture-location').click();
 await expect(page.getByTestId('capture-location')).toContainText('11.341');
 await expect(page.getByTestId('poster-phone')).toHaveValue('9345678901');
 await expect(page.getByTestId('poster-location')).toHaveValue('Perundurai');
 await expect(page.getByTestId('poster-review-text')).toHaveValue('Corrected land poster in Perundurai. Call 9345678901');
 await page.getByTestId('save-poster-lead').click();
 await expect(page.getByRole('heading',{name:'Poster lead'})).toBeVisible();
 const lead=await page.evaluate(()=>Object.values((window as any).__PA_REPOSITORY__.loadSnapshot().entities.posterLeads).find((item:any)=>item.phone==='9345678901') as any);
 expect(lead).toMatchObject({phone:'9345678901',posterLocation:'Perundurai',ocrText:'Corrected land poster in Perundurai. Call 9345678901'});
 expect(lead.captureLocation).toContain('11.341');
});

test('edits made while GPS resolves are retained when the location arrives',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(success:(position:any)=>void)=>setTimeout(()=>success({coords:{latitude:11.341,longitude:77.7172}}),150)}});});
 await page.goto('/#/poster');
 await page.getByTestId('poster-text').fill('Land in Erode. Contact 9876543210');
 await page.getByTestId('use-poster-text').click();
 await page.getByTestId('get-capture-location').click();
 await page.getByTestId('poster-phone').fill('9345678901');
 await page.getByTestId('poster-location').fill('Perundurai');
 await page.getByTestId('poster-review-text').fill('Changed while GPS was loading');
 await expect(page.getByTestId('capture-location')).toContainText('11.341');
 await expect(page.getByTestId('poster-phone')).toHaveValue('9345678901');
 await expect(page.getByTestId('poster-location')).toHaveValue('Perundurai');
 await expect(page.getByTestId('poster-review-text')).toHaveValue('Changed while GPS was loading');
});

test('GPS completion does not redraw poster review after navigation away',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(success:(position:any)=>void)=>setTimeout(()=>success({coords:{latitude:11.341,longitude:77.7172}}),150)}});});
 await page.goto('/#/poster');
 await page.getByTestId('poster-text').fill('Land in Erode. Contact 9876543210');
 await page.getByTestId('use-poster-text').click();
 await page.getByTestId('get-capture-location').click();
 await page.evaluate(()=>{location.hash='#/people';});
 await expect(page.getByRole('heading',{name:'Contacts',exact:true})).toBeVisible();
 await page.waitForTimeout(250);
 await expect(page).toHaveURL(/#\/people$/);
 await expect(page.getByRole('heading',{name:'Contacts',exact:true})).toBeVisible();
});

test('typed fallback keeps a selected poster image with the saved lead',async({page})=>{
 await page.goto('/#/poster');
 await page.getByTestId('poster-image').setInputFiles({name:'typed-fallback.png',mimeType:'image/png',buffer:Buffer.from('typed-image')});
 await page.getByTestId('poster-text').fill('Land in Erode. Contact 9876543210');
 await page.getByTestId('use-poster-text').click();
 await expect(page.getByTestId('poster-preview')).toBeVisible();
 await page.getByTestId('save-poster-lead').click();
 await expect(page.getByTestId('saved-poster-image')).toHaveText('Saved locally');
 const stored=await page.evaluate(async()=>{
  const lead=Object.values((window as any).__PA_REPOSITORY__.loadSnapshot().entities.posterLeads).find((item:any)=>item.phone==='9876543210') as any;
  const image=await (window as any).PropertyAssistantPosterImages.get(lead.imageRef);
  return {imageRef:lead.imageRef,name:image?.name,size:image?.size};
 });
 expect(stored.imageRef).toMatch(/^poster-image-/);expect(stored.name).toBe('typed-fallback.png');expect(stored.size).toBe(11);
});

test('GPS permission denial is recoverable and saving remains available',async({page,context})=>{
 await context.clearPermissions();
 await page.goto('/#/poster');
 await page.getByTestId('poster-text').fill('Plot in Erode. Contact 9345678901');
 await page.getByTestId('use-poster-text').click();
 await page.getByTestId('get-capture-location').click();
 await expect(page.getByTestId('poster-review-status')).toContainText('Location permission was not available');
 await expect(page.getByTestId('save-poster-lead')).toBeEnabled();
 await page.getByTestId('save-poster-lead').click();
 await expect(page.getByRole('heading',{name:'Poster lead'})).toBeVisible();
});

test('OCR unavailable is a recoverable user-facing state',async({page})=>{
 await page.goto('/#/poster');
 await page.getByTestId('poster-image').setInputFiles({name:'poster.png',mimeType:'image/png',buffer:Buffer.from('fake-image')});
 await page.getByTestId('read-poster').click();
 await expect(page.getByTestId('poster-status')).toContainText('Local OCR is unavailable');
 await expect(page.getByTestId('poster-text')).toBeEditable();
});

test('OCR completion does not interrupt navigation away from poster capture',async({page})=>{
 await page.addInitScript(()=>{(window as any).__PA_LOCAL_OCR__={recognize:()=>new Promise(resolve=>setTimeout(()=>resolve({text:'Land in Erode. Call 9876543210'}),150))};});
 await page.goto('/#/poster');
 await page.getByTestId('poster-image').setInputFiles({name:'poster.png',mimeType:'image/png',buffer:Buffer.from('fake-image')});
 await page.getByTestId('read-poster').click();
 await page.goto('/#/people');
 await page.waitForTimeout(250);
 await expect(page).toHaveURL(/#\/people$/);
});

test('OCR keeps actionable local failure guidance',async({page})=>{
 await page.addInitScript(()=>{(window as any).__PA_LOCAL_OCR__={recognize:async()=>{throw new Error('No readable text was found. Retake the poster in good light or type the text.');}};});
 await page.goto('/#/poster');
 await page.getByTestId('poster-image').setInputFiles({name:'poster.png',mimeType:'image/png',buffer:Buffer.from('fake-image')});
 await page.getByTestId('read-poster').click();
 await expect(page.getByTestId('poster-status')).toContainText('Retake the poster in good light');
});

test('a new poster flow cannot inherit the previous lead image or GPS evidence',async({page,context})=>{
 await context.grantPermissions(['geolocation']); await context.setGeolocation({latitude:11.341,longitude:77.7172});
 await page.addInitScript(()=>{(window as any).__PA_LOCAL_OCR__={recognize:async()=>({text:'House for rent. Location: Chennai. Contact 9123456789'})};});
 await page.goto('/#/poster');
 await page.getByTestId('poster-image').setInputFiles({name:'first.png',mimeType:'image/png',buffer:Buffer.from('first-image')});
 await page.getByTestId('read-poster').click();
 await page.getByTestId('get-capture-location').click();
 await page.getByTestId('save-poster-lead').click();
 await page.getByRole('button',{name:'Scan another poster'}).click();
 await page.getByTestId('poster-text').fill('Plot in Erode. Contact 9345678901');
 await page.getByTestId('use-poster-text').click();
 await expect(page.getByText('No image attached; text-only lead.')).toBeVisible();
 await expect(page.getByTestId('capture-location')).toContainText('Not captured');
 await page.getByTestId('save-poster-lead').click();
 const second=await page.evaluate(()=>Object.values((window as any).__PA_REPOSITORY__.loadSnapshot().entities.posterLeads).find((item:any)=>item.phone==='9345678901') as any);
 expect(second.imageRef).toBe(null);
 expect(second.captureLocation).toBe(null);
});
