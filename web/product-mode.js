(function (root) {
  'use strict';

  const capabilities = Object.freeze({
    typedCapture:true,
    typedSearch:true,
    voiceCapture:false,
    voiceSearch:false,
    multilingualUi:false,
    multilingualUnderstanding:false
  });

  root.PropertyAssistantProductMode = Object.freeze({
    id:'english-typing-pilot',
    uiLanguage:'en',
    inputLanguage:'en',
    capabilities,
    deferredCapabilities:Object.freeze(['voice','multilingual']),
    supports(name){ return capabilities[name] === true; }
  });
})(globalThis);
