(function (root) {
  'use strict';

  const NEARBY_GROUPS = [
    ['Erode','Erode Railway Station','Erode Bus Stand','Perundurai','Perundurai Road','Thindal','Nasiyanur','Pallipalayam','Palayapalayam','Karungalpalayam','Bhavani','Chithode'],
    ['Perundurai','Perundurai Road','Vijayamangalam','Chennimalai'],
    ['Salem','Omalur','Attur'],
    ['Coimbatore','Pollachi','Mettupalayam'],
    ['Chennai','Tambaram','Avadi']
  ];
  const SQFT_PER_UNIT={sqft:1,cent:435.6,acre:43560};

  function intentCompatible(requirementIntent, propertyIntent) {
    return (requirementIntent === 'buy' && propertyIntent === 'sale') ||
      (requirementIntent === 'rent' && propertyIntent === 'rent') ||
      (requirementIntent === 'lease' && propertyIntent === 'lease');
  }

  function sameText(a,b){ return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase(); }
  function normalized(values){ return (values || []).map(value=>String(value || '').trim()).filter(Boolean); }

  function areNearby(a,b){
    if(sameText(a,b)) return false;
    return NEARBY_GROUPS.some(group=>group.some(item=>sameText(item,a))&&group.some(item=>sameText(item,b)));
  }

  function locationFit(locations, locality) {
    const wanted=normalized(locations);
    if (!wanted.length) return { score:0, reason:'Location is required to match' };
    if (wanted.some(item=>sameText(item,locality))) return { score:25, reason:`Exact location: ${locality}` };
    for (const wantedLocality of wanted) {
      if (areNearby(wantedLocality,locality)) return { score:15, reason:`Nearby ${wantedLocality}: ${locality}` };
    }
    return { score:0, reason:`Outside preferred location (${wanted.join(', ')})` };
  }

  function sizeNumber(value,unit){
    const number=Number(value); const multiplier=SQFT_PER_UNIT[String(unit || '').toLowerCase()];
    return Number.isFinite(number)&&number>0&&multiplier ? number*multiplier : null;
  }

  function sizeBounds(size){
    if(!size) return null;
    const exact=sizeNumber(size.value,size.unit);
    const min=sizeNumber(size.minValue,size.unit);
    const max=sizeNumber(size.maxValue,size.unit);
    if(exact!=null) return {min:exact,max:exact,exact:true};
    if(min==null&&max==null) return null;
    return {min:min ?? 0,max:max ?? Number.POSITIVE_INFINITY,exact:false};
  }

  function formatSize(size){
    if(!size) return 'size';
    if(size.value!=null) return `${size.value} ${size.unit}`;
    if(size.minValue!=null&&size.maxValue!=null) return `${size.minValue}–${size.maxValue} ${size.unit}`;
    return `${size.minValue ?? size.maxValue} ${size.unit}`;
  }

  function sizeFit(requirement,property){
    const wanted=sizeBounds(requirement.size);
    if(!wanted) return {eligible:true,score:15,reason:'Size was not restricted'};
    const available=sizeBounds(property.size);
    if(!available) return {eligible:true,score:3,reason:`Property size needs confirmation for ${formatSize(requirement.size)}`};
    const propertyValue=available.exact?available.min:(available.min+available.max)/2;
    const requiredMin=wanted.min;
    const requiredMax=wanted.exact?Number.POSITIVE_INFINITY:wanted.max;
    if(propertyValue<requiredMin) return {eligible:false,score:0,reason:`Too small for ${formatSize(requirement.size)}`};
    if(propertyValue>requiredMax) return {eligible:false,score:0,reason:`Too large for ${formatSize(requirement.size)}`};
    return {eligible:true,score:15,reason:`Size fits: ${formatSize(property.size)}`};
  }

  function effectivePropertyPrice(property){
    if(property?.price==null || !Number.isFinite(Number(property.price))) return null;
    const basis=property.priceBasis || (property.intent==='rent'?'per_month':'total');
    if(basis==='total'||basis==='per_month') return Number(property.price);
    const bounds=sizeBounds(property.size);
    if(!bounds || !bounds.exact) return null;
    const sqft=bounds.min;
    const units=basis==='per_acre'?sqft/SQFT_PER_UNIT.acre:basis==='per_cent'?sqft/SQFT_PER_UNIT.cent:sqft;
    return Math.round(Number(property.price)*units);
  }

  function hasAttribute(property,expected){ return normalized(property.attributes).some(value=>sameText(value,expected)); }

  function priceFit(requirement, property) {
    if (requirement.budgetMin == null && requirement.budgetMax == null) return { score:0, reason:'Budget is required to match' };
    const price=effectivePropertyPrice(property);
    if (price == null) return { score:7, reason:'Total price needs confirmation' };
    const min=requirement.budgetMin == null ? 0 : requirement.budgetMin;
    const max=requirement.budgetMax == null ? Number.POSITIVE_INFINITY : requirement.budgetMax;
    if (price >= min && price <= max) return { score:25, reason:'Within stated budget' };
    if (Number.isFinite(max) && max > 0 && price > max && price <= max * 1.10 && hasAttribute(property,'Negotiable')) {
      const pct=Math.round(((price-max)/max)*100);
      return { score:12, reason:`${pct}% above budget and owner marked negotiable` };
    }
    if (price < min && min > 0) return { score:18, reason:'Below stated budget range' };
    return { score:0, reason:price>max&&!hasAttribute(property,'Negotiable')?'Above budget; negotiability not recorded':'Price is outside the allowed tolerance' };
  }

  function preferenceFit(requirement, property) {
    const wanted=normalized(requirement.preferences);
    const available=normalized(property.attributes);
    if(!wanted.length) return {eligible:true,score:25,reasons:['No additional preferences recorded']};
    let matched=0; const reasons=[]; let eligible=true;
    for(const preference of wanted){
      const wantedRoad=preference.match(/(\d{1,3})\s*-?ft\s+road/i);
      const propertyRoad=available.map(attribute=>attribute.match(/(\d{1,3})\s*-?ft\s+road/i)).find(Boolean);
      if(wantedRoad){
        const required=Number(wantedRoad[1]);
        if(propertyRoad&&Number(propertyRoad[1])>=required){ matched+=1; reasons.push(`${propertyRoad[1]}-ft road meets preference`); }
        else if(propertyRoad){ eligible=false; reasons.push(`${propertyRoad[1]}-ft road is below ${required}-ft minimum`); }
        else reasons.push(`${required}-ft road width needs confirmation`);
        continue;
      }
      if(sameText(preference,'Wider road required')){
        if(propertyRoad&&Number(propertyRoad[1])>=30){ matched+=1; reasons.push(`${propertyRoad[1]}-ft road addresses prior narrow-road rejection`); }
        else if(propertyRoad){ eligible=false; reasons.push(`${propertyRoad[1]}-ft road conflicts with prior narrow-road rejection`); }
        else reasons.push('Road width needs confirmation from prior rejection memory');
        continue;
      }
      if(sameText(preference,'No apartments')){
        if(sameText(property.propertyType,'apartment')){ eligible=false; reasons.push('Apartment conflicts with remembered preference'); }
        else { matched+=1; reasons.push('Not an apartment'); }
        continue;
      }
      const wantedFacing=preference.match(/^(east|west|north|south)\s+facing$/i);
      const propertyFacing=available.find(attribute=>/^(east|west|north|south)\s+facing$/i.test(attribute));
      if(wantedFacing){
        if(available.some(attribute=>sameText(attribute,preference))){ matched+=1; reasons.push(preference); }
        else reasons.push(propertyFacing?`${propertyFacing} does not meet ${preference}`:`${preference} needs confirmation`);
        continue;
      }
      if(available.some(attribute=>sameText(attribute,preference))){ matched+=1; reasons.push(`Preference met: ${preference}`); }
      else reasons.push(`${preference} needs confirmation`);
    }
    return {eligible,score:Math.round(25*matched/wanted.length),reasons};
  }

  function preferenceReasons(requirement,property){ return preferenceFit(requirement,property).reasons; }

  function evaluate(requirement, property) {
    const reasons=[];
    if (!requirement || !property) return { eligible:false, score:0, reasons:['Missing requirement or property'] };
    if (!sameText(requirement.propertyType, property.propertyType)) return { eligible:false, score:0, reasons:['Property type does not match'] };
    if (!intentCompatible(requirement.intent, property.intent)) return { eligible:false, score:0, reasons:['Transaction intent does not match'] };
    reasons.push(`Matching ${property.propertyType} for ${requirement.intent}`);
    const location=locationFit(requirement.locations, property.locality);
    const price=priceFit(requirement, property);
    const size=sizeFit(requirement,property);
    const preferences=preferenceFit(requirement,property);
    reasons.push(location.reason,price.reason,size.reason,...preferences.reasons);
    if((requirement.preferenceEvidence || []).length && preferences.score>0) reasons.push('Uses preferences learned from earlier feedback');
    const eligible=location.score>0&&price.score>0&&size.eligible&&preferences.eligible;
    const score=eligible?Math.min(100,10+location.score+price.score+size.score+preferences.score):0;
    return {eligible,score,reasons:[...new Set(reasons)]};
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

  function matchId(requirementId,propertyId){ return `match-${requirementId}-${propertyId}`; }

  function sync(repository){
    const wanted=new Map(rank(repository.list('requirements'),repository.list('properties')).map(item=>[matchId(item.requirementId,item.propertyId),item]));
    return repository.transact(tx=>{
      for(const current of tx.list('matches')){
        const next=wanted.get(current.id);
        if(!next){ tx.remove('matches',current.id); continue; }
        if(current.score!==next.score||JSON.stringify(current.reasons)!==JSON.stringify(next.reasons)) tx.update('matches',current.id,next);
        wanted.delete(current.id);
      }
      for(const [id,item] of wanted) tx.create('matches',{id,...item});
      return tx.list('matches').sort((a,b)=>b.score-a.score);
    });
  }

  function labelForScore(score){ return score>=90?'Strong Match':score>=70?'Good Match':'Possible Match'; }

  root.PropertyAssistantMatching={ evaluate, rank, sync, matchId, labelForScore, intentCompatible, locationFit, priceFit, sizeFit, preferenceFit, preferenceReasons, effectivePropertyPrice, sizeBounds, areNearby };
})(globalThis);
