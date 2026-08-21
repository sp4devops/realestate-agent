# P11 Handoff — Release candidates

## Status

P11 is functionally complete on PR #12 (`ai/p11-release-candidates`) and awaiting final documentation-head dual-workflow verification plus explicit merge authorization.

## Release candidate version

`0.11.0-rc.1`

## Implemented

- Added `VERSION` and `CHANGELOG.md` for formal RC versioning and limitations.
- Android release build reads version from `VERSION` and supports configurable signing through protected environment variables or Gradle properties.
- No private production signing key is stored in the repository.
- Release Candidates CI creates a short-lived ephemeral RC signing key, builds `app-release.apk`, verifies the APK cryptographic signature with `apksigner`, and verifies `assets/index.html` is packaged.
- Added zero-dependency desktop launcher that binds only to `127.0.0.1`, serves the packaged local web app, opens the system browser, and provides a `--smoke` self-check.
- Added deterministic desktop RC ZIP builder and package instructions.
- Release Candidates CI builds/smokes the packaged desktop candidate, verifies archive contents, and retains both Android and desktop artifacts.

## Functional exact-head evidence

Functional/reviewer HEAD: `f4f8bcac2f60c22707ffbc6c523feec50c24bde9`

### Quality Gates #287

Run `32524976973`: terminal success.

Passed:
- Detect repository stacks
- Harness integrity (`python3 scripts/harness_check.py`)
- JS unit/lint/type checks
- Playwright E2E
- Android tests and debug APK build/upload
- Required gate summary

### Release Candidates #6

Run `32524976982`: terminal success.

Passed:
- ephemeral RC signing-key generation
- signed Android release APK build
- `apksigner verify --verbose`
- embedded `assets/index.html` verification
- desktop RC package build
- packaged desktop `--smoke` launch check
- desktop ZIP archive verification
- Android RC artifact upload
- desktop RC artifact upload

Retained artifacts on the functional HEAD:
- `property-assistant-android-rc`
- `property-assistant-desktop-rc`

## Reviewer gates

### Senior Code Reviewer — PASS

No Critical/High findings. Signing configuration is injectable, no persistent key is committed, versioning is centralized, desktop packaging is deterministic, and the launcher is loopback-only/local-first.

### Senior QA Engineer — PASS

No Critical/High findings. Both required workflows are terminal green and directly verify the release artifacts. Android install/launch is not emulator-tested because the current CI gate does not provision an emulator; APK build/signature/content integrity are verified. Desktop packaged launch is smoke-tested from the produced RC directory.

### Product/UX Guardrail Reviewer — PASS

No Critical/High findings. P11 packages existing Android/desktop product surfaces without adding accounts, cloud sync, marketplace/CRM behavior, or paid dependencies. The core Capture → Understand → Remember → Match → Act product model is unchanged.

## Known release-candidate constraints

- CI Android APK uses an ephemeral test signing certificate and is not suitable as the persistent production distribution key. Production rollout must use a protected stable signing key.
- Desktop RC requires Python 3.9+ and opens the local app in the system browser instead of shipping a native executable.
- Production local STT/OCR runtime packaging and approximately 4 GB Android target-device memory/thermal benchmarking remain explicit pre-pilot constraints.

## Final gate

The state/handoff documentation commits move the PR HEAD beyond the verified functional commit. Both Quality Gates and Release Candidates must complete successfully on the exact final PR HEAD before PR #12 can be considered merge-ready. Do not merge without explicit user authorization.
