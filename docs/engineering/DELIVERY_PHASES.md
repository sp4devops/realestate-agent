# Autonomous Delivery Phases

Each phase is a gated vertical milestone. Agents must finish the active phase before advancing unless a documented dependency requires parallel work.

## P0 — Harness and source-of-truth bootstrap

Deliverables: AGENTS.md, PROJECT_STATE.yaml, product guardrails, phase plan, QA strategy, handoff log, harness validation, CI.

Exit gate: harness check passes in CI; state is current; source artifacts are represented/referenced; draft PR reviewed.

## P1 — Application skeleton and navigation

Deliverables: selected cross-platform architecture, Android + desktop runnable skeleton, design tokens, navigation, shell screens matching approved prototype hierarchy.

Acceptance: all primary routes render; no dead navigation; language setting architecture separated from speech/input language; basic accessibility labels/selectors exist; Playwright smoke test covers desktop/web shell; Android build succeeds.

## P2 — Local domain model and persistence

Deliverables: language-neutral schemas for people, contacts, requirements, properties, interactions, follow-ups, matches, poster leads; local repository layer; migrations/versioning; synthetic seed data.

Acceptance: create/read/update/delete survives restart; primary/alternate phone preserved; no model required; migration tests pass.

## P3 — Type capture and structured extraction

Deliverables: Type & Save flow; deterministic parser/fallback; model adapter interface; extraction review/correction card.

Acceptance: Tamil/English/Tanglish fixtures map to validated structured records; uncertain values can be corrected; no-model path remains usable; E2E saves a buyer and property.

## P4 — Voice capture and multilingual understanding

Deliverables: microphone capture, local STT adapter, language/business normalization, local dictionaries for regional places/property terms.

Acceptance: supported test fixtures extract useful business meaning; permission denial handled; model/STT failure does not break typed capture; memory/latency measured on representative target class where available.

## P5 — Matching and Action Brain

Deliverables: deterministic matching/ranking, negotiability/nearby/price tolerance rules, match reason explanations, action cards.

Acceptance: new demand matches existing supply and vice versa; updates recalculate; unit tests cover hard requirements vs preferences; E2E reproduces Suresh ↔ Murugan core example.

## P6 — Ask/Search and operational result cards

Deliverables: natural-language query interpretation, local search, filters, actionable results.

Acceptance: queries return cards/lists rather than chat-only response; voice/text entry supported by shared query contract; offline search works.

## P7 — Poster capture and OCR lead flow

Deliverables: camera/gallery flow, OCR adapter, phone-first extraction, Poster Lead storage, original image metadata, distinct poster-location vs capture-GPS fields.

Acceptance: phone extraction prioritized; permission/GPS absence handled; no continuous location tracking; poster lead can trigger matching/follow-up.

## P8 — After-call recap, follow-ups, communication actions

Deliverables: technically permitted after-call prompt, recap flow, follow-up scheduling/state, call/WhatsApp/share actions.

Acceptance: does not assume unrestricted call recording; recent number prefill only when platform permits; follow-up lifecycle tested.

## P9 — Backup, restore, settings, language, privacy hardening

Deliverables: encrypted local backup/export, restore, backup status, settings, UI language switch, privacy disclosures.

Acceptance: restore verified from produced backup; language switch changes UI but not structured stored data; corrupt/wrong backup handled safely.

## P10 — Performance, accessibility, resilience and offline QA

Deliverables: startup/memory/storage measurements, offline suite, failure injection, accessibility pass, visual regression baselines for critical screens.

Acceptance: no critical/high QA issues; target-device risks documented; primary flows remain usable offline/no-model.

## P11 — Release candidates

Deliverables: signed/configurable Android release pipeline, installable APK artifact, desktop release candidate, versioning/changelog.

Acceptance: clean build from repository; automated smoke/E2E pass against release candidate; APK artifact retained; install/launch verified where runner/device permits.

## P12 — Broker pilot readiness

Deliverables: pilot checklist, synthetic/demo dataset, feedback capture plan, privacy/backup onboarding, known-limitations sheet.

Acceptance: approximately five-broker pilot can be run without developer intervention for basic flows; no unresolved critical/high defects; rollback/recovery documented.

## Mandatory review gate for every phase

A phase cannot be advanced until all three reviews are recorded:

- Code Review: architecture, correctness, tests, security, maintainability.
- QA Review: acceptance criteria, edge cases, failure paths, accessibility, UX behavior.
- Product Review: charter/visual-prototype consistency, scope control, simplicity.

Critical/high findings block advancement. Medium findings require explicit disposition. Low findings may be deferred with an issue/task reference.
