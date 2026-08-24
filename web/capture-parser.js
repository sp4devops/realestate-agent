(function (root) {
  'use strict';

  const LOCALITIES = ['Erode Railway Station','Erode Bus Stand','Perundurai Road','Teachers Colony','Erode','Perundurai','Thindal','Nasiyanur','Chennimalai','Vijayamangalam','Pallipalayam','Palayapalayam','Karungalpalayam','Bhavani','Chithode','Coimbatore','Pollachi','Mettupalayam','Chennai','Tambaram','Avadi','Salem','Omalur','Attur','Madurai','Trichy','Tiruppur'];
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
      { re:/(\d+(?:\.\d+)?)\s*k\b/i, mult:1000 },
      { re:/₹\s*([\d,]+)/, mult:1 },
      { re:/₹?\s*([\d,]+)\s*(?:per\s+|\/\s*)?(?:month|monthly|mo)\b/i, mult:1 },
      { re:/₹?\s*([\d,]{4,7})\s*(?:rent|rental)\b/i, mult:1 },
      { re:/\b(?:rent|rental)(?:\s+(?:is|of|:))?\s*₹?\s*([\d,]{4,7})\b/i, mult:1 },
      { re:/\bfor\s+₹?\s*([\d,]{4,7})(?!\d)/i, mult:1 },
      { re:/(?:budget|price|விலை)\s*(?:is|around|about|under|upto|up to|க்கு|சுமார்)?\s*([\d,]{5,})/i, mult:1 }
    ];
    for (const {re,mult} of patterns) {
      const match = text.match(re);
      if (match) {
        const number=Number(match[1].replaceAll(',',''));
        if(Number.isFinite(number) && number > 0) return Math.round(number * mult);
      }
    }
    const shorthand=String(text || '').match(/\b(?:budget\s*(?:max(?:imum)?|upto|up\s+to)?|asking|price|owner)\s*(?:is|:)?\s*₹?\s*(\d{1,3})(?!\d|[.,]\d)/i);
    if(shorthand){
      const number=Number(shorthand[1]);
      if(Number.isFinite(number)&&number>0){
        const rental=/\b(?:rent|rental|tenant|vaadagai|vadagai)\b/i.test(text) || /வாடகை/u.test(text);
        return number*(rental?1000:100000);
      }
    }
    return null;
  }

  function parseMoneyRange(text) {
    const match=String(text || '').match(/₹?\s*(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*₹?\s*(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lakhs|lac|lacs|l|k)\b/i);
    if(!match) return null;
    const unit=match[3].toLowerCase();
    const multiplier=unit==='k'?1000:unit==='crore'||unit==='cr'?10000000:100000;
    const min=Math.round(Number(match[1])*multiplier);
    const max=Math.round(Number(match[2])*multiplier);
    return Number.isFinite(min)&&Number.isFinite(max)&&min>0&&min<=max?{min,max}:null;
  }

  function parsePriceBasis(text,intent='sale') {
    const source=String(text || '');
    if(/(?:\/|\bper\s+)(?:acre|acres)\b/i.test(source)) return 'per_acre';
    if(/(?:\/|\bper\s+)(?:cent|cents)\b/i.test(source)) return 'per_cent';
    if(/(?:\/|\bper\s+)(?:sq\.?\s*ft|sqft|square\s*feet)\b/i.test(source)) return 'per_sqft';
    if(/(?:\/|\bper\s+)(?:month|monthly)\b/i.test(source) || intent==='rent') return 'per_month';
    return 'total';
  }

  function parseSize(text) {
    const source=String(text || '');
    const range=source.match(/\b([\d,]+(?:\.\d+)?)\s*(?:-|–|—|to)\s*([\d,]+(?:\.\d+)?)\s*(acre|acres|cent|cents|sq\.?\s*ft|sqft|square\s*feet)\b/i);
    if(range){
      const minValue=Number(range[1].replaceAll(',','')); const maxValue=Number(range[2].replaceAll(',',''));
      const rawUnit=range[3].toLowerCase().replace(/\s+/g,'');
      const unit=rawUnit.startsWith('acre')?'acre':rawUnit.startsWith('cent')?'cent':'sqft';
      if(Number.isFinite(minValue)&&Number.isFinite(maxValue)&&minValue>0&&minValue<=maxValue) return {minValue,maxValue,unit};
    }
    const match=source.match(/\b([\d,]+(?:\.\d+)?)\s*(acre|acres|cent|cents|sq\.?\s*ft|sqft|square\s*feet)\b/i);
    if(!match) return null;
    const value=Number(match[1].replaceAll(',',''));if(!Number.isFinite(value)||value<=0)return null;
    const rawUnit=match[2].toLowerCase().replace(/\s+/g,'');
    const unit=rawUnit.startsWith('acre')?'acre':rawUnit.startsWith('cent')?'cent':'sqft';
    return { value, unit };
  }

  function parsePreferences(text) {
    const source=String(text || '');
    const values=[];
    if(/\bfamily(?:\s+only)?\b/i.test(source)) values.push('Family only');
    const furnishing=source.match(/\b(semi[ -]?furnished|unfurnished|fully[ -]?furnished|furnished)\b/i);
    if(furnishing) values.push(furnishing[1].replace(/[- ]+/g,' ').replace(/\b\w/g,char=>char.toUpperCase()));
    const facing=source.match(/\b(east|west|north|south)[ -]?facing\b/i);
    if(facing) values.push(`${facing[1][0].toUpperCase()}${facing[1].slice(1).toLowerCase()} facing`);
    const road=source.match(/\b(\d{1,3})\s*(?:-?ft|feet|foot)\s+road\b/i);
    if(road) values.push(`${Number(road[1])}-ft road`);
    if(/\b(?:2|two)[ -]?wheeler parking\b/i.test(source)) values.push('2-wheeler parking');
    if(/\b(?:doesn'?t want|do not want|no)\s+(?:an?\s+)?apartments?\b/i.test(source)) values.push('No apartments');
    if(/\bnegotiab(?:le|ility)\b/i.test(source) || /\bnegotiate\s+pann/i.test(source)) values.push('Negotiable');
    return [...new Set(values)];
  }

  function parseTiming(text) {
    const source=String(text || '');
    if(/\b(?:next month|adutha maasam)\b/i.test(source)) return 'Next month';
    const days=source.match(/\b(?:in|within|next)\s+(\d{1,3})\s+days?\b/i);
    if(days) return `Within ${Number(days[1])} days`;
    if(/\b(?:immediate|immediately|urgent|asap)\b/i.test(source)) return 'Immediate';
    return '';
  }

  function detectLocality(text) {
    return LOCALITIES.find(name => new RegExp(`\\b${name}\\b`,'i').test(text)) || null;
  }

  function detectPropertyType(text) {
    const bhk=String(text || '').match(/\b([1-9](?:\.[05])?)\s*bhk\b/i);
    if(bhk) return `${bhk[1]}bhk`;
    for (const type of PROPERTY_TYPES) if (type.patterns.some(re => re.test(text))) return type.value;
    return null;
  }

  function extractName(text) {
    const explicit = text.match(/(?:\bname\s*(?:is|:)|பெயர்\s*:?|\bperu\b\s*(?:is|:)?)(?:\s*)([A-Za-z\u0B80-\u0BFF][A-Za-z\u0B80-\u0BFF .'-]{1,40})/i);
    if (explicit) return explicit[1].trim().replace(/\s+(?:phone|mobile|number|wants|needs|looking|தேவை|venum).*$/i,'').trim();
    const buyer = text.match(/^\s*([A-Za-z][A-Za-z.'-]{1,30})\s+(?:wants|needs|looking)\b/i);
    if (buyer) return buyer[1];
    const tanglishBuyer=text.match(/^\s*([A-Za-z][A-Za-z.'-]{1,30})\s*(?:-?ku)\b[\s\S]*\b(?:venum|thevai)\b/i);
    if(tanglishBuyer) return tanglishBuyer[1].replace(/-$/,'');
    const owner = text.match(/^\s*([A-Za-z][A-Za-z.'-]{1,30})\s+(?:owner|has|selling|sells)\b/i);
    if (owner) return owner[1];
    const trailingOwner=text.match(/\bowner\s+([A-Za-z][A-Za-z.'-]{1,30})\b/i);
    if(trailingOwner && !new Set(['negotiable','direct','available','asking','price','says','solraru']).has(trailingOwner[1].toLowerCase())) return trailingOwner[1];
    return null;
  }

  function extractActionName(text) {
    const source=String(text || '');
    const action=source.match(/^\s*(?:call|whatsapp|remind(?:\s+me)?(?:\s+to)?(?:\s+call)?|follow\s*up(?:\s+with)?)\s+([A-Za-z][A-Za-z.'-]{1,30})\b/i);
    if(action && !/^(?:him|her|them|owner|customer)$/i.test(action[1])) return action[1];
    const subject=source.match(/^\s*([A-Za-z][A-Za-z.'-]{1,30})\s+(?:rejected|visited|visiting|prefers|doesn'?t|does not|is not interested)\b/i);
    return subject ? subject[1] : extractName(source);
  }

  function parseFollowUpTiming(text) {
    const source=String(text || '');
    if(/\btomorrow\b/i.test(source)) return 'Tomorrow';
    if(/\btoday\b/i.test(source)) return 'Today';
    const day=source.match(/\b(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
    if(day) return `${day[1]?'Next ':''}${day[2][0].toUpperCase()}${day[2].slice(1).toLowerCase()}`;
    return '';
  }

  function detectSpecialKind(text) {
    const source=String(text || '');
    if(/\b(?:price|asking\s+price)\s+(?:changed|change|updated|now|is now)\b/i.test(source) || /\bprice\s+change\s+to\b/i.test(source)) return 'property_update';
    if(/^\s*(?:call|whatsapp|remind|follow\s*up)\b/i.test(source) || /\b(?:call|follow\s*up|visit|visiting|price confirmation)\b[\s\S]*\b(?:pending|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(source)) return 'followup';
    if(/\b(?:rejected|not interested|visited|road (?:was |is )?too narrow|doesn'?t want|does not want|prefers?)\b/i.test(source)) return 'interaction';
    return null;
  }

  function hasSupplyPossession(text) {
    return /\bhas\b[\s\S]{0,40}\b(?:\d+(?:\.\d+)?\s*bhk|house|home|flat|apartment|land|plot|site)\b/i.test(text);
  }

  function isRelativeLocality(text) {
    return /\b(?:the\s+)?same\s+(?:area|locality|place|location)\b|\b(?:that|this)\s+area\b/i.test(String(text || ''));
  }

  function looksLikeResidentialMonthly(amount, text, propertyType) {
    if (amount == null || !Number.isFinite(Number(amount))) return false;
    if (/\b(?:for sale|sell|selling|sale|virpanai|vikk)\b/i.test(text) || /விற்பனை/u.test(text)) return false;
    const value=Number(amount);
    if (value < 1000 || value >= 100000) return false;
    const type=String(propertyType || '');
    return /\d+\s*bhk|house|apartment|flat/i.test(type) || /\b(?:\d+\s*bhk|house|apartment|flat)\b/i.test(text);
  }

  function detectIntentAndKind(text, extras={}) {
    const isBuyer = /\b(?:buy|buyer|wants|needs|looking for|venum|thevai)\b/i.test(text) || /வேண்டும்|தேவை/u.test(text);
    const isLease = /\blease\b/i.test(text);
    const rentWords = /\b(?:rent|rental|tenant|vaadagai|vadagai)\b/i.test(text) || /வாடகை/u.test(text);
    const isRentalDemand = rentWords || looksLikeResidentialMonthly(extras.amount, text, extras.propertyType);
    const isSupply = /\b(?:for sale|sell|selling|available|owner|virpanai|vikk|sale)\b/i.test(text) || /விற்பனை|உரிமையாளர்/u.test(text) || hasSupplyPossession(text);
    const intent=isLease?'lease':isRentalDemand?'rent':isSupply?'sale':'buy';
    if (isSupply && !isBuyer) return { kind:'property', intent:intent==='lease'?'lease':intent==='rent'?'rent':'sale', role:'owner' };
    return { kind:'requirement', intent, role:isRentalDemand||isLease?'tenant':'buyer' };
  }

  function parse(text, options={}) {
    const source = String(text || '').trim();
    if (!source) return { ok:false, error:'Type something about a buyer, tenant, owner, or property.' };
    const phone = extractPhone(source);
    let locality = detectLocality(source);
    if (!locality && isRelativeLocality(source)) {
      const last=String(options.lastLocality || '').trim();
      if (last) locality = last;
    }
    const propertyType = detectPropertyType(source);
    const moneyRange = parseMoneyRange(source);
    const amount = moneyRange?.max ?? parseMoney(source);
    const size = parseSize(source);
    const specialKind=detectSpecialKind(source);
    const detected = detectIntentAndKind(source, { amount, propertyType });
    const name = specialKind ? extractActionName(source) : extractName(source);
    const preferences = parsePreferences(source);
    const timing = parseTiming(source);
    if(specialKind==='property_update'){
      const priceBasis=parsePriceBasis(source,'sale');
      const uncertain=['targetProperty'];
      if(amount==null) uncertain.push('price');
      return {ok:true,source,kind:'property_update',confidence:amount==null?0.55:0.82,uncertain,person:{name:name||'',role:'owner',primaryPhone:phone||'',alternatePhones:[]},propertyUpdate:{price:amount,priceBasis,propertyType:propertyType||'',locality:locality||'',attributes:preferences}};
    }
    if(specialKind==='followup'){
      const dueText=parseFollowUpTiming(source); const uncertain=[];
      if(!name&&!phone) uncertain.push('targetPerson');
      if(!dueText) uncertain.push('dueAt');
      const channel=/\bwhatsapp\b/i.test(source)?'WhatsApp':/\bvisit(?:ing)?\b/i.test(source)?'Site visit':/\bprice confirmation\b/i.test(source)?'Price confirmation':'Call';
      return {ok:true,source,kind:'followup',confidence:Math.max(0.45,1-uncertain.length*0.18),uncertain,person:{name:name||'',role:'other',primaryPhone:phone||'',alternatePhones:[]},followUp:{title:`${channel} ${name||'contact'}`,dueText,channel}};
    }
    if(specialKind==='interaction'){
      const learned=[...preferences];
      if(/\broad (?:was |is )?too narrow\b/i.test(source)&&!learned.some(value=>/ft road/i.test(value))) learned.push('Wider road required');
      const uncertain=[]; if(!name&&!phone) uncertain.push('targetPerson');
      return {ok:true,source,kind:'interaction',confidence:Math.max(0.5,1-uncertain.length*0.2),uncertain,person:{name:name||'',role:'other',primaryPhone:phone||'',alternatePhones:[]},interaction:{kind:'note',summary:source,learnedPreferences:[...new Set(learned)],propertyType:propertyType||'',locality:locality||''}};
    }
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
      requirement: detected.kind === 'requirement' ? { intent:detected.intent, propertyType:propertyType || '', locations:locality?[locality]:[], budgetMin:moneyRange?.min ?? null, budgetMax:amount, size, preferences, timing } : null,
      property: detected.kind === 'property' ? { intent:detected.intent, propertyType:propertyType || '', locality:locality || '', price:amount, priceBasis:parsePriceBasis(source,detected.intent), ownerPersonId:null, size, attributes:preferences } : null
    };
  }

  function isExtraction(value) {
    if (!(value && value.ok === true && ['requirement','property','property_update','followup','interaction'].includes(value.kind) && Array.isArray(value.uncertain))) return false;
    if (!value.person || typeof value.person !== 'object') return false;
    if(value.kind==='requirement') return Boolean(value.requirement && typeof value.requirement === 'object');
    if(value.kind==='property') return Boolean(value.property && typeof value.property === 'object');
    if(value.kind==='property_update') return Boolean(value.propertyUpdate && typeof value.propertyUpdate === 'object');
    if(value.kind==='followup') return Boolean(value.followUp && typeof value.followUp === 'object');
    return Boolean(value.interaction && typeof value.interaction === 'object');
  }


  function remapUncertain(uncertain, nextKind) {
    return (uncertain || []).map(key => {
      if (nextKind === 'property' && key === 'budgetMax') return 'price';
      if (nextKind === 'requirement' && key === 'price') return 'budgetMax';
      return key;
    });
  }

  function switchCaptureKind(parsed, nextKind) {
    if (!parsed || (nextKind !== 'requirement' && nextKind !== 'property') || parsed.kind === nextKind) return parsed;
    const person = { ...(parsed.person || {}) };
    if (nextKind === 'property') {
      const req = parsed.requirement || {};
      const intent = req.intent === 'buy' ? 'sale' : (req.intent || 'sale');
      person.role = 'owner';
      return {
        ...parsed,
        kind:'property',
        person,
        requirement:null,
        property:{
          intent,
          propertyType:req.propertyType || '',
          locality:(req.locations && req.locations[0]) || '',
          price:req.budgetMax ?? req.budgetMin ?? null,
          priceBasis:intent === 'rent' || intent === 'lease' ? 'per_month' : 'total',
          ownerPersonId:null,
          size:req.size || null,
          attributes:req.preferences || []
        },
        uncertain:remapUncertain(parsed.uncertain, 'property')
      };
    }
    const prop = parsed.property || {};
    const intent = prop.intent === 'sale' ? 'buy' : (prop.intent || 'buy');
    person.role = intent === 'rent' || intent === 'lease' ? 'tenant' : 'buyer';
    return {
      ...parsed,
      kind:'requirement',
      person,
      property:null,
      requirement:{
        intent,
        propertyType:prop.propertyType || '',
        locations:prop.locality ? [prop.locality] : [],
        budgetMin:null,
        budgetMax:prop.price ?? null,
        size:prop.size || null,
        preferences:prop.attributes || [],
        timing:parsed.requirement?.timing || ''
      },
      uncertain:remapUncertain(parsed.uncertain, 'requirement')
    };
  }

  function createExtractor(modelAdapter = null) {
    return {
      async extract(text, options={}) {
        if (modelAdapter && typeof modelAdapter.extract === 'function') {
          try {
            const candidate = await modelAdapter.extract(String(text || ''), options);
            if (isExtraction(candidate)) return candidate;
          } catch (_) {
            // Local deterministic fallback is mandatory and intentionally silent here.
          }
        }
        return parse(text, options);
      }
    };
  }

  root.PropertyAssistantCapture = { parse, cleanPhone, extractPhone, parseMoney, parseMoneyRange, parsePriceBasis, parseSize, parsePreferences, parseTiming, parseFollowUpTiming, createExtractor, switchCaptureKind, isRelativeLocality, hasSupplyPossession };
})(globalThis);
