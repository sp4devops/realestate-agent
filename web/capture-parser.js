(function (root) {
  'use strict';

  const LOCALITIES = ['Erode','Chennai','Coimbatore','Salem','Madurai','Trichy','Tiruppur'];
  const PROPERTY_TYPES = [
    { value:'land', patterns:[/\bland\b/i,/\bplot\b/i,/நிலம்/u,/மனை/u,/\bmanai\b/i,/\bnilam\b/i] },
    { value:'house', patterns:[/\bhouse\b/i,/\bhome\b/i,/வீடு/u,/\bveedu\b/i] },
    { value:'apartment', patterns:[/\bapartment\b/i,/\bflat\b/i,/அபார்ட்மெண்ட்/u] }
  ];

  function cleanPhone(value) {
    const digits = String(value || '').replace(/\D/g,'');
    if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2,7)} ${digits.slice(7)}`;
    if (digits.length === 10) return `+91 ${digits.slice(0,5)} ${digits.slice(5)}`;
    return String(value || '').trim();
  }

  function parseMoney(text) {
    const patterns = [
      { re:/(\d+(?:\.\d+)?)\s*(?:crore|cr)\b/i, mult:10000000 },
      { re:/(\d+(?:\.\d+)?)\s*(?:lakh|lac|lakhs)\b/i, mult:100000 },
      { re:/₹\s*([\d,]+)/, mult:1 },
      { re:/(?:budget|price|விலை)\s*(?:is|around|about|under|upto|up to|க்கு|சுமார்)?\s*([\d,]{5,})/i, mult:1 }
    ];
    for (const {re,mult} of patterns) {
      const match = text.match(re);
      if (match) return Math.round(Number(match[1].replaceAll(',','')) * mult);
    }
    return null;
  }

  function detectLocality(text) {
    return LOCALITIES.find(name => new RegExp(`\\b${name}\\b`,'i').test(text)) || null;
  }

  function detectPropertyType(text) {
    for (const type of PROPERTY_TYPES) if (type.patterns.some(re => re.test(text))) return type.value;
    return null;
  }

  function extractName(text) {
    const explicit = text.match(/(?:name\s*(?:is|:)|பெயர்\s*:?|peru\s*(?:is|:)?)(?:\s*)([A-Za-z\u0B80-\u0BFF][A-Za-z\u0B80-\u0BFF .'-]{1,40})/i);
    if (explicit) return explicit[1].trim().replace(/\s+(?:phone|mobile|number|wants|needs|looking|தேவை|venum).*$/i,'').trim();
    const buyer = text.match(/^\s*([A-Z][a-z]+)\s+(?:wants|needs|looking)/);
    if (buyer) return buyer[1];
    return null;
  }

  function detectIntentAndKind(text) {
    const isBuyer = /\b(?:buy|buyer|wants|needs|looking for|venum|thevai)\b/i.test(text) || /வேண்டும்|தேவை/u.test(text);
    const isRentalDemand = /\b(?:rent|rental|tenant|vaadagai|vadagai)\b/i.test(text) || /வாடகை/u.test(text);
    const isSupply = /\b(?:for sale|sell|selling|available|owner|virpanai|vikk|sale)\b/i.test(text) || /விற்பனை|உரிமையாளர்/u.test(text);
    if (isSupply && !isBuyer) return { kind:'property', intent:isRentalDemand?'rent':'sale', role:'owner' };
    return { kind:'requirement', intent:isRentalDemand?'rent':'buy', role:'buyer' };
  }

  function parse(text) {
    const source = String(text || '').trim();
    if (!source) return { ok:false, error:'Type something about a buyer, tenant, owner, or property.' };
    const phoneMatch = source.match(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/);
    const phone = phoneMatch ? cleanPhone(phoneMatch[0]) : null;
    const locality = detectLocality(source);
    const propertyType = detectPropertyType(source);
    const amount = parseMoney(source);
    const detected = detectIntentAndKind(source);
    const name = extractName(source);
    const uncertain = [];
    if (!locality) uncertain.push('locality');
    if (!propertyType) uncertain.push('propertyType');
    if (detected.kind === 'requirement' && !phone) uncertain.push('primaryPhone');
    if (detected.kind === 'requirement' && !name) uncertain.push('name');
    if (amount == null) uncertain.push(detected.kind === 'requirement' ? 'budgetMax' : 'price');

    return {
      ok:true,
      source,
      kind:detected.kind,
      confidence: Math.max(0.35, 1 - uncertain.length * 0.12),
      uncertain,
      person: detected.kind === 'requirement' ? { name:name || '', role:detected.role, primaryPhone:phone || '', alternatePhones:[] } : null,
      requirement: detected.kind === 'requirement' ? { intent:detected.intent, propertyType:propertyType || '', locations:locality?[locality]:[], budgetMin:null, budgetMax:amount } : null,
      property: detected.kind === 'property' ? { intent:detected.intent, propertyType:propertyType || '', locality:locality || '', price:amount, ownerPersonId:null } : null
    };
  }

  function isExtraction(value) {
    return Boolean(value && value.ok === true && ['requirement','property'].includes(value.kind) && Array.isArray(value.uncertain));
  }

  function createExtractor(modelAdapter = null) {
    return {
      async extract(text) {
        if (modelAdapter && typeof modelAdapter.extract === 'function') {
          try {
            const candidate = await modelAdapter.extract(String(text || ''));
            if (isExtraction(candidate)) return candidate;
          } catch (_) {
            // Local deterministic fallback is mandatory and intentionally silent here.
          }
        }
        return parse(text);
      }
    };
  }

  root.PropertyAssistantCapture = { parse, cleanPhone, parseMoney, createExtractor };
})(globalThis);
