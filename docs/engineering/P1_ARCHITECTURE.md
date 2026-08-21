# P1 Architecture — Application Shell

## Decision

P1 uses a dependency-light HTML/CSS/JavaScript application shell as the shared presentation layer. The desktop development surface runs locally with `npm run dev`; Android hosts the exact same local `web/` assets inside a minimal native WebView activity.

This is an intentional P1 choice, not a permanent ban on a richer framework. Introduce a framework only when later phase complexity proves it is necessary.

## Why this fits Property Assistant

- One UI/navigation implementation for desktop-compatible web and Android shell behavior.
- Very low baseline memory and package-size overhead for the approximately 4 GB Android target class.
- No server is required in the Android app; assets load from the APK.
- No Android Internet permission is requested by the P1 wrapper.
- Playwright can exercise the same screen hierarchy and interaction contract used by Android.
- Domain storage, matching and AI remain separate later-phase concerns; the shell contains no fake model dependency.

## P1 boundaries

The shell wires every approved route and primary action, but intentionally does not simulate completed business workflows. Type capture starts in P3, voice in P4, matching in P5, poster OCR in P7, and backup/restore in P9.

Display language and input/speech language are stored under separate preference keys. P1 includes English, Tamil and Tanglish display examples solely to prove UI switching behavior; this does not claim production language intelligence quality.

## Android wrapper

`gradlew` is a small bootstrap launcher that pins Gradle 8.9 and invokes the Android project. The Android Gradle build copies `web/` into APK assets before build. `MainActivity` enables only JavaScript and DOM storage required by the shell and loads `file:///android_asset/index.html`.

## Desktop path

P1 desktop execution is the local web-compatible shell served only on loopback. Packaged desktop release infrastructure belongs to P11; business logic must remain platform-neutral so a native desktop container can wrap the same application without rewriting domain behavior.
