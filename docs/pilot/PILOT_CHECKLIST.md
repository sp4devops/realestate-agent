# Property Assistant Pilot Checklist

This checklist is for a small pilot of approximately five Property Advisors. The basic pilot must be runnable without developer intervention.

## Before giving the app to a Property Advisor

1. Use the P11 Android RC APK or desktop RC package from the retained Release Candidates artifact.
2. Confirm the app opens to Property Assistant and the primary navigation works.
3. Explain that pilot data is stored locally on the device. Do not enter sensitive real customer data until the advisor understands backup/export and the current pilot limitations.
4. Open Settings & Backup. Create one encrypted backup with a password chosen by the advisor and store the backup file separately from the device.
5. Tell the advisor that the backup password cannot be recovered. Losing both the device data and the password can make the backup unusable.
6. Set display language independently from the advisor's preferred speech/input language.
7. Use `docs/pilot/DEMO_DATA.json` and the demo capture examples below for the first guided run.

## 15-minute independent basic-flow run

The Property Advisor should be able to do these without developer help:

- Type & Save a buyer requirement.
- Type & Save a property/owner note.
- Review and correct extracted fields before save.
- Open People and inspect a saved person.
- Open Matches and inspect why a requirement/property match was suggested.
- Search/Ask for locally stored information.
- Create or complete a follow-up.
- Switch display language and verify saved business data did not change.
- Create an encrypted backup.

Suggested capture examples:

- `Ravi wants land in Erode budget 25 lakh phone 9876543219`
- `Murugan selling land in Erode price 24 lakh phone 9876543218`
- `Meena wants house in Salem budget 45 lakh phone 9876543217`

## End-of-session checks

- Ask the advisor to create a fresh encrypted backup.
- Record any task they could not complete without help.
- Record wrong extraction, wrong match, confusing labels, slow screens, crashes, data loss, permission failures, and language issues using `FEEDBACK_TEMPLATE.md`.
- If data appears corrupted or a pilot must be reset, follow `RECOVERY_AND_ROLLBACK.md` before deleting anything.
- Review `KNOWN_LIMITATIONS.md` before treating a limitation as a new defect.

## Pilot success criteria

The pilot is ready to expand only when approximately five Property Advisors can complete the basic-flow run without developer intervention, no unresolved Critical/High defect exists, backup/recovery is understood, and feedback can be reproduced from the recorded steps.