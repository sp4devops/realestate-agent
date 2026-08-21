# AGENTS.md — Property Assistant AI Harness

This file is the mandatory operating contract for every human or AI agent working in this repository.

## 1. Mission

Build the Property Assistant from project skeleton to tested Android APK and desktop application while preserving the locked product idea and making every session resumable from repository state alone.

User-facing terminology: **Property Advisor**. Internal/legal documentation may use **Real Estate Agent** where appropriate.

## 2. Session bootstrap — mandatory

Before editing code:

1. Read `PROJECT_STATE.yaml`.
2. Read this file fully.
3. Read `docs/product/PRODUCT_GUARDRAILS.md`.
4. Read `docs/engineering/AGENT_EXECUTION_LOOP.md`.
5. Read the active phase in `docs/engineering/DELIVERY_PHASES.md`.
6. Inspect recent commits, open PRs, CI status, and current tests.
7. Run `python3 scripts/harness_check.py`.
8. Continue the highest-priority unfinished task in `PROJECT_STATE.yaml`; do not invent a new roadmap.

If repository state and chat instructions conflict, explicit current user instructions win, but record the decision in `PROJECT_STATE.yaml` and the handoff log.

## 3. Source-of-truth precedence

Use this order when decisions conflict:

1. Explicit current user instruction.
2. Locked product charter / `docs/product/PRODUCT_GUARDRAILS.md`.
3. Approved visual prototype and its interaction behavior.
4. `PROJECT_STATE.yaml`.
5. Architecture/engineering docs.
6. Existing implementation.
7. Agent preference.

Never silently change a product guardrail to make implementation easier.

## 4. Core product invariants

Every implementation must preserve all of these:

- Capture → Understand → Remember → Match → Act is the central loop.
- Voice-first, not voice-only.
- Local-first and private by default.
- Tamil, English, and Tanglish are the first quality targets.
- UI language and spoken/input language are separate concepts.
- Core storage, lookup, deterministic matching, reminders, navigation, and basic workflows work when AI/model inference is unavailable.
- Contact numbers are first-class structured data.
- Results are action-oriented cards/lists, not chatbot-only output.
- Automatic matching is central, not optional decoration.
- Android + desktop first; iOS later.
- Approximately 4 GB RAM Android devices are a target class.
- Avoid recurring paid infrastructure before validation.
- Do not expand the MVP into a generic CRM, ERP, property portal, social network, accounting suite, or marketplace.

## 5. Work unit rule

Work in small vertical slices. A work unit must include, where applicable:

- implementation;
- unit/integration tests;
- Playwright or platform E2E coverage for user-visible behavior;
- accessibility/basic usability checks;
- failure-path coverage;
- documentation/state update.

Do not create a large feature batch and postpone testing until the end.

## 6. Test pyramid and quality gates

### Unit tests
Test deterministic domain logic: parsing helpers, normalization, matching, ranking, validation, persistence adapters, state reducers/view models.

### Integration tests
Test storage + services + model adapters + deterministic fallback boundaries.

### E2E tests
Use Playwright for web/desktop UI surfaces and the repository-selected Android E2E mechanism for native/device flows. E2E tests must use stable `data-testid`/semantic selectors; avoid brittle CSS-path selectors.

For each production phase, cover:

- happy path;
- invalid/empty input;
- offline/no-model fallback where relevant;
- persistence across restart/reload where relevant;
- language switching without corrupting language-neutral data;
- large tap targets/readability for primary actions;
- no dead primary buttons.

### Review gate
Before a phase can be marked complete, run three distinct reviews:

1. **Code reviewer** — correctness, maintainability, security, architecture, regression risk.
2. **QA reviewer** — acceptance criteria, edge cases, state transitions, failure paths, accessibility/usability.
3. **Product guardrail reviewer** — confirms the implementation still matches the locked product charter and visual contract.

An agent may perform all three roles sequentially, but must record findings separately and may not waive unresolved high/critical findings.

## 7. Definition of Done

A task is done only when:

- implementation exists;
- relevant automated tests exist and pass;
- no known critical/high defect remains;
- lint/type/static checks pass when configured;
- E2E passes for affected critical flows;
- relevant screenshots/traces/logs are retained by CI where configured;
- the latest required CI run for current HEAD is terminal and successful;
- state/handoff docs are updated;
- no product invariant was weakened.

A phase additionally requires every acceptance criterion in `docs/engineering/DELIVERY_PHASES.md` to be satisfied.

## 8. Failure protocol

If a test or workflow fails:

1. Reproduce or inspect exact logs.
2. Identify the root cause; do not blindly rerun repeatedly.
3. Add or improve a regression test when feasible.
4. Fix the smallest correct layer.
5. Rerun the narrow test, then the phase suite.
6. Commit/push the fix and re-enter the CI completion loop.
7. Record any remaining limitation in `PROJECT_STATE.yaml`.

Never report success from a green partial test when required phase/E2E checks still fail.

## 9. CI completion loop — mandatory

After every push that changes implementation, tests, harness rules, or build configuration:

1. Discover the workflow run/checks for the exact current HEAD commit or open PR.
2. Poll until the relevant run reaches terminal `completed` state.
3. Do not treat queued/in-progress as success.
4. Inspect every required job.
5. On failure/cancel/timeout: inspect job steps and logs, diagnose root cause, fix, add regression coverage when practical, push, and repeat from step 1.
6. If no relevant run/checks exist for current HEAD, mark CI `missing`/`blocked`; do not advance.
7. Only after CI is green run code review, QA review, and product-guardrail review.
8. If those reviews require changes, push fixes and repeat the CI loop again.
9. Only then may the current task/phase be marked complete or the next phase begin.

The canonical algorithm and state model are in `docs/engineering/AGENT_EXECUTION_LOOP.md`.

**Hard invariant:** `push != done`. `CI green for current HEAD + reviews green = eligible to advance`.

## 10. State and handoff discipline

`PROJECT_STATE.yaml` is machine-readable current state. Keep it concise and current.

At the end of every meaningful session:

- update active phase/task statuses;
- set `last_verified_commit` only to the exact commit whose required CI and reviews passed; otherwise use `UNVERIFIED`/the current unverified SHA as appropriate;
- maintain `ci_gate.status` (`not_started`, `waiting`, `failed`, `missing`, `green`, or `blocked`);
- record workflow/run/check evidence and results;
- record blockers and exact next actions;
- append a timestamped entry to `docs/handoff/HANDOFF_LOG.md`.

Do not overwrite historical handoff entries.

## 11. Git discipline

- Never develop directly on `main` unless explicitly instructed.
- Use focused branches and commits.
- Never mix unrelated changes.
- PR descriptions must state: phase, acceptance criteria addressed, tests/evidence, known limitations, guardrail impact.
- Do not merge with failing, pending, missing, or unverified required checks.
- Do not claim an APK exists until CI/local build produced one successfully.

## 12. Security/privacy rules

- No secrets in repo, logs, fixtures, screenshots, test data, or prompts.
- Use synthetic people/phone numbers in tests.
- Do not send user business data to external services by default.
- New network/cloud dependencies require explicit architectural justification and product-guardrail review.
- Backups must eventually be encrypted and restorable; a backup without a tested restore path is incomplete.

## 13. AI/model architecture rules

Treat model components as replaceable adapters. Domain records and business logic must not depend on one vendor/model schema.

Use deterministic logic where it is sufficient. For model-assisted extraction/search/matching:

- return structured, validated outputs;
- retain confidence/uncertainty where useful;
- provide correction/confirmation for uncertain extraction;
- maintain a deterministic fallback for core workflows;
- optimize business meaning over verbatim transcription.

## 14. UI contract

Production UI should follow the approved visual prototype unless a documented decision changes it. Key experience characteristics:

- deep green primary brand tone;
- restrained warm-gold accent;
- light, readable surfaces;
- rounded cards;
- strong contrast;
- generous spacing;
- obvious primary actions;
- minimal navigation;
- simple terminology suitable for a non-technical older user.

Primary screens/flows to preserve include Splash, Onboarding, Home, Speak, Type, Review, Ask/Search, People, Person detail, Property detail, Matches, Match detail, Poster capture/review/lead, Follow-ups, Language, and Settings/Backup.

## 15. Stop conditions

Stop and record a blocker instead of fabricating progress when:

- a required credential/device/tool is unavailable;
- platform restrictions make a requested flow impossible as specified;
- a product decision is genuinely ambiguous and materially changes architecture;
- required tests cannot be executed in the current environment;
- CI cannot be discovered/polled/logged for current HEAD.

Even when blocked, leave the repo in a resumable state with the exact next command/action documented.
