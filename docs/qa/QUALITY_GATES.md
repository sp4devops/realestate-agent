# Quality Gates and Test Matrix

## Severity

- **Critical**: data loss/privacy breach/security bypass/app cannot launch/core business loop unusable.
- **High**: primary flow broken, wrong persisted business data, wrong match/action with material impact, backup/restore failure.
- **Medium**: degraded non-core behavior, confusing UX, language/visual regression without data risk.
- **Low**: polish, minor copy/layout defects.

Critical and High defects block phase completion and release.

Current P12 scope is English typing only. Active release checks must prove voice/multilingual controls are absent, Android requests no microphone permission, and the typed core loop remains usable offline. Voice/Tamil/Tanglish quality is not a pilot completion gate until explicitly reactivated.

## Required checks by change type

| Change | Unit | Integration | E2E | Product review | QA review |
|---|---:|---:|---:|---:|---:|
| Domain/model | yes | yes | if user-visible | yes | yes |
| Persistence | yes | yes | yes for critical records | yes | yes |
| UI/navigation | targeted | as needed | yes | yes | yes |
| AI/STT/OCR adapter | yes | yes | yes with deterministic fixture/mocks | yes | yes |
| Matching | yes, extensive | yes | yes | yes | yes |
| Backup/restore | yes | yes | yes | yes | yes |
| Build/release | no | yes | smoke | yes | yes |

## Critical E2E scenarios

1. Onboard → Home → Type & Save buyer → review → save → record visible after reload.
2. Type & Save property → review → save → automatic match appears.
3. Core Suresh/Murugan scenario produces an explainable possible match and useful call/save actions.
4. Ask/Search finds a remembered person/property and presents operational cards.
5. English-only pilot UI remains stable when legacy language preferences exist, while language-neutral stored data remains unchanged.
6. AI/model unavailable: local records, lookup, deterministic matching, reminders, navigation remain usable.
7. Offline mode: critical local flows remain available.
8. Poster flow: phone-first extraction, distinct poster location and photo GPS, save lead, follow-up/match where applicable.
9. Backup → mutate/delete local state → restore → expected records recovered.
10. Primary buttons across approved screens have working actions; no dead-end navigation.

## Playwright conventions

- Use Playwright for desktop/web-compatible UI E2E.
- Prefer semantic role/name selectors; add stable `data-testid` only when needed.
- Do not select by generated CSS class or deep DOM structure.
- Tests must be isolated and deterministic.
- Seed synthetic data only; never use real customer data.
- Capture trace/screenshots on failure in CI.
- A visual regression baseline may support review, but it does not replace behavioral assertions.

## Android E2E conventions

When the Android implementation is selected, add the appropriate native/device test layer (e.g. Compose UI/instrumentation/Appium/Maestro as architecture dictates). Keep shared business acceptance scenarios aligned with Playwright tests rather than maintaining contradictory suites.

## Reviewer report template

Each phase review records:

- Scope reviewed
- Evidence/commands
- Critical findings
- High findings
- Medium findings + disposition
- Low findings + disposition
- Product guardrail deviations
- Result: PASS / FAIL

No agent may mark PASS while Critical/High findings remain open.
