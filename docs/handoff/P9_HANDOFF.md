# P9 Handoff — Backup, restore, settings, language and privacy hardening

Date: 2026-08-22 IST

Branch: `ai/p9-backup-settings-privacy`

PR: #10 — P9: Backup, restore, settings, language and privacy hardening

Base main: `d25f7bf91b10e760941406e6a4976d116eb82c9e` (P8 merge)

## Implementation

- Added explicit encrypted local backup/export using browser-native PBKDF2-SHA-256 key derivation and AES-GCM encryption. No network/cloud backup service or paid dependency was introduced.
- Backup payload contains the validated structured domain snapshot, independent display/input language settings, and locally stored poster-image bytes from IndexedDB.
- Added versioned backup envelope and rejection paths for malformed JSON, unrelated files, unsupported versions/security parameters, wrong passwords and corrupted ciphertext.
- Restore validates the structured domain against the existing persistence/migration contract before replacing live state.
- Added IndexedDB `list()` and transactional `replaceAll()` support for poster images.
- Restore captures previous structured settings/image state and performs best-effort rollback if the image-store portion fails after structured state has begun changing.
- Added Settings & Backup UI with backup status, password + confirmation, encrypted export, file-based restore and privacy disclosures.
- UI display language remains independent from voice/typing input language; language switching does not mutate structured business memory.
- Backup password recovery is intentionally impossible because no password or recovery secret is sent to a server.

## CI and repair loop

- Initial implementation HEAD `b98b1952b6208359bb3b42159d8b7d495e2e2c50` triggered Quality Gates #241 (`32516905764`). Harness was green, but JS/unit failed because the new corrupt-domain test used `{schemaVersion:1, entities:{}}`, which the existing migration layer correctly normalizes into a valid empty database. This was a test-fixture defect, not a production validation defect.
- Corrected the regression fixture to a true inconsistent-record-id failure at HEAD `ca1a43a93db6eebc9a934d1d2109847597568047`. Quality Gates #243 (`32517000376`) completed successfully with all required jobs green.
- Reviewer hardening added password confirmation, poster-image byte-for-byte backup/restore coverage and restore rollback protection at HEAD `d062f01fe275f703b35fada20dde75967b4600b0`. Quality Gates #245 (`32517282814`) completed successfully with all required jobs green.
- QA review identified one remaining coverage gap: success was proven through core round-trip tests but not the actual file-upload restore UI. Added a Playwright regression that creates a real encrypted payload, mutates local state, restores through the file picker, waits for reload and verifies the previous snapshot/settings are restored.
- Final functional/reviewer HEAD `1323863aeebf9f2908eb34ee73803444843ef997` passed Quality Gates #247 (`32517515955`): Detect repository stacks, Harness integrity, JS unit/lint/type checks, Playwright E2E, Android tests/build/debug APK upload, and Required gate summary all succeeded.

## Reviewer gates

- Senior Code Reviewer: PASS — encryption/versioning, random salt/IV, validation-before-mutation, restore rollback, IndexedDB image handling, settings integration and local-only boundaries reviewed. No Critical/High blocker remains.
- Senior QA Reviewer: PASS — produced backup round-trip, actual UI restore success, wrong password, corrupt/unrelated file handling, password mismatch, image-byte restore, rollback, backup status, language/data separation, desktop/mobile Playwright, Android build/tests/APK and harness covered. No Critical/High blocker remains.
- Product/UX Guardrail Reviewer: PASS — backup is explicit, encrypted and local; privacy disclosure is visible; no cloud sync/account system/CRM scope was introduced; display and input languages remain separate. No Critical/High blocker remains.

## Nonblocking constraints

- Image-heavy backups are materialized into the encrypted payload in memory. Large real-world backup sizing and low-memory target-device behavior must be measured in P10 performance/resilience QA.
- Browser/WebView file import/export is the current cross-platform surface. Desktop-native packaged file handling remains a P11 release concern.
- Backup passwords cannot be recovered by design; the UI warns the user and requires confirmation at creation time.
- Cross-backend atomicity between localStorage and IndexedDB cannot be guaranteed across a process crash; normal runtime failures use validation plus rollback. P10 resilience testing should exercise interrupted/low-storage scenarios on target hardware.

## Merge rule

PR #10 must not be merged without explicit user authorization after the final exact-documentation-HEAD Quality Gates run succeeds.

## Next after authorized merge

Verify `main`, create a fresh P10 branch, re-run bootstrap, and execute the exact P10 acceptance criteria from `docs/engineering/DELIVERY_PHASES.md` for performance, accessibility, resilience and offline QA.
