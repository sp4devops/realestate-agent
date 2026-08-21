import { test, expect } from '@playwright/test';

test('typed Ask returns actionable local property card',async({page})=>{
 await page.goto('/#/ask');
 await page.getByTestId('query-input').fill('show land in Erode under 25 lakh');
 await page.getByTestId('run-query').click();
 const card=page.getByTestId('query-result-card').filter({hasText:'land in Erode'});
 await expect(card).toContainText('₹22,00,000');
 await card.getByRole('button',{name:'Open'}).click();
 await expect(page.getByTestId('property-title')).toContainText('land in Erode');
});

test('voice Ask uses the same local query contract',async({page})=>{
 await page.addInitScript(()=>{
  class FakeTrack{stop(){}}
  class FakeRecorder{
   static isTypeSupported(){return true}
   stream:any; ondataavailable:any; onstop:any; mimeType='audio/webm';
   constructor(stream:any){this.stream=stream;}
   start(){setTimeout(()=>this.ondataavailable?.({data:new Blob(['voice'],{type:'audio/webm'})}),0);}
   stop(){setTimeout(()=>this.onstop?.(),0);}
  }
  Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>({getTracks:()=>[new FakeTrack()]})}});
  (window as any).MediaRecorder=FakeRecorder;
  (window as any).__PA_LOCAL_STT__={transcribe:async()=>({transcript:'show land in Erode under 25 lakh'})};
 });
 await page.goto('/#/ask');
 await page.getByTestId('start-query-voice').click();
 await expect(page.getByTestId('stop-query-voice')).toBeVisible();
 await page.getByTestId('stop-query-voice').click();
 await expect(page.getByTestId('query-result-card').filter({hasText:'land in Erode'})).toBeVisible();
 await expect(page.getByTestId('query-voice-status')).toContainText('searched local memory');
});

test('STT unavailable leaves typed Ask usable',async({page})=>{
 await page.addInitScript(()=>{
  class FakeTrack{stop(){}}
  class FakeRecorder{ondataavailable:any;onstop:any;mimeType='audio/webm';start(){setTimeout(()=>this.ondataavailable?.({data:new Blob(['x'])}),0)}stop(){setTimeout(()=>this.onstop?.(),0)}}
  Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>({getTracks:()=>[new FakeTrack()]})}});(window as any).MediaRecorder=FakeRecorder;
 });
 await page.goto('/#/ask'); await page.getByTestId('start-query-voice').click(); await page.getByTestId('stop-query-voice').click();
 await expect(page.getByTestId('query-voice-status')).toContainText('unavailable');
 await page.getByTestId('query-input').fill('find Suresh contact'); await page.getByTestId('run-query').click();
 await expect(page.getByTestId('query-result-card').filter({hasText:'Suresh (Demo)'})).toBeVisible();
});
