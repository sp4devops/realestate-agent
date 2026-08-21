# Changelog

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
