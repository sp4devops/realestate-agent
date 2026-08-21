# Pilot Known Limitations

These are known pilot constraints, not promises of production behavior.

- Android CI release candidates are signed with an ephemeral RC key. Production distribution requires a persistent protected signing key.
- Desktop RC uses Python 3.9+ and the system browser through a loopback-only `127.0.0.1` launcher; a native desktop executable is not yet required for pilot validation.
- Production local STT and OCR runtimes/weights still require final packaging and representative-device benchmarking.
- Approximately 4 GB Android target-device memory, thermal and startup behavior has not yet been physically validated across representative devices.
- Low-storage/quota exhaustion and interruption during multi-store backup/restore remain device-runtime risks to exercise during pilot hardening.
- Large image-heavy encrypted backups can create transient memory pressure.
- Deterministic locality/query vocabulary is intentionally a starter set and should expand from real pilot language.
- Nearby-locality knowledge and negotiability handling are not comprehensive.
- Unrestricted cellular call recording is not supported or assumed.
- Backup passwords are intentionally unrecoverable.
- No cloud sync, marketplace, CRM/ERP or multi-user collaboration is part of the current pilot.

Any crash, data loss, privacy leak, unusable core capture/search/match flow, or backup/restore failure should be treated as Critical/High and block pilot expansion.