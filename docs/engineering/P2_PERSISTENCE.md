# P2 Persistence — Local Domain Memory

## Decision

Property Assistant P2 uses a small versioned repository contract over the browser/WebView `localStorage` API for the first shared persistence layer. This keeps the Android and desktop-compatible shells on one language-neutral data contract, adds no runtime dependency, requires no server or model, and keeps baseline memory/package cost low.

This is a P2 storage boundary, not a permanent prohibition on a later native database. A future native adapter may replace the storage backend without changing the domain records or repository API when dataset size, query complexity, backup, encryption, or platform requirements justify it.

## Domain collections

The version-1 store contains these language-neutral collections:

- `people`
- `contacts`
- `requirements`
- `properties`
- `interactions`
- `followUps`
- `matches`
- `posterLeads`

People preserve `primaryPhone` separately from `alternatePhones`. Poster leads keep `posterLocation` distinct from `captureLocation`. Display-language and input-language settings remain outside domain records.

## Repository contract

`web/domain-store.js` exposes create, get, list, update, remove, migration, synthetic seeding, and snapshot operations through `PropertyAssistantPersistence.createRepository(storage)`.

Every persisted record has an immutable `id` and `createdAt`, plus an updated `updatedAt`. Validators reject obvious corruptions such as invalid entity types, duplicate primary/alternate phone identity, impossible budget ranges, or malformed required fields.

## Migration/versioning

The store is identified by `pa.domain.v1` and carries `schemaVersion: 1`. The migration function accepts legacy unversioned object/array collections, normalizes them to keyed version-1 collections, fills missing collection buckets, and rejects data from a newer schema version.

Malformed JSON is surfaced as a local-data corruption error rather than silently replacing user records.

## Synthetic data

P2 seeds only synthetic demo records when the entire domain store is empty. The seed contains demo people, a buyer requirement, and an owner property in Erode. Seed creation is idempotent and never overwrites existing local records.

## Scope boundary

P2 stores structured records only. It does not implement typed extraction (P3), voice understanding (P4), matching/ranking behavior (P5), OCR (P7), or encrypted backup/restore (P9).
