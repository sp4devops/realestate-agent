#!/usr/bin/env bash
set -euo pipefail
VERSION=8.9
CACHE="${HOME}/.cache/property-assistant-gradle"
DIST="${CACHE}/gradle-${VERSION}"
if [ ! -x "${DIST}/bin/gradle" ]; then
  mkdir -p "$CACHE"
  ZIP="${CACHE}/gradle-${VERSION}-bin.zip"
  if [ ! -f "$ZIP" ]; then
    curl -fsSL "https://services.gradle.org/distributions/gradle-${VERSION}-bin.zip" -o "$ZIP"
  fi
  rm -rf "$DIST"
  unzip -q "$ZIP" -d "$CACHE"
fi
exec "${DIST}/bin/gradle" -p android "$@"
