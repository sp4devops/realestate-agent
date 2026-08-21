(function (root) {
  'use strict';

  const NEARBY = {
    Erode: new Set(['Perundurai','Bhavani','Chithode']),
    Salem: new Set(['Omalur','Attur']),
    Coimbatore: new Set(['Pollachi','Mettupalayam']),
    Chennai: new Set(['Tambaram','Avadi'])
  };

  function intentCompatible(requirementIntent, propertyIntent) {
    return (requirementIntent === 'buy' && propertyIntent === 'sale') ||
      (requirementIntent === 'rent' && propertyIntent === 'rent') ||
      (requirementIntent === 'lease' && propertyIntent === 'lease');
  }

  function sameText(a,b){ return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase(); }

  function areNearby(a,b){
    const direct=NEARBY[a];
    if(direct && [...direct].some(item=>sameText(item,b))) return true;
    const reverse=NEARBY[b];
    return Boolean(reverse && [...reverse].some(item=>sameText(item,a)));
  }

  function locationFit(locations, locality) {
    const wanted=(locations || []).filter(Boolean);
    if (!wanted.length) return { score:10, reason:'Location was not restricted' };
    if (wanted.some(item=>sameText(item,locality))) return { score:30, reason:`Exact location: ${locality}` };
    for (const wantedLocality of wanted) {
      if (areNearby(wantedLocality,locality)) return { score:18, reason:`Nearby ${wantedLocality}: ${locality}` };
    }
    return { score:0, reason:`Outside preferred location (${wanted.join(', ')})` };
  }

  function priceFit(requirement, property) {
    if (property.price == null || (requirement.budgetMin == null && requirement.budgetMax == null)) return { score:15, reason:'Price needs confirmation' };
    const min=requirement.budgetMin == null ? 0 : requirement.budgetMin;
    const max=requirement.budgetMax == null ? Number.POSITIVE_INFINITY : requirement.budgetMax;
    if (property.price >= min && property.price <= max) return { score:30, reason:'Within stated budget' };
    if (Number.isFinite(max) && max > 0 && property.price > max && property.price <= max * 1.10) {
      const pct=Math.round(((property.price-max)/max)*100);
      return { score:18, reason:`${pct}% above budget — possible negotiation` };
    }
    if (property.price < min && min > 0) return { score:20, reason:'Below stated budget range' };
    return { score:0, reason:'Price is outside the allowed tolerance' };
  }

  function evaluate(requirement, property) {
    const reasons=[];
    if (!requirement || !property) return { eligible:false, score:0, reasons:['Missing requirement or property'] };
    if (!sameText(requirement.propertyType, property.propertyType)) return { eligible:false, score:0, reasons:['Property type does not match'] };
    if (!intentCompatible(requirement.intent, property.intent)) return { eligible:false, score:0, reasons:['Transaction intent does not match'] };
    reasons.push(`Matching ${property.propertyType} for ${requirement.intent}`);
    let score=40;
    const location=locationFit(requirement.locations, property.locality);
    const price=priceFit(requirement, property);
    score += location.score + price.score;
    reasons.push(location.reason, price.reason);
    const eligible=location.score > 0 && price.score > 0;
    return { eligible, score:eligible ? Math.min(100,score) : 0, reasons };
  }

  function rank(requirements, properties) {
    const results=[];
    for (const requirement of requirements || []) {
      for (const property of properties || []) {
        const result=evaluate(requirement,property);
        if (result.eligible) results.push({ requirementId:requirement.id, propertyId:property.id, score:result.score, reasons:result.reasons });
      }
    }
    return results.sort((a,b)=>b.score-a.score || a.requirementId.localeCompare(b.requirementId) || a.propertyId.localeCompare(b.propertyId));
  }

  root.PropertyAssistantMatching={ evaluate, rank, intentCompatible, locationFit, priceFit, areNearby };
})(globalThis);
