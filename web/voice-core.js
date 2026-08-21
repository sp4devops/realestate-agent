(function (root) {
  'use strict';

  const PLACE_ALIASES = [
    [/\b(?:erodu|eerodu)\b/gi, 'Erode'],
    [/\b(?:kovai|coimbatore)\b/gi, 'Coimbatore'],
    [/\b(?:madras|chennai)\b/gi, 'Chennai'],
    [/\b(?:trichy|tiruchirappalli)\b/gi, 'Trichy'],
    [/\b(?:tirupur|thiruppur)\b/gi, 'Tiruppur']
  ];
  const PROPERTY_ALIASES = [
    [/\b(?:site|plot|manai|nilam)\b/gi, 'land'],
    [/\b(?:veedu|home)\b/gi, 'house'],
    [/\b(?:flat|apartment)\b/gi, 'apartment'],
    [/\b(?:vaadagai|vadagai)\b/gi, 'rent']
  ];

  function normalizeTranscript(value) {
    let text = String(value || '').trim().replace(/\s+/g, ' ');
    for (const [pattern, replacement] of PLACE_ALIASES) text = text.replace(pattern, replacement);
    for (const [pattern, replacement] of PROPERTY_ALIASES) text = text.replace(pattern, replacement);
    return text;
  }

  function languageHint(inputLanguage) {
    return ({ ta:'ta-IN', en:'en-IN', tg:'ta-IN', auto:'auto' })[inputLanguage] || 'auto';
  }

  function createSttService(adapterProvider = () => root.__PA_LOCAL_STT__) {
    return {
      async transcribe(audioBlob, options = {}) {
        const adapter = typeof adapterProvider === 'function' ? adapterProvider() : adapterProvider;
        if (!adapter || typeof adapter.transcribe !== 'function') {
          return { ok:false, code:'stt_unavailable', error:'Local speech recognition is unavailable. You can still use Type & Save.' };
        }
        try {
          const result = await adapter.transcribe(audioBlob, { language:languageHint(options.inputLanguage || 'auto') });
          const transcript = typeof result === 'string' ? result : result && result.transcript;
          if (!transcript || !String(transcript).trim()) return { ok:false, code:'empty_transcript', error:'I could not hear enough speech. Try again or use Type & Save.' };
          return { ok:true, transcript:String(transcript).trim(), normalized:normalizeTranscript(transcript) };
        } catch (_) {
          return { ok:false, code:'stt_failed', error:'Local speech recognition failed. Your typed capture still works.' };
        }
      }
    };
  }

  root.PropertyAssistantVoice = { normalizeTranscript, languageHint, createSttService };
})(globalThis);
