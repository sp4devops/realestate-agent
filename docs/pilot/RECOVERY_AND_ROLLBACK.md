# Pilot Recovery and Rollback

Use this before deleting app data, reinstalling, or moving to another device.

## Normal recovery

1. Stop entering new records on the affected device.
2. Note the app version, platform, last successful action and the exact symptom.
3. If the app can still open, create a fresh encrypted backup before making changes.
4. Keep the previous known-good backup; do not overwrite the only copy.
5. Reproduce with synthetic/demo data when possible.
6. Restore the known-good encrypted backup and verify People, Properties, Matches and Follow-ups before resuming the pilot.

## Corrupt or wrong backup

- Do not repeatedly import a file that the app rejects as corrupt, wrong-password or unsupported.
- Confirm the backup file and password belong together.
- Preserve the rejected file for debugging; do not publish it in an issue if it contains real customer data.
- Restore the last known-good backup instead.

## Rollback to previous release candidate

1. Export/retain a backup before uninstalling or changing versions whenever the current app can still do so safely.
2. Install the last known-good release candidate for the same pilot platform.
3. Restore only through the supported Settings & Backup flow.
4. Verify core records and one known match before entering new data.
5. Record the failed version and reproduction steps in `FEEDBACK_TEMPLATE.md`.

## Stop conditions

Stop the affected pilot immediately for data loss, privacy leakage, unrecoverable corruption, app launch failure, unusable core Capture → Understand → Remember → Match → Act flow, or backup/restore failure. These are Critical/High until investigated.