import { test, expect } from '@playwright/test';

const installFakeRecorder = async (page, transcript = 'Name is Ravi, erodu la site venum, budget 20 lakh, phone 91234 56789') => {
  await page.addInitScript(({ transcript }) => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) }
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
  const draft = await page.evaluate(() => JSON.parse(sessionStorage.getItem('pa.captureDraft') || '{}'));
  expect(draft.sourceChannel).toBe('voice');
  expect(draft.rawTranscript).toContain('erodu');
  expect(draft.normalizedTranscript).toContain('Erode');
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
