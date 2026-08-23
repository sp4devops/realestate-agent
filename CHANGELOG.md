# Changelog

## 0.11.0-rc.6 — 2026-08-23

Focused physical-device repair for Android layout and poster OCR.

- Converted Android physical-pixel system-bar insets to CSS pixels before applying them to the WebView, removing the oversized status/navigation gaps seen on high-density phones.
- Added a bounded grayscale/high-contrast OCR retry when the first offline pass cannot find a valid Indian mobile number.
- Preserved more detail while preparing poster images for local OCR and accepted common phone punctuation.
- Added conservative recovery for OCR-confused phone characters. Recovered numbers are shown with an explicit check-before-save warning; ambiguous guesses remain blank.
- Added regression coverage for high-density insets, noisy poster numbers and the review warning.

### Remaining device gate

- Reinstall rc.6 and confirm the header/navigation spacing in both three-button and gesture modes.
- Retest the same poster plus one clear and one low-contrast poster; manually compare every recovered phone number before saving.

## 0.11.0-rc.5 — 2026-08-23

Pilot usability and real-device repair candidate for the English typed second brain.

- Added explicit same-name identity resolution using stable person IDs plus phone, role and area context, preventing silent merges based on a name alone.
- Added local Cursor-style completion to the Home and full Type composers; Tab or Right Arrow accepts suggested words, areas and common property-note phrases.
- Added offline area typeahead to requirement, property and poster review fields using built-in, remembered and pinned areas.
- Added pinned-area management and included pinned areas in encrypted backup/restore.
- Reworked Android system-bar inset delivery so the fixed app navigation stays above three-button and gesture navigation areas.
- Bundled the ML Kit Latin-script OCR model and connected it to the poster adapter for immediate offline English/phone-number recognition without Internet permission.
- Added a local image preview before poster save; on-device image OCR is Android-only while desktop keeps the typed-text fallback.

### Release-candidate limitations

- English typing is the supported capture/search mode. The bundled OCR model targets Latin-script poster text; Tamil OCR remains deferred with the broader multilingual work.
- OCR accuracy still depends on focus, lighting and text size; poster review and typed correction remain mandatory.
- Physical-device validation is still required for system insets, camera/gallery OCR, memory/thermal behavior and the full pilot checklist.
- CI Android APKs use an ephemeral test signing key and are for install/smoke validation only.

## 0.11.0-rc.4 — 2026-08-23

Focused pilot candidate for proving Property Assistant's second-brain loop with English typing only.

- Made the Home typing composer the single primary capture path.
- Kept Capture → Understand → Remember → Match → Act intact, including review-before-save, local persistence, automatic matches and follow-ups.
- Removed voice capture/search and multilingual controls from the active web, desktop and Android release surfaces.
- Removed Android microphone permission and native speech-recognizer code from this candidate.
- Preserved language-neutral domain records, replaceable extraction boundaries and explicit capability flags so voice and multilingual support can return later without redesigning storage.
- Updated pilot guidance and regression coverage for the reduced scope.

### Release-candidate limitations

- English typing is the only supported capture and search mode in this pilot candidate. Voice, Tamil and Tanglish are deferred, not promised or quality-gated here.
- CI Android APKs use an ephemeral test signing key and are for install/smoke validation only. Production distribution requires a persistent private signing key supplied through protected secrets.
- Desktop RC requires Python 3.9+ and opens the local app in the system browser.
- Production OCR runtime and representative approximately 4 GB Android memory/thermal benchmarking remain broader-release constraints.

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
