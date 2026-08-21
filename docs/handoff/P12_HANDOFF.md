# P12 Handoff — Property Advisor Pilot Readiness

## Current status

P12 is **not merge-ready yet**. The original `0.11.0-rc.1` passed hosted CI but real Android testing exposed device-specific pilot blockers. Those defects are repaired in `0.11.0-rc.2` and the repaired functional HEAD is fully green in hosted CI; physical-device re-test of rc.2 remains mandatory before QA can return to PASS.

## Pilot kit scope

P12 includes a self-service pilot kit for approximately five Property Advisors:

- `docs/pilot/PILOT_CHECKLIST.md` — setup, independent 15-minute basic-flow run, end-of-session checks and pilot success criteria.
- `docs/pilot/DEMO_DATA.json` — synthetic domain dataset with people, requirements, property supply, interaction, follow-up and a known match.
- `docs/pilot/PILOT_ONBOARDING.md` — privacy, display-vs-input language, permissions and encrypted-backup onboarding.
- `docs/pilot/FEEDBACK_TEMPLATE.md` — reproducible session, issue and product feedback capture.
- `docs/pilot/KNOWN_LIMITATIONS.md` — explicit RC, device, STT/OCR, backup and scope limitations.
- `docs/pilot/RECOVERY_AND_ROLLBACK.md` — backup-first recovery, corrupt backup handling, RC rollback and stop conditions.
- `tests/unit/pilot-kit.test.mjs` — verifies required pilot guidance exists and the synthetic dataset has internally consistent references.

## rc.1 physical-device findings

User testing of `0.11.0-rc.1` on Android invalidated the earlier merge-ready assessment. Screenshots showed:

1. Android status bar overlapping the app header.
2. Bottom navigation colliding with the Android system navigation area and keyboard.
3. Internal engineering copy such as `Phase-owned workflow` exposed on splash/onboarding.
4. Speak & Save failing to start the microphone.
5. The exact note `Tsk wants 5 acre in perundurai` being misparsed: `Perundurai` was partially consumed as the Tanglish `peru` name marker and locality/land/size extraction was incomplete.
6. Review-form usability degrading while the software keyboard was visible.

These are treated as real QA evidence even though the preceding hosted workflows were green.

## rc.2 repairs

`0.11.0-rc.2` includes:

- Android system-bar inset handling through `WindowCompat`/`WindowInsetsCompat` plus `adjustResize` for the software keyboard.
- Safe-area-aware fixed navigation and keyboard-open navigation suppression in the web shell.
- `WebViewAssetLoader` secure local origin instead of direct `file://` loading.
- A permission-minimal Android on-device `SpeechRecognizer` bridge using `createOnDeviceSpeechRecognizer` and `EXTRA_PREFER_OFFLINE`; the manifest deliberately does not request Internet permission.
- User-facing removal of phase/development placeholder copy.
- Parser correction so Tanglish `peru` only matches as a standalone name marker.
- Perundurai/Bhavani/Chithode locality support, acreage/cent/sqft size parsing, acreage implying land, and size retained through review/save.
- Exact regression coverage for `Tsk wants 5 acre in perundurai` and structural device-pilot regressions for safe areas, keyboard behavior, user-facing copy and native speech bridge.

## rc.2 hosted CI evidence

Exact repaired functional HEAD: `025930d74e85187e72b23129ddf9f328ec10920e`.

- Quality Gates #334 / run `32532219717`: terminal success.
  - Harness integrity: pass.
  - JS unit/lint/type checks: pass.
  - Exact Perundurai/5-acre regression: pass.
  - Device-pilot structural regression tests: pass.
  - Playwright E2E: pass.
  - Android unit/build/debug APK: pass.
  - Required gate summary: pass.
- Release Candidates #53 / run `32532219709`: terminal success.
  - signed Android rc.2 build: pass.
  - Android signature and embedded asset verification: pass.
  - desktop RC build/packaged smoke/archive verification: pass.
  - retained Android and desktop RC artifacts: pass.

A temporary intermediate failure correctly caught an unnecessary Internet permission and another caught voice-evidence metric replacement. Both were repaired before the rc.2 functional green head above.

## Reviewer gates

### Senior Code Reviewer — PASS

The repair keeps the application permission-minimal and local-first. Android speech uses the platform on-device recognizer when available; no Internet permission or remote service was introduced. System-bar/keyboard handling, secure local asset origin, parser changes and size persistence have regression coverage. No Critical/High code finding remains.

### Senior QA Reviewer — PENDING PHYSICAL DEVICE RETEST

Hosted Quality Gates and Release Candidates pass. However, the original defects were discovered only on a physical Android device, so hosted CI is insufficient evidence for closure. Before P12 is called pilot-ready, rc.2 must be re-tested on the same class of device for:

- status bar/header separation;
- bottom nav/system navigation separation;
- keyboard editing without nav collision;
- Speak & Save microphone permission/start/stop/transcript behavior;
- exact `Tsk wants 5 acre in perundurai` review output.

### Product/UX Guardrail Reviewer — PASS

User-facing engineering placeholder copy is removed. Property Advisor terminology, local-first/private-by-default behavior, display-vs-input language independence and Capture → Understand → Remember → Match → Act remain intact. No CRM/ERP/cloud/marketplace scope was introduced.

## Remaining constraints

- Android on-device speech availability and Tamil/Tanglish recognition quality depend on the speech recognizer installed on the physical phone. The bridge compiles and is structurally tested, but device behavior must be confirmed.
- CI Android APKs use an ephemeral test signing key; production distribution requires a persistent protected signing key.
- Production OCR runtime and representative ~4 GB Android memory/thermal benchmarking remain broader-release constraints.
- Desktop RC currently requires Python 3.9+ and uses a loopback-only system-browser launcher.

## Next gate

Run both Quality Gates and Release Candidates on the exact documentation HEAD, provide the resulting `0.11.0-rc.2` APK, and perform physical-device re-test. Only after the device defects are confirmed fixed should QA be changed back to PASS and PR #13 be considered merge-ready. A fresh explicit user authorization is still required before merge.
