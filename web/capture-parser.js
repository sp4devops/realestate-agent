(function (root) {
  'use strict';

  const LOCALITIES = ['Erode','Perundurai','Bhavani','Chithode','Coimbatore','Pollachi','Mettupalayam','Chennai','Tambaram','Avadi','Salem','Omalur','Attur','Madurai','Trichy','Tiruppur'];
  const PROPERTY_TYPES = [
    { value:'land', patterns:[/\bland\b/i,/\bplot\b/i,/\bsite\b/i,/\b(?:acre|acres|cent|cents)\b/i,/நிலம்/u,/மனை/u,/\bmanai\b/i,/\bnilam\b/i] },
    { value:'house', patterns:[/\bhouse\b/i,/\bhome\b/i,/வீடு/u,/\bveedu\b/i] },
    { value:'apartment', patterns:[/\bapartment\b/i,/\bflat\b/i,/அபார்ட்மெண்ட்/u] }
  ];

  function cleanPhone(value) {
    const digits = String(value || '').replace(/\D/g,'');
    if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) return `+91 ${digits.slice(2,7)} ${digits.slice(7)}`;
    if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91 ${digits.slice(0,5)} ${digits.slice(5)}`;
    return String(value || '').trim();
  }

  function extractPhone(text) {
    const match=String(text || '').match(/(?:\+?91[\s-]?)?([6-9](?:[\s-]?\d){9})(?!\d)/);
    if(!match) return null;
    const cleaned=cleanPhone(match[0]);
    return /^\+91\s\d{5}\s\d{5}$/.test(cleaned)?cleaned:null;
  }

  function parseMoney(text) {
    const patterns = [
      { re:/(\d+(?:\.\d+)?)\s*(?:crore|cr)\b/i, mult:10000000 },
      { re:/(\d+(?:\.\d+)?)\s*(?:lakh|lac|lakhs|lacs|l)\b/i, mult:100000 },
      { re:/₹\s*([\d,]+)/, mult:1 },
      { re:/(?:budget|price|விலை)\s*(?:is|around|about|under|upto|up to|க்கு|சுமார்)?\s*([\d,]{5,})/i, mult:1 }
    ];
    for (const {re,mult} of patterns) {
      const match = text.match(re);
      if (match) {
        const number=Number(match[1].replaceAll(',',''));
        if(Number.isFinite(number) && number > 0) return Math.round(number * mult);
      }
    }
    return null;
  }

  function parseSize(text) {
    const match=String(text || '').match(/\b(\d+(?:\.\d+)?)\s*(acre|acres|cent|cents|sq\.?\s*ft|sqft|square\s*feet)\b/i);
    if(!match) return null;
    const value=Number(match[1]);if(!Number.isFinite(value)||value<=0)return null;
    const rawUnit=match[2].toLowerCase().replace(/\s+/g,'');
    const unit=rawUnit.startsWith('acre')?'acre':rawUnit.startsWith('cent')?'cent':'sqft';
    return { value, unit };
  }

  function detectLocality(text) {
    return LOCALITIES.find(name => new RegExp(`\\b${name}\\b`,'i').test(text)) || null;
  }

  function detectPropertyType(text) {
    for (const type of PROPERTY_TYPES) if (type.patterns.some(re => re.test(text))) return type.value;
    return null;
  }

  function extractName(text) {
    const explicit = text.match(/(?:\bname\s*(?:is|:)|பெயர்\s*:?|\bperu\b\s*(?:is|:)?)(?:\s*)([A-Za-z\u0B80-\u0BFF][A-Za-z\u0B80-\u0BFF .'-]{1,40})/i);
    if (explicit) return explicit[1].trim().replace(/\s+(?:phone|mobile|number|wants|needs|looking|தேவை|venum).*$/i,'').trim();
    const buyer = text.match(/^\s*([A-Za-z][A-Za-z.'-]{1,30})\s+(?:wants|needs|looking)\b/i);
    if (buyer) return buyer[1];
    const owner = text.match(/^\s*([A-Za-z][A-Za-z.'-]{1,30})\s+(?:owner|has|selling|sells)\b/i);
    if (owner) return owner[1];
    return null;
  }

  function detectIntentAndKind(text) {
    const isBuyer = /\b(?:buy|buyer|wants|needs|looking for|venum|thevai)\b/i.test(text) || /வேண்டும்|தேவை/u.test(text);
    const isLease = /\blease\b/i.test(text);
    const isRentalDemand = /\b(?:rent|rental|tenant|vaadagai|vadagai)\b/i.test(text) || /வாடகை/u.test(text);
    const isSupply = /\b(?:for sale|sell|selling|available|owner|virpanai|vikk|sale)\b/i.test(text) || /விற்பனை|உரிமையாளர்/u.test(text);
    const intent=isLease?'lease':isRentalDemand?'rent':isSupply?'sale':'buy';
    if (isSupply && !isBuyer) return { kind:'property', intent:intent==='lease'?'lease':intent==='rent'?'rent':'sale', role:'owner' };
    return { kind:'requirement', intent, role:isRentalDemand||isLease?'tenant':'buyer' };
  }

  function parse(text) {
    const source = String(text || '').trim();
    if (!source) return { ok:false, error:'Type something about a buyer, tenant, owner, or property.' };
    const phone = extractPhone(source);
    const locality = detectLocality(source);
    const propertyType = detectPropertyType(source);
    const amount = parseMoney(source);
    const size = parseSize(source);
    const detected = detectIntentAndKind(source);
    const name = extractName(source);
    const uncertain = [];
    if (!locality) uncertain.push('locality');
    if (!propertyType) uncertain.push('propertyType');
    if (!phone) uncertain.push('primaryPhone');
    if (!name) uncertain.push('name');
    if (amount == null) uncertain.push(detected.kind === 'requirement' ? 'budgetMax' : 'price');

    return {
      ok:true,
      source,
      kind:detected.kind,
      confidence: Math.max(0.35, 1 - uncertain.length * 0.12),
      uncertain,
      person: { name:name || '', role:detected.role, primaryPhone:phone || '', alternatePhones:[] },
      requirement: detected.kind === 'requirement' ? { intent:detected.intent, propertyType:propertyType || '', locations:locality?[locality]:[], budgetMin:null, budgetMax:amount, size } : null,
      property: detected.kind === 'property' ? { intent:detected.intent, propertyType:propertyType || '', locality:locality || '', price:amount, ownerPersonId:null, size } : null
    };
  }

  function isExtraction(value) {
    if (!(value && value.ok === true && ['requirement','property'].includes(value.kind) && Array.isArray(value.uncertain))) return false;
    if (!value.person || typeof value.person !== 'object') return false;
    return value.kind === 'requirement' ? Boolean(value.requirement && typeof value.requirement === 'object') : Boolean(value.property && typeof value.property === 'object');
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

  root.PropertyAssistantCapture = { parse, cleanPhone, extractPhone, parseMoney, parseSize, createExtractor };
})(globalThis);
