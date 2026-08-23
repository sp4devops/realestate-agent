# P10 Quality Plan — Performance, accessibility, resilience and offline QA

## Scope

P10 hardens the completed Property Assistant workflows without expanding product scope.

## Automated evidence

The P10 Playwright suite records and checks:

- DOMContentLoaded/load timing on the loopback-served app.
- Total encoded startup resource bytes.
- Chromium JS heap usage when exposed by the runtime.
- Browser storage usage/quota when exposed by the runtime.
- No unintended horizontal overflow across critical screens on desktop and mobile projects.
- Every visible button has an accessible name.
- Primary controls meet a 44 px minimum touch target.
- Keyboard focus is visibly indicated.
- Typed capture, persistence and navigation remain usable after the browser network is switched offline.
- The current English typing-only pilot exposes no microphone/STT control or Android audio permission.
- Desktop and mobile full-page screenshots are captured for Home, Type, Ask, Matches, People, Follow-ups, Poster, Language and Settings as the P10 visual baseline set.

CI retains `p10-artifacts/` inside the Playwright artifact. It contains project-specific runtime-metrics JSON and the critical-screen visual baseline PNGs. Metrics are also printed in the Playwright job log for direct evidence.

## Initial conservative CI guardrails

These are regression alarms rather than final device SLAs:

- DOMContentLoaded < 3000 ms in the CI loopback environment.
- Encoded startup resources < 2 MiB.
- Used JS heap < 128 MiB when Chromium exposes `performance.memory`.
- Browser storage usage < 20 MiB for the synthetic seeded baseline.

Real Android target-device measurements remain mandatory before release because CI browser metrics do not represent a 4 GB phone under memory/thermal pressure.

## Accessibility hardening

P10 guarantees visible keyboard focus and at least 44 px height for header language, brand/home, text actions, primary buttons, navigation, choices and capture controls. Semantic headings, navigation labels and field labels remain mandatory.

## Resilience risks to exercise before P11/P12

- low-storage / quota exhaustion during backup and poster-image writes;
- process interruption between localStorage and IndexedDB portions of restore;
- large image-heavy encrypted backups on approximately 4 GB Android devices;
- production local STT/OCR model memory, startup latency and thermal impact after concrete runtimes are selected;
- packaged desktop file import/export behavior.

None of those risks may be silently presented as verified by browser CI alone.
