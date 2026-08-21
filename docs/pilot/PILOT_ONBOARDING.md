# Pilot Onboarding — Privacy, Language and Backup

Use this script/checklist with every Property Advisor before the first real pilot session.

## What the advisor should understand

- Property Assistant is local-first. Core records, search, matching and follow-ups are designed to work without a cloud account or paid AI API.
- Display language and speech/input language are separate choices. Changing the UI language must not change saved business records.
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
- Local STT/OCR accuracy is not guaranteed across every device/accent/poster.
- The approximately 4 GB Android target still requires representative physical-device benchmarking before broader release.