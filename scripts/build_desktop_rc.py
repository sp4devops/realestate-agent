#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / "VERSION").read_text(encoding="utf-8").strip()


def build(out_dir: Path) -> tuple[Path, Path]:
    package_dir = out_dir / f"PropertyAssistant-{VERSION}-desktop"
    zip_base = out_dir / f"PropertyAssistant-{VERSION}-desktop"
    if package_dir.exists():
        shutil.rmtree(package_dir)
    package_dir.mkdir(parents=True, exist_ok=True)
    shutil.copytree(ROOT / "web", package_dir / "web")
    shutil.copy2(ROOT / "desktop" / "launcher.py", package_dir / "launcher.py")
    (package_dir / "START_HERE.txt").write_text(
        "Property Assistant desktop release candidate\n\n"
        "Requirements: Python 3.9+ installed locally.\n"
        "Run: python3 launcher.py\n"
        "The app binds only to 127.0.0.1 and opens in your default browser.\n"
        "Your core Property Assistant data remains local to this computer.\n",
        encoding="utf-8",
    )
    archive = Path(shutil.make_archive(str(zip_base), "zip", root_dir=package_dir))
    return package_dir, archive


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="dist")
    args = parser.parse_args()
    package_dir, archive = build(ROOT / args.out)
    print(package_dir)
    print(archive)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
