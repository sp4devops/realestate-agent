(function (root) {
  'use strict';

  const STORAGE_KEY = 'pa.domain.v1';
  const CURRENT_SCHEMA_VERSION = 1;
  const ENTITY_TYPES = ['people','contacts','requirements','properties','interactions','followUps','matches','posterLeads'];
  const PERSON_ROLES = new Set(['buyer','seller','owner','tenant','property_advisor','other']);

  function emptyEntities() {
    return Object.fromEntries(ENTITY_TYPES.map((type) => [type, {}]));
  }

  function freshDatabase() {
    return { schemaVersion: CURRENT_SCHEMA_VERSION, entities: emptyEntities() };
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function nonEmpty(value, field) {
    assert(typeof value === 'string' && value.trim().length > 0, `${field} is required`);
  }

  function optionalString(value, field) {
    assert(value == null || typeof value === 'string', `${field} must be a string`);
  }

  function optionalNumber(value, field) {
    assert(value == null || (typeof value === 'number' && Number.isFinite(value)), `${field} must be a finite number`);
  }

  function validatePerson(record) {
    nonEmpty(record.name, 'name');
    assert(PERSON_ROLES.has(record.role), 'role is invalid');
    nonEmpty(record.primaryPhone, 'primaryPhone');
    assert(Array.isArray(record.alternatePhones || []), 'alternatePhones must be an array');
    const alternates = record.alternatePhones || [];
    assert(new Set(alternates).size === alternates.length, 'alternatePhones must be unique');
    assert(!alternates.includes(record.primaryPhone), 'primaryPhone cannot also be alternate');
  }

  function validateContact(record) {
    nonEmpty(record.personId, 'personId');
    assert(['phone','whatsapp','email','other'].includes(record.kind), 'contact kind is invalid');
    nonEmpty(record.value, 'value');
    assert(typeof record.isPrimary === 'boolean', 'isPrimary must be boolean');
  }

  function validateRequirement(record) {
    nonEmpty(record.personId, 'personId');
    assert(['buy','rent','lease','sell'].includes(record.intent), 'requirement intent is invalid');
    assert(Array.isArray(record.locations || []), 'locations must be an array');
    optionalString(record.propertyType, 'propertyType');
    optionalNumber(record.budgetMin, 'budgetMin');
    optionalNumber(record.budgetMax, 'budgetMax');
    if (record.budgetMin != null && record.budgetMax != null) assert(record.budgetMin <= record.budgetMax, 'budgetMin cannot exceed budgetMax');
  }

  function validateProperty(record) {
    assert(['sale','rent','lease'].includes(record.intent), 'property intent is invalid');
    nonEmpty(record.propertyType, 'propertyType');
    nonEmpty(record.locality, 'locality');
    optionalString(record.ownerPersonId, 'ownerPersonId');
    optionalNumber(record.price, 'price');
    if (record.size != null) {
      optionalNumber(record.size.value, 'size.value');
      nonEmpty(record.size.unit, 'size.unit');
    }
  }

  function validateInteraction(record) {
    assert(['call','message','meeting','site_visit','note','other'].includes(record.kind), 'interaction kind is invalid');
    nonEmpty(record.occurredAt, 'occurredAt');
    assert(Array.isArray(record.personIds || []), 'personIds must be an array');
    optionalString(record.summary, 'summary');
  }

  function validateFollowUp(record) {
    nonEmpty(record.dueAt, 'dueAt');
    assert(['open','done','cancelled'].includes(record.status), 'follow-up status is invalid');
    nonEmpty(record.title, 'title');
    optionalString(record.personId, 'personId');
    optionalString(record.propertyId, 'propertyId');
  }

  function validateMatch(record) {
    nonEmpty(record.requirementId, 'requirementId');
    nonEmpty(record.propertyId, 'propertyId');
    optionalNumber(record.score, 'score');
    assert(Array.isArray(record.reasons || []), 'reasons must be an array');
  }

  function validatePosterLead(record) {
    nonEmpty(record.phone, 'phone');
    optionalString(record.imageRef, 'imageRef');
    optionalString(record.posterLocation, 'posterLocation');
    optionalString(record.captureLocation, 'captureLocation');
    nonEmpty(record.capturedAt, 'capturedAt');
  }

  const validators = {
    people: validatePerson,
    contacts: validateContact,
    requirements: validateRequirement,
    properties: validateProperty,
    interactions: validateInteraction,
    followUps: validateFollowUp,
    matches: validateMatch,
    posterLeads: validatePosterLead
  };

  function validateReferences(database, type, record) {
    const has = (entityType, id) => id == null || Boolean(database.entities[entityType][id]);
    if (type === 'contacts' || type === 'requirements') assert(has('people', record.personId), `${type} personId does not exist`);
    if (type === 'properties') assert(has('people', record.ownerPersonId), 'property ownerPersonId does not exist');
    if (type === 'interactions') for (const id of record.personIds || []) assert(has('people', id), 'interaction personId does not exist');
    if (type === 'followUps') {
      assert(has('people', record.personId), 'follow-up personId does not exist');
      assert(has('properties', record.propertyId), 'follow-up propertyId does not exist');
    }
    if (type === 'matches') {
      assert(has('requirements', record.requirementId), 'match requirementId does not exist');
      assert(has('properties', record.propertyId), 'match propertyId does not exist');
    }
  }

  function validateDatabase(database) {
    for (const type of ENTITY_TYPES) {
      for (const [id, record] of Object.entries(database.entities[type])) {
        assert(record && record.id === id, `${type} record id is inconsistent`);
        validators[type](record);
      }
    }
    for (const type of ENTITY_TYPES) {
      for (const record of Object.values(database.entities[type])) validateReferences(database, type, record);
    }
  }

  function migrate(raw) {
    if (!raw || typeof raw !== 'object') return freshDatabase();
    if ((raw.schemaVersion || 0) > CURRENT_SCHEMA_VERSION) throw new Error('Stored data is from a newer Property Assistant version');

    const database = freshDatabase();
    const source = raw.entities || raw;
    for (const type of ENTITY_TYPES) {
      const records = source[type];
      if (Array.isArray(records)) {
        for (const record of records) if (record && record.id) database.entities[type][record.id] = clone(record);
      } else if (records && typeof records === 'object') {
        database.entities[type] = clone(records);
      }
    }
    database.schemaVersion = CURRENT_SCHEMA_VERSION;
    return database;
  }

  function createRepository(storage, options = {}) {
    assert(storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function', 'storage adapter is required');
    const now = options.now || (() => new Date().toISOString());
    const makeId = options.makeId || ((type) => `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`);

    function load() {
      const serialized = storage.getItem(STORAGE_KEY);
      if (!serialized) return freshDatabase();
      try {
        const database = migrate(JSON.parse(serialized));
        validateDatabase(database);
        return database;
      } catch (error) {
        if (error instanceof SyntaxError) throw new Error('Local Property Assistant data is corrupted');
        throw error;
      }
    }

    function save(database) {
      storage.setItem(STORAGE_KEY, JSON.stringify(database));
    }

    function ensureType(type) {
      assert(ENTITY_TYPES.includes(type), `Unknown entity type: ${type}`);
    }

    function validate(type, record, database) {
      ensureType(type);
      validators[type](record);
      validateReferences(database, type, record);
    }

    function create(type, values) {
      const database = load();
      ensureType(type);
      const timestamp = now();
      const record = {
        ...clone(values),
        id: values.id || makeId(type),
        createdAt: values.createdAt || timestamp,
        updatedAt: timestamp
      };
      assert(!database.entities[type][record.id], `${type} record already exists`);
      validate(type, record, database);
      database.entities[type][record.id] = record;
      save(database);
      return clone(record);
    }

    function get(type, id) {
      const database = load();
      ensureType(type);
      return clone(database.entities[type][id] || null);
    }

    function list(type) {
      const database = load();
      ensureType(type);
      return Object.values(database.entities[type]).map(clone);
    }

    function update(type, id, patch) {
      const database = load();
      ensureType(type);
      const current = database.entities[type][id];
      assert(current, `${type} record not found`);
      const record = { ...current, ...clone(patch), id: current.id, createdAt: current.createdAt, updatedAt: now() };
      validate(type, record, database);
      database.entities[type][id] = record;
      save(database);
      return clone(record);
    }

    function isReferenced(database, type, id) {
      if (type === 'people') {
        if (Object.values(database.entities.contacts).some((r) => r.personId === id)) return true;
        if (Object.values(database.entities.requirements).some((r) => r.personId === id)) return true;
        if (Object.values(database.entities.properties).some((r) => r.ownerPersonId === id)) return true;
        if (Object.values(database.entities.interactions).some((r) => (r.personIds || []).includes(id))) return true;
        if (Object.values(database.entities.followUps).some((r) => r.personId === id)) return true;
      }
      if (type === 'requirements' && Object.values(database.entities.matches).some((r) => r.requirementId === id)) return true;
      if (type === 'properties') {
        if (Object.values(database.entities.matches).some((r) => r.propertyId === id)) return true;
        if (Object.values(database.entities.followUps).some((r) => r.propertyId === id)) return true;
      }
      return false;
    }

    function remove(type, id) {
      const database = load();
      ensureType(type);
      if (!database.entities[type][id]) return false;
      assert(!isReferenced(database, type, id), `${type} record is still referenced`);
      delete database.entities[type][id];
      save(database);
      return true;
    }

    function migrateAndPersist() {
      const database = load();
      save(database);
      return database.schemaVersion;
    }

    function seedSynthetic() {
      const database = load();
      if (Object.values(database.entities).some((records) => Object.keys(records).length > 0)) return false;
      const timestamp = '2026-08-21T00:00:00.000Z';
      database.entities.people['person-suresh'] = {
        id:'person-suresh', name:'Suresh (Demo)', role:'buyer', primaryPhone:'+91 90000 00001', alternatePhones:['+91 90000 00002'], createdAt:timestamp, updatedAt:timestamp
      };
      database.entities.people['person-murugan'] = {
        id:'person-murugan', name:'Murugan (Demo)', role:'owner', primaryPhone:'+91 90000 00003', alternatePhones:[], createdAt:timestamp, updatedAt:timestamp
      };
      database.entities.requirements['requirement-suresh'] = {
        id:'requirement-suresh', personId:'person-suresh', intent:'buy', propertyType:'land', locations:['Erode'], budgetMin:1800000, budgetMax:2500000, createdAt:timestamp, updatedAt:timestamp
      };
      database.entities.properties['property-murugan'] = {
        id:'property-murugan', ownerPersonId:'person-murugan', intent:'sale', propertyType:'land', locality:'Erode', price:2200000, size:{value:1200,unit:'sqft'}, createdAt:timestamp, updatedAt:timestamp
      };
      validateDatabase(database);
      save(database);
      return true;
    }

    return { create, get, list, update, remove, migrateAndPersist, seedSynthetic, loadSnapshot: () => clone(load()) };
  }

  root.PropertyAssistantPersistence = {
    STORAGE_KEY,
    CURRENT_SCHEMA_VERSION,
    ENTITY_TYPES: [...ENTITY_TYPES],
    createRepository,
    migrate,
    freshDatabase
  };
})(globalThis);
