# Pilot Onboarding — Privacy, English Typing and Backup

Use this script/checklist with every Property Advisor before the first real pilot session.

The Splash and Onboarding screens are first-run guidance. After the advisor chooses Continue to Home, later launches on the same app data should open directly on Home.

## What the advisor should understand

- Property Assistant is local-first. Core records, search, matching and follow-ups are designed to work without a cloud account or paid AI API.
- This candidate supports English typing only. Voice, Tamil, and Tanglish are deferred while the core product loop is stabilized.
- If Review is wrong, Edit note must return the advisor's full original draft; saving must survive a relaunch.
- Business records are language-neutral so deferred language features can return later without rewriting saved data.
- The pilot should not be treated as permission to record cellular calls. After-call recap is a user-entered workflow; unrestricted call recording is not assumed.
- Poster capture may request camera/gallery and location-related permissions only when those features are used. Continuous location tracking is not part of the product.
- Communication buttons may open the phone dialer, WhatsApp or the operating-system share sheet. Those external apps have their own privacy behavior.

## Backup onboarding

1. Open Settings & Backup.
2. Choose a strong backup password that the advisor can retain securely.
3. Create an encrypted backup.
4. Save the exported backup somewhere separate from the device running Property Assistant.
5. Explain clearly: the backup password is not recoverable by Property Assistant.
6. Before relying on the backup, perform one restore rehearsal using only synthetic/demo data.
7. After meaningful pilot sessions, create a fresh backup before resetting, reinstalling or moving devices.

## Real-data rule for the pilot

Start with `DEMO_DATA.json` and the synthetic capture examples in `PILOT_CHECKLIST.md`. Move to real customer/property data only after the advisor has completed the backup rehearsal and understands the known limitations.

## What must never be promised

- Cloud synchronization is not part of the current pilot.
- A forgotten backup password cannot be recovered.
- Voice/STT is not part of this pilot candidate. OCR accuracy is not guaranteed across every device/poster.
- The approximately 4 GB Android target still requires representative physical-device benchmarking before broader release.
