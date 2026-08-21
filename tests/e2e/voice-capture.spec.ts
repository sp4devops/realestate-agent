import { test, expect } from '@playwright/test';

const installFakeRecorder = async (page, transcript = 'Name is Ravi, erodu la site venum, budget 20 lakh, phone 91234 56789') => {
  await page.addInitScript(({ transcript }) => {
    window.__PA_TRACK_STOPS__ = 0;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => ({ getTracks: () => [{ stop() { window.__PA_TRACK_STOPS__ += 1; } }] }) }
    });
    class FakeMediaRecorder extends EventTarget {
      state = 'inactive';
      mimeType = 'audio/webm';
      constructor(_stream) { super(); }
      start() { this.state = 'recording'; }
      stop() {
        this.state = 'inactive';
        const dataEvent = new Event('dataavailable');
        Object.defineProperty(dataEvent, 'data', { value: new Blob(['fake-audio']) });
        this.dispatchEvent(dataEvent);
        this.dispatchEvent(new Event('stop'));
      }
    }
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: FakeMediaRecorder });
    window.__PA_LOCAL_STT__ = { transcribe: async () => ({ transcript }) };
  }, { transcript });
};

test('Speak & Save records, normalizes Tanglish, and hands off to shared review', async ({ page }) => {
  await installFakeRecorder(page);
  await page.goto('/#/speak');
  await expect(page.getByRole('heading', { name: 'Speak & Save' })).toBeVisible();
  await page.getByTestId('voice-toggle').click();
  await expect(page.getByTestId('voice-status')).toContainText('Recording');
  await page.getByTestId('voice-toggle').click();
  await expect(page.getByRole('heading', { name: 'Check what I understood' })).toBeVisible();
  await expect(page.getByTestId('field-name')).toHaveValue('Ravi');
  await expect(page.getByTestId('field-locality')).toHaveValue('Erode');
  await expect(page.getByTestId('field-propertyType')).toHaveValue('land');
  const evidence = await page.evaluate(() => ({
    draft: JSON.parse(sessionStorage.getItem('pa.captureDraft') || '{}'),
    metrics: window.__PA_VOICE_METRICS__,
    stops: window.__PA_TRACK_STOPS__
  }));
  expect(evidence.draft.sourceChannel).toBe('voice');
  expect(evidence.draft.rawTranscript).toContain('erodu');
  expect(evidence.draft.normalizedTranscript).toContain('Erode');
  expect(evidence.metrics.audioBytes).toBeGreaterThan(0);
  expect(evidence.metrics.sttLatencyMs).toBeGreaterThanOrEqual(0);
  expect(evidence.stops).toBe(1);
});

test('leaving Speak & Save stops an active microphone stream without creating a draft', async ({ page }) => {
  await installFakeRecorder(page);
  await page.goto('/#/speak');
  await page.getByTestId('voice-toggle').click();
  await expect(page.getByTestId('voice-status')).toContainText('Recording');
  await page.getByRole('button', { name: 'Use Type & Save instead' }).click();
  await expect(page.getByRole('heading', { name: 'Type & Save' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__PA_TRACK_STOPS__)).toBe(1);
  expect(await page.evaluate(() => sessionStorage.getItem('pa.captureDraft'))).toBeNull();
});

test('microphone permission denial is explicit and Type & Save remains usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => { throw new DOMException('denied', 'NotAllowedError'); } }
    });
  });
  await page.goto('/#/speak');
  await page.getByTestId('voice-toggle').click();
  await expect(page.getByTestId('voice-status')).toContainText('permission was denied');
  await page.getByRole('button', { name: 'Use Type & Save instead' }).click();
  await expect(page.getByRole('heading', { name: 'Type & Save' })).toBeVisible();
});

test('STT failure does not leave voice flow stuck', async ({ page }) => {
  await installFakeRecorder(page, '');
  await page.goto('/#/speak');
  await page.getByTestId('voice-toggle').click();
  await page.getByTestId('voice-toggle').click();
  await expect(page.getByTestId('voice-status')).toContainText('could not hear enough speech');
  await expect(page.getByTestId('voice-toggle')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Use Type & Save instead' })).toBeVisible();
});
