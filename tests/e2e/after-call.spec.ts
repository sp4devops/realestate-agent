import { test, expect } from '@playwright/test';

test('after-call recap saves call interaction and follow-up then completes lifecycle',async({page})=>{
 await page.goto('/#/after-call');
 await expect(page.getByRole('heading',{name:'After-call recap'})).toBeVisible();
 await expect(page.getByText('Property Assistant does not record the call.')).toBeVisible();
 await page.getByTestId('recap-phone').fill('+91 90000 00001');
 await page.getByTestId('recap-summary').fill('Buyer wants a site visit this weekend');
 await page.getByTestId('recap-due').fill('2026-08-23T10:30');
 await page.getByTestId('save-call-recap').click();
 await expect(page.getByRole('heading',{name:'Follow-ups'})).toBeVisible();
 const card=page.getByTestId('followup-card').filter({hasText:'Follow up after call'});
 await expect(card).toContainText('9000000001');
 let persisted=await page.evaluate(()=>(window as any).__PA_REPOSITORY__.loadSnapshot());
 expect(Object.values((persisted as any).entities.interactions).some((i:any)=>i.kind==='call'&&i.summary.includes('site visit')&&i.personIds.includes('person-suresh'))).toBe(true);
 expect(Object.values((persisted as any).entities.followUps).some((f:any)=>f.status==='open'&&f.personId==='person-suresh')).toBe(true);
 await card.getByRole('button',{name:'Done'}).click();
 await expect(page.getByTestId('followup-card').filter({hasText:'Follow up after call'})).toHaveAttribute('data-status','done');
 await page.getByTestId('followup-card').filter({hasText:'Follow up after call'}).getByRole('button',{name:'Reopen'}).click();
 await expect(page.getByTestId('followup-card').filter({hasText:'Follow up after call'})).toHaveAttribute('data-status','open');
});

test('recent number is only filled when a permitted adapter provides it',async({page})=>{
 await page.addInitScript(()=>{(window as any).__PA_RECENT_NUMBER__=async()=>'+91 91234 56789';});
 await page.goto('/#/after-call');
 await page.getByTestId('use-recent-number').click();
 await expect(page.getByTestId('recap-phone')).toHaveValue('9123456789');
 await expect(page.getByTestId('recap-status')).toContainText('Recent number filled');
});

test('without a recent-number adapter the flow stays manual and usable',async({page})=>{
 await page.goto('/#/after-call');
 await page.getByTestId('use-recent-number').click();
 await expect(page.getByTestId('recap-status')).toContainText('not available on this platform');
 await expect(page.getByTestId('recap-phone')).toBeEditable();
});

test('Call WhatsApp and Share use host actions and returning from Call offers recap',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).__hostActions=[];
  (window as any).PropertyAssistantHost={
   dial:(phone:string)=>(window as any).__hostActions.push(['call',phone]),
   whatsapp:(phone:string,text:string)=>(window as any).__hostActions.push(['whatsapp',phone,text]),
   shareText:(text:string)=>(window as any).__hostActions.push(['share',text])
  };
 });
 await page.goto('/#/home');
 await page.evaluate(()=>{(window as any).__PA_REPOSITORY__.create('followUps',{dueAt:'2026-08-23T10:30:00.000Z',status:'open',title:'Call Suresh about Erode land',personId:'person-suresh'});location.hash='#/followups';});
 const card=page.getByTestId('followup-card').filter({hasText:'Call Suresh'});
 await card.getByRole('button',{name:'Call'}).click();
 await card.getByRole('button',{name:'WhatsApp'}).click();
 await card.getByRole('button',{name:'Share'}).click();
 const actions=await page.evaluate(()=>(window as any).__hostActions);
 expect(actions[0]).toEqual(['call','9000000001']);
 expect(actions[1][0]).toBe('whatsapp'); expect(actions[1][1]).toBe('919000000001');
 expect(actions[2][0]).toBe('share');
 await page.evaluate(()=>{location.hash='#/home';});
 await expect(page.getByTestId('after-call-banner')).toBeVisible();
 await page.getByTestId('after-call-banner').getByRole('button',{name:'Add recap'}).click();
 await expect(page.getByTestId('recap-phone')).toHaveValue('9000000001');
 await expect(page.getByTestId('after-call-return-prompt')).toContainText('does not record');
});
