import { test, expect } from '@playwright/test';

async function seedDemo(page) {
 await page.goto('/#/home');
 await page.evaluate(() => (window as any).__PA_REPOSITORY__.seedSynthetic());
 await page.goto('/#/ask');
}

test('typed Ask returns actionable local property card',async({page})=>{
 await seedDemo(page);
 await page.getByTestId('query-input').fill('show land in Erode under 25 lakh');
 await page.getByTestId('run-query').click();
 const card=page.getByTestId('query-result-card').filter({hasText:'land in Erode'});
 await expect(card).toContainText('₹22,00,000');
 await card.getByRole('button',{name:'Open'}).click();
 await expect(page.getByTestId('property-title')).toContainText('land in Erode');
});

test('browser voice Ask uses the same local query contract',async({page})=>{
 await page.addInitScript(()=>{
  class FakeTrack{stop(){}}
  class FakeRecorder{
   static isTypeSupported(){return true}
   stream:any; ondataavailable:any; onstop:any; mimeType='audio/webm'; state='inactive';
   constructor(stream:any){this.stream=stream;}
   start(){this.state='recording';setTimeout(()=>this.ondataavailable?.({data:new Blob(['voice'],{type:'audio/webm'})}),0);}
   stop(){this.state='inactive';setTimeout(()=>this.onstop?.(),0);}
  }
  Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>({getTracks:()=>[new FakeTrack()]})}});
  (window as any).MediaRecorder=FakeRecorder;
  (window as any).__PA_LOCAL_STT__={transcribe:async()=>({transcript:'show land in Erode under 25 lakh'})};
 });
 await seedDemo(page);
 await page.getByTestId('start-query-voice').click();
 await expect(page.getByTestId('stop-query-voice')).toBeVisible();
 await page.getByTestId('stop-query-voice').click();
 await expect(page.getByTestId('query-result-card').filter({hasText:'land in Erode'})).toBeVisible();
 await expect(page.getByTestId('query-voice-status')).toContainText('searched local memory');
});

test('Android native voice Ask uses the query speech bridge',async({page})=>{
 await page.addInitScript(()=>{
   (window as any).__nativeQueryStarted=false;
   (window as any).PropertyAssistantHost={
     hasOnDeviceSpeech:()=>true,
     startOnDeviceQuerySpeech:()=>{(window as any).__nativeQueryStarted=true;setTimeout(()=>window.__PA_ON_DEVICE_QUERY_STT_RESULT__?.({ok:true,transcript:'show land in Erode under 25 lakh'}),0);},
     stopOnDeviceSpeech:()=>{}
   };
 });
 await seedDemo(page);
 await page.getByTestId('start-query-voice').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__nativeQueryStarted)).toBe(true);
 await expect(page.getByTestId('query-result-card').filter({hasText:'land in Erode'})).toBeVisible();
 await expect(page.getByTestId('query-voice-status')).toContainText('searched local memory');
});

test('STT unavailable leaves typed Ask usable',async({page})=>{
 await page.addInitScript(()=>{
  class FakeTrack{stop(){}}
  class FakeRecorder{ondataavailable:any;onstop:any;mimeType='audio/webm';state='inactive';start(){this.state='recording';setTimeout(()=>this.ondataavailable?.({data:new Blob(['x'])}),0)}stop(){this.state='inactive';setTimeout(()=>this.onstop?.(),0)}}
  Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>({getTracks:()=>[new FakeTrack()]})}});(window as any).MediaRecorder=FakeRecorder;
 });
 await seedDemo(page); await page.getByTestId('start-query-voice').click(); await page.getByTestId('stop-query-voice').click();
 await expect(page.getByTestId('query-voice-status')).toContainText('unavailable');
 await page.getByTestId('query-input').fill('find Suresh contact'); await page.getByTestId('run-query').click();
 await expect(page.getByTestId('query-result-card').filter({hasText:'Suresh (Demo)'})).toBeVisible();
});

test('leaving Ask stops active microphone and does not create results',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).__askTrackStopped=false;
  class FakeTrack{stop(){(window as any).__askTrackStopped=true;}}
  class FakeRecorder{ondataavailable:any;onstop:any;mimeType='audio/webm';state='inactive';start(){this.state='recording'}stop(){this.state='inactive';setTimeout(()=>this.onstop?.(),0)}}
  Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>({getTracks:()=>[new FakeTrack()]})}});(window as any).MediaRecorder=FakeRecorder;
  (window as any).__PA_LOCAL_STT__={transcribe:async()=>({transcript:'show land in Erode under 25 lakh'})};
 });
 await page.goto('/#/ask'); await page.getByTestId('start-query-voice').click(); await expect(page.getByTestId('stop-query-voice')).toBeVisible();
 await page.goto('/#/home');
 await expect(page.getByRole('heading',{name:"Today's opportunities"})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).__askTrackStopped)).toBe(true);
});
