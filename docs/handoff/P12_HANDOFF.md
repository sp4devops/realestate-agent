# P12 Handoff — English Typed Property Advisor Second Brain

## Current status

The 0.11.0-rc.4 implementation is complete, exact-functional-head CI is green, and all three independent post-repair reviewer gates approve it with no Critical, High or Medium finding.

P12 remains **not merge-ready** until the Android candidate is installed and exercised on a representative physical phone. This is a device-validation gate, not an unresolved hosted-test or reviewer defect. PR #13 remains open and must not be merged without fresh explicit user authorization.

## Locked pilot decision

Property Assistant is a **private, local-first second brain for a Property Advisor**, not another CRM.

The current supported loop is:

**Capture → Understand → Remember → Match → Follow up**

The current candidate supports **English UI + English typing only**. Voice, Tamil, Tanglish and multilingual UI/understanding are deliberately deferred. They are not exposed, packaged, permission-gated, marketed or required for pilot completion.

Deferral did not remove the future architecture:

- domain records remain language-neutral;
- review-before-save remains the common capture contract;
- model/input adapters remain replaceable;
- matching, search, persistence, backup and follow-up contracts are input-language independent;
- dormant voice source remains outside the Android and desktop release bundles.

## rc.4 implementation

- Reworked Home around one prominent typed “What should I remember?” composer.
- Kept the complete typed second-brain workflow for requirements, properties, updates, rejections and reminders.
- Made Ask an English typed local-memory search with no voice controls and no empty-query memory dump.
- Redirected historical #/speak and #/language links to supported Type and Settings surfaces.
- Removed the Android microphone permission, speech runtime, permission lifecycle and voice bridge.
- Made Android deny WebView media permission requests and stage web assets with Gradle Sync, preventing stale voice files from surviving incremental builds.
- Excluded dormant voice files from Android and desktop packages; release verification now fails if an Android APK contains them.
- Added explicit compiled product-mode metadata for English typing and deferred capabilities.
- Preserved language-neutral storage and historical backup language keys so future reactivation does not require a domain migration.
- Persisted onboarding completion so first-time advisors see onboarding and returning advisors start on Home.
- Preserved Home-to-editor and Review-to-editor drafts; Cancel explicitly clears the unsaved draft.
- Restored common English/local place aliases directly in typed query normalization, without depending on voice code.
- Bumped the candidate to 0.11.0-rc.4.

## Review failure-and-repair loop

The first exact-head pass found one CI test issue: a new legacy-language regression compared the whole database before and after navigation, while normal app boot legitimately added a derived match. The test now compares source memory rather than derived matches.

Independent review then found:

1. **High product finding:** “Edit note” discarded the original capture.
2. **Medium QA finding:** typed Capture → Remember was not proven across page reload.
3. **Medium product finding:** returning users repeatedly saw Splash/Onboarding.
4. **Medium scope finding:** a required E2E scenario still used Tanglish.
5. **Medium code finding:** common typed place aliases were stranded in the excluded voice runtime.
6. **Low packaging finding:** Gradle Copy could retain stale voice assets after an incremental build.
7. **Low UX/docs findings:** empty Ask showed contradictory guidance and P10 documentation still named a removed Language baseline.

All were repaired. Three Tamil/Tanglish parser fixtures are retained as explicitly skipped, non-gating references; the active E2E capture fixture is English.

## Automated evidence

Exact repaired functional head: bfb4563aa814dd6590b3995ca381789554af3862.

### Quality Gates #436

Run 32622809337: terminal success.

- Detect repository stacks: pass.
- Harness integrity: pass.
- JS unit/lint/type checks: pass.
- 84 active unit tests passed; three multilingual-only references were explicitly skipped.
- Playwright desktop/mobile matrix: 101 passed; one intentional viewport-specific skip.
- Android lint, tests, build and debug APK: pass.
- Required gate summary: pass.

### Release Candidates #155

Run 32622809304: terminal success.

- Signed Android 0.11.0-rc.4 build and signature/content verification: pass.
- Explicit Android APK check for absent voice-core.js / voice-ui.js: pass.
- Desktop package build, loopback launcher smoke and archive verification: pass.
- Android and desktop artifacts uploaded: pass.

### Local verification

- python3 scripts/harness_check.py: pass.
- node --check web/*.js: pass.
- node --test tests/unit/*.test.mjs: 84 pass, three deferred skips, zero failures.
- git diff --check: pass.
- Packaged desktop RC smoke: pass.
- Packaged desktop candidate contains product-mode.js and omits both voice runtime files.

Local Android compilation could not use the managed workspace's read-only Gradle cache. Hosted Android CI compiled and tested the exact functional SHA successfully.

## Reviewer gates after repair

### Senior Code Reviewer — PASS

No Critical, High or Medium finding remains. The one Low architectural note is that PropertyAssistantProductMode describes the compiled release contract rather than acting as a one-switch runtime control plane. Wiring capability activation is intentionally deferred until voice/multilingual work returns.

### Senior QA Reviewer — PASS

No unresolved automated QA finding remains. Draft restoration, typed save/reload, onboarding-once behavior, English active fixtures, empty Ask, synchronized Android staging and voice-free APK verification are covered.

### Product/UX Guardrail Reviewer — PASS

The candidate is an English typed second brain, not a CRM. The core loop, local-first/privacy promises, returning-advisor simplicity and capability deferral all pass. Direct Call/WhatsApp actions on Ask/person cards remain a nonblocking later enhancement because Match and Follow-up screens already provide operational actions.

## Physical Android validation still required

On a representative approximately 4 GB Android phone:

1. Install and launch the 0.11.0-rc.4 APK.
2. Complete onboarding, force-stop/relaunch, and confirm returning launch opens Home.
3. Type an English requirement, review it, choose Edit note, and confirm the full draft returns.
4. Save the requirement, relaunch, and confirm the person/requirement remains.
5. Save compatible property supply and confirm an explained automatic match.
6. Create/complete a follow-up.
7. Confirm keyboard editing, status-bar inset and bottom-navigation spacing.
8. Confirm install/update and normal use never request microphone permission.
9. Exercise camera/gallery, location denial, encrypted backup export/restore, Call, WhatsApp and Share.

## Historical rc.1/rc.2 context

The earlier rc.1 physical test exposed system-inset, keyboard, microphone and parsing defects. rc.2 repaired those historical findings, but the current product decision supersedes its voice/multilingual device gate. rc.4 retains the safe-area/parser improvements while removing voice and multilingual surfaces from the active pilot.

## Next gate

Run both workflows on the state/handoff documentation commit, provide the retained rc.4 artifacts, then perform the physical Android checklist above. After device confirmation, run the approximately five-advisor pilot checklist. Only then may P12 be marked pilot-ready or merge-ready, and PR #13 still requires explicit user authorization before merge.
