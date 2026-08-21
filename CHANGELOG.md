# Changelog

## 0.11.0-rc.2 — 2026-08-22

Device-pilot repair candidate after real Android testing of rc.1.

- Fixed Android status/navigation inset handling and keyboard overlap for the WebView shell.
- Replaced fragile Android WebView microphone capture with the platform on-device speech recognizer when the device provides it; no Internet permission was added.
- Removed internal phase/development placeholder copy from splash, onboarding and generic user-facing screens.
- Fixed typed-note extraction where `Perundurai` could be mistaken for the Tanglish `peru` name marker.
- Added Perundurai and nearby Erode localities plus acreage/cent/sqft size extraction; `5 acre` now implies land and is retained through review/save.
- Added regression coverage derived from real-device pilot failures.

### Release-candidate limitations

- CI Android APKs use an ephemeral test signing key and are for install/smoke validation only. Production distribution must use a persistent private signing key supplied through protected secrets.
- Android on-device speech availability and language quality depend on the speech recognizer installed on the physical phone; the native bridge is build/test verified, but physical-device voice behavior still requires pilot confirmation.
- Desktop RC requires Python 3.9+ and opens the local app in the system browser.
- Production OCR runtime and representative approximately 4 GB Android memory/thermal benchmarking remain broader-release constraints.

## 0.11.0-rc.1 — 2026-08-22

First formal Property Assistant release candidate.

- Android release build with configurable signing and retained installable APK artifact.
- Desktop local release-candidate ZIP with a zero-dependency Python loopback launcher.
- Core Capture → Understand → Remember → Match → Act workflows from P0–P10.
- Tamil, English and Tanglish product-language architecture with local-first/private-by-default behavior.
- Encrypted local backup/restore, settings/privacy controls, offline/no-model coverage, accessibility hardening and critical-screen visual baselines.

### Release-candidate limitations

- CI Android APKs use an ephemeral test signing key and are for install/smoke validation only. Production distribution must use a persistent private signing key supplied through protected secrets.
- Desktop RC requires Python 3.9+ and opens the local app in the system browser; native desktop executable packaging is not yet required for pilot validation.
- Production local STT/OCR runtimes and target-device memory/thermal benchmarking remain explicit pre-pilot/release constraints.
