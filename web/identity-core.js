(function (root) {
  'use strict';

  const CREATE_PERSON_VALUE = '__create_new_person__';

  function requiresExplicitIdentityChoice(candidateCount, phoneMatchedId) {
    return Number(candidateCount) > 1 && !phoneMatchedId;
  }

  function defaultIdentityChoice(candidateCount, phoneMatchedId) {
    if (phoneMatchedId) return String(phoneMatchedId);
    if (requiresExplicitIdentityChoice(candidateCount, phoneMatchedId)) return '';
    return CREATE_PERSON_VALUE;
  }

  function assertIdentityChoice(candidateCount, phoneMatchedId, choice) {
    if (requiresExplicitIdentityChoice(candidateCount, phoneMatchedId) && !String(choice || '').trim()) {
      throw new Error('Two people share this name. Which one?');
    }
  }

  root.PropertyAssistantIdentity = {
    CREATE_PERSON_VALUE,
    requiresExplicitIdentityChoice,
    defaultIdentityChoice,
    assertIdentityChoice
  };
})(globalThis);
