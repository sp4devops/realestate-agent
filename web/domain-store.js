(function (root) {
  'use strict';

  const STORAGE_KEY = 'pa.domain.v1';
  const CURRENT_SCHEMA_VERSION = 1;
  const ENTITY_TYPES = ['people','contacts','requirements','properties','interactions','followUps','matches','posterLeads'];
  const PERSON_ROLES = new Set(['buyer','seller','owner','tenant','property_advisor','other']);

  function emptyEntities() { return Object.fromEntries(ENTITY_TYPES.map((type) => [type, {}])); }
  function freshDatabase() { return { schemaVersion: CURRENT_SCHEMA_VERSION, entities: emptyEntities() }; }
  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function assert(condition, message) { if (!condition) throw new Error(message); }
  function nonEmpty(value, field) { assert(typeof value === 'string' && value.trim().length > 0, `${field} is required`); }
  function optionalString(value, field) { assert(value == null || typeof value === 'string', `${field} must be a string`); }
  function optionalNumber(value, field) { assert(value == null || (typeof value === 'number' && Number.isFinite(value)), `${field} must be a finite number`); }
  function optionalNonNegativeNumber(value, field) { optionalNumber(value, field); assert(value == null || value >= 0, `${field} cannot be negative`); }
  function validDate(value, field) { nonEmpty(value, field); assert(Number.isFinite(Date.parse(value)), `${field} must be a valid date`); }
  function normalizePhone(value) {
    let digits=String(value || '').replace(/\D/g,'');
    if(digits.length===12 && digits.startsWith('91')) digits=digits.slice(2);
    if(digits.length===11 && digits.startsWith('0')) digits=digits.slice(1);
    return digits.length===10 && /^[6-9]/.test(digits) ? digits : null;
  }

  function validateSize(size) {
    if (size == null) return;
    assert(size && typeof size === 'object' && !Array.isArray(size), 'size must be an object');
    optionalNonNegativeNumber(size.value, 'size.value');
    assert(size.value != null && size.value > 0, 'size.value must be greater than zero');
    nonEmpty(size.unit, 'size.unit');
  }

  function validatePerson(record) {
    nonEmpty(record.name, 'name');
    assert(PERSON_ROLES.has(record.role), 'role is invalid');
    nonEmpty(record.primaryPhone, 'primaryPhone');
    assert(normalizePhone(record.primaryPhone), 'primaryPhone must be a valid Indian mobile number');
    assert(Array.isArray(record.alternatePhones || []), 'alternatePhones must be an array');
    const alternates = record.alternatePhones || [];
    const normalizedAlternates=[];
    for (const phone of alternates) {
      nonEmpty(phone, 'alternatePhone');
      const normalized=normalizePhone(phone);
      assert(normalized, 'alternatePhone must be a valid Indian mobile number');
      normalizedAlternates.push(normalized);
    }
    assert(new Set(normalizedAlternates).size === normalizedAlternates.length, 'alternatePhones must be unique');
    assert(!normalizedAlternates.includes(normalizePhone(record.primaryPhone)), 'primaryPhone cannot also be alternate');
  }

  function validateContact(record) { nonEmpty(record.personId, 'personId'); assert(['phone','whatsapp','email','other'].includes(record.kind), 'contact kind is invalid'); nonEmpty(record.value, 'value'); assert(typeof record.isPrimary === 'boolean', 'isPrimary must be boolean'); }
  function validateRequirement(record) {
    nonEmpty(record.personId, 'personId'); assert(['buy','rent','lease','sell'].includes(record.intent), 'requirement intent is invalid'); assert(Array.isArray(record.locations || []), 'locations must be an array');
    for (const location of record.locations || []) nonEmpty(location, 'location'); optionalString(record.propertyType, 'propertyType'); optionalNonNegativeNumber(record.budgetMin, 'budgetMin'); optionalNonNegativeNumber(record.budgetMax, 'budgetMax');
    if (record.budgetMin != null && record.budgetMax != null) assert(record.budgetMin <= record.budgetMax, 'budgetMin cannot exceed budgetMax'); validateSize(record.size);
  }
  function validateProperty(record) { assert(['sale','rent','lease'].includes(record.intent), 'property intent is invalid'); nonEmpty(record.propertyType, 'propertyType'); nonEmpty(record.locality, 'locality'); optionalString(record.ownerPersonId, 'ownerPersonId'); optionalNonNegativeNumber(record.price, 'price'); validateSize(record.size); }
  function validateInteraction(record) { assert(['call','message','meeting','site_visit','note','other'].includes(record.kind), 'interaction kind is invalid'); validDate(record.occurredAt, 'occurredAt'); assert(Array.isArray(record.personIds || []), 'personIds must be an array'); optionalString(record.summary, 'summary'); optionalString(record.phone, 'phone'); }
  function validateFollowUp(record) { validDate(record.dueAt, 'dueAt'); assert(['open','done','cancelled'].includes(record.status), 'follow-up status is invalid'); nonEmpty(record.title, 'title'); optionalString(record.personId, 'personId'); optionalString(record.propertyId, 'propertyId'); optionalString(record.posterLeadId, 'posterLeadId'); }
  function validateMatch(record) { nonEmpty(record.requirementId, 'requirementId'); nonEmpty(record.propertyId, 'propertyId'); optionalNumber(record.score, 'score'); assert(record.score == null || (record.score >= 0 && record.score <= 100), 'score must be between 0 and 100'); assert(Array.isArray(record.reasons || []), 'reasons must be an array'); for (const reason of record.reasons || []) nonEmpty(reason, 'match reason'); }
  function validatePosterLead(record) { nonEmpty(record.phone, 'phone'); optionalString(record.imageRef, 'imageRef'); optionalString(record.posterLocation, 'posterLocation'); optionalString(record.captureLocation, 'captureLocation'); optionalString(record.ocrText, 'ocrText'); validDate(record.capturedAt, 'capturedAt'); }

  const validators = { people: validatePerson, contacts: validateContact, requirements: validateRequirement, properties: validateProperty, interactions: validateInteraction, followUps: validateFollowUp, matches: validateMatch, posterLeads: validatePosterLead };

  function validateReferences(database, type, record) {
    const has = (entityType, id) => id == null || Boolean(database.entities[entityType][id]);
    if (type === 'contacts' || type === 'requirements') assert(has('people', record.personId), `${type} personId does not exist`);
    if (type === 'properties') assert(has('people', record.ownerPersonId), 'property ownerPersonId does not exist');
    if (type === 'interactions') for (const id of record.personIds || []) assert(has('people', id), 'interaction personId does not exist');
    if (type === 'followUps') { assert(has('people', record.personId), 'follow-up personId does not exist'); assert(has('properties', record.propertyId), 'follow-up propertyId does not exist'); assert(has('posterLeads', record.posterLeadId), 'follow-up posterLeadId does not exist'); }
    if (type === 'matches') { assert(has('requirements', record.requirementId), 'match requirementId does not exist'); assert(has('properties', record.propertyId), 'match propertyId does not exist'); }
  }

  function validatePhoneOwnership(database, record) {
    if (!record) return;
    const candidatePhones=[record.primaryPhone,...(record.alternatePhones || [])].map(normalizePhone).filter(Boolean);
    for (const other of Object.values(database.entities.people || {})) {
      if (!other || other.id===record.id) continue;
      const otherPhones=[other.primaryPhone,...(other.alternatePhones || [])].map(normalizePhone).filter(Boolean);
      assert(!candidatePhones.some(phone=>otherPhones.includes(phone)), 'Phone number already belongs to another person');
    }
  }

  function validateDatabase(database) {
    assert(database && database.entities && typeof database.entities === 'object', 'Local Property Assistant data is incomplete');
    for (const type of ENTITY_TYPES) {
      assert(database.entities[type] && typeof database.entities[type] === 'object' && !Array.isArray(database.entities[type]), `${type} collection is invalid`);
      for (const [id, record] of Object.entries(database.entities[type])) { assert(record && record.id === id, `${type} record id is inconsistent`); validators[type](record); }
    }
    const phoneOwners=new Map();
    for (const person of Object.values(database.entities.people)) {
      for (const phone of [person.primaryPhone,...(person.alternatePhones || [])].map(normalizePhone).filter(Boolean)) {
        assert(!phoneOwners.has(phone), 'Phone number already belongs to another person'); phoneOwners.set(phone,person.id);
      }
    }
    for (const type of ENTITY_TYPES) for (const record of Object.values(database.entities[type])) validateReferences(database, type, record);
  }

  function migrate(raw) {
    if (!raw || typeof raw !== 'object') return freshDatabase();
    if ((raw.schemaVersion || 0) > CURRENT_SCHEMA_VERSION) throw new Error('Stored data is from a newer Property Assistant version');
    const database = freshDatabase(); const source = raw.entities || raw;
    for (const type of ENTITY_TYPES) {
      const records = source[type];
      if (Array.isArray(records)) for (const record of records) if (record && record.id) database.entities[type][record.id] = clone(record);
      else if (records && typeof records === 'object') database.entities[type] = clone(records);
    }
    database.schemaVersion = CURRENT_SCHEMA_VERSION; return database;
  }

  function createRepository(storage, options = {}) {
    assert(storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function', 'storage adapter is required');
    const now = options.now || (() => new Date().toISOString()); const makeId = options.makeId || ((type) => `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    function load() {
      const serialized = storage.getItem(STORAGE_KEY); if (!serialized) return freshDatabase();
      try { const database = migrate(JSON.parse(serialized)); validateDatabase(database); return database; }
      catch (error) { if (error instanceof SyntaxError) throw new Error('Local Property Assistant data is corrupted'); throw error; }
    }
    function save(database) { validateDatabase(database); storage.setItem(STORAGE_KEY, JSON.stringify(database)); }
    function ensureType(type) { assert(ENTITY_TYPES.includes(type), `Unknown entity type: ${type}`); }
    function validate(type, record, database) { ensureType(type); validators[type](record); if(type==='people') validatePhoneOwnership(database,record); validateReferences(database, type, record); }
    function isReferenced(database, type, id) {
      if (type === 'people') {
        if (Object.values(database.entities.contacts).some((r) => r.personId === id)) return true; if (Object.values(database.entities.requirements).some((r) => r.personId === id)) return true; if (Object.values(database.entities.properties).some((r) => r.ownerPersonId === id)) return true; if (Object.values(database.entities.interactions).some((r) => (r.personIds || []).includes(id))) return true; if (Object.values(database.entities.followUps).some((r) => r.personId === id)) return true;
      }
      if (type === 'requirements' && Object.values(database.entities.matches).some((r) => r.requirementId === id)) return true;
      if (type === 'properties') { if (Object.values(database.entities.matches).some((r) => r.propertyId === id)) return true; if (Object.values(database.entities.followUps).some((r) => r.propertyId === id)) return true; }
      if (type === 'posterLeads' && Object.values(database.entities.followUps).some((r) => r.posterLeadId === id)) return true; return false;
    }
    function transactionApi(database) {
      return {
        create(type, values) { ensureType(type); const timestamp = now(); const record = { ...clone(values), id: values.id || makeId(type), createdAt: values.createdAt || timestamp, updatedAt: timestamp }; assert(!database.entities[type][record.id], `${type} record already exists`); validate(type, record, database); database.entities[type][record.id] = record; return clone(record); },
        get(type, id) { ensureType(type); return clone(database.entities[type][id] || null); },
        list(type) { ensureType(type); return Object.values(database.entities[type]).map(clone); },
        update(type, id, patch) { ensureType(type); const current = database.entities[type][id]; assert(current, `${type} record not found`); const record = { ...current, ...clone(patch), id: current.id, createdAt: current.createdAt, updatedAt: now() }; validate(type, record, database); database.entities[type][id] = record; return clone(record); },
        remove(type, id) { ensureType(type); if (!database.entities[type][id]) return false; assert(!isReferenced(database, type, id), `${type} record is still referenced`); delete database.entities[type][id]; return true; }
      };
    }
    function transact(callback) { assert(typeof callback === 'function', 'transaction callback is required'); const database = load(); const result = callback(transactionApi(database)); assert(!(result && typeof result.then === 'function'), 'repository transactions must be synchronous'); save(database); return clone(result); }
    function create(type, values) { return transact((tx) => tx.create(type, values)); }
    function get(type, id) { const database = load(); ensureType(type); return clone(database.entities[type][id] || null); }
    function list(type) { const database = load(); ensureType(type); return Object.values(database.entities[type]).map(clone); }
    function update(type, id, patch) { return transact((tx) => tx.update(type, id, patch)); }
    function remove(type, id) { return transact((tx) => tx.remove(type, id)); }
    function migrateAndPersist() { const database = load(); save(database); return database.schemaVersion; }
    function seedSynthetic() {
      const database = load(); if (Object.values(database.entities).some((records) => Object.keys(records).length > 0)) return false; const timestamp = '2026-08-21T00:00:00.000Z';
      database.entities.people['person-suresh'] = { id:'person-suresh', name:'Suresh (Demo)', role:'buyer', primaryPhone:'+91 90000 00001', alternatePhones:['+91 90000 00002'], createdAt:timestamp, updatedAt:timestamp };
      database.entities.people['person-murugan'] = { id:'person-murugan', name:'Murugan (Demo)', role:'owner', primaryPhone:'+91 90000 00003', alternatePhones:[], createdAt:timestamp, updatedAt:timestamp };
      database.entities.requirements['requirement-suresh'] = { id:'requirement-suresh', personId:'person-suresh', intent:'buy', propertyType:'land', locations:['Erode'], budgetMin:1800000, budgetMax:2500000, createdAt:timestamp, updatedAt:timestamp };
      database.entities.properties['property-murugan'] = { id:'property-murugan', ownerPersonId:'person-murugan', intent:'sale', propertyType:'land', locality:'Erode', price:2200000, size:{value:1200,unit:'sqft'}, createdAt:timestamp, updatedAt:timestamp };
      save(database); return true;
    }
    return { create, get, list, update, remove, transact, migrateAndPersist, seedSynthetic, loadSnapshot: () => clone(load()) };
  }

  root.PropertyAssistantPersistence = { STORAGE_KEY, CURRENT_SCHEMA_VERSION, ENTITY_TYPES: [...ENTITY_TYPES], createRepository, migrate, freshDatabase, normalizePhone };
})(globalThis);
