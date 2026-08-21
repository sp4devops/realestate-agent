#!/usr/bin/env python3
"""Zero-dependency integrity checks for the Property Assistant AI harness."""
from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "AGENTS.md",
    "PROJECT_STATE.yaml",
    "docs/product/PRODUCT_GUARDRAILS.md",
    "docs/engineering/DELIVERY_PHASES.md",
    "docs/engineering/AGENT_EXECUTION_LOOP.md",
    "docs/qa/QUALITY_GATES.md",
    "docs/handoff/HANDOFF_LOG.md",
    "scripts/ci_wait.sh",
]

REQUIRED_AGENT_TERMS = [
    "Session bootstrap",
    "Definition of Done",
    "Failure protocol",
    "State and handoff discipline",
    "Security/privacy rules",
    "AI/model architecture rules",
    "CI completion loop",
]

REQUIRED_GUARDRAILS = [
    "Capture",
    "Understand",
    "Remember",
    "Match",
    "Act",
    "local-first",
    "Tamil",
    "English",
    "Tanglish",
    "4 GB",
    "Android",
    "Desktop",
    "not a generic CRM",
]


def fail(message: str, errors: list[str]) -> None:
    errors.append(message)


def normalize(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def contains_normalized(haystack: str, needle: str) -> bool:
    return normalize(needle) in normalize(haystack)


def main() -> int:
    errors: list[str] = []

    for rel in REQUIRED_FILES:
        path = ROOT / rel
        if not path.is_file():
            fail(f"missing required harness file: {rel}", errors)
        elif path.stat().st_size == 0:
            fail(f"required harness file is empty: {rel}", errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    agents = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
    for term in REQUIRED_AGENT_TERMS:
        if not contains_normalized(agents, term):
            fail(f"AGENTS.md missing contract section/term: {term}", errors)

    guardrails = (ROOT / "docs/product/PRODUCT_GUARDRAILS.md").read_text(encoding="utf-8")
    for term in REQUIRED_GUARDRAILS:
        if not contains_normalized(guardrails, term):
            fail(f"product guardrails missing locked concept: {term}", errors)

    state = (ROOT / "PROJECT_STATE.yaml").read_text(encoding="utf-8")
    required_state_patterns = {
        "schema_version": r"(?m)^schema_version:\s*\d+\s*$",
        "active_phase": r"(?m)^active_phase:\s*P\d+\s*$",
        "last_verified_commit": r"(?m)^last_verified_commit:\s*\S+\s*$",
        "next_actions": r"(?m)^next_actions:\s*$",
        "blockers": r"(?m)^blockers:\s*",
        "ci_gate": r"(?m)^ci_gate:\s*$",
    }
    for name, pattern in required_state_patterns.items():
        if not re.search(pattern, state):
            fail(f"PROJECT_STATE.yaml missing/invalid required field: {name}", errors)

    phases = (ROOT / "docs/engineering/DELIVERY_PHASES.md").read_text(encoding="utf-8")
    for phase in range(13):
        if f"P{phase}" not in phases:
            fail(f"delivery phases missing P{phase}", errors)

    qa = (ROOT / "docs/qa/QUALITY_GATES.md").read_text(encoding="utf-8")
    for required in ["Playwright", "Critical", "High", "offline", "backup", "restore"]:
        if not contains_normalized(qa, required):
            fail(f"quality gates missing concept: {required}", errors)

    loop_doc = (ROOT / "docs/engineering/AGENT_EXECUTION_LOOP.md").read_text(encoding="utf-8")
    for required in ["push", "poll", "completed", "failure", "fix", "repeat", "do not advance"]:
        if not contains_normalized(loop_doc, required):
            fail(f"agent execution loop missing concept: {required}", errors)

    ci_wait = (ROOT / "scripts/ci_wait.sh").read_text(encoding="utf-8")
    for required in ["gh run watch", "exit-status", "log-failed", "do not advance"]:
        if not contains_normalized(ci_wait, required):
            fail(f"CI watcher missing blocking/failure behavior: {required}", errors)

    forbidden_placeholders = ["TODO: define core product", "TBD product scope", "lorem ipsum"]
    joined = "\n".join([agents, guardrails, state, phases, qa, loop_doc, ci_wait])
    for placeholder in forbidden_placeholders:
        if contains_normalized(joined, placeholder):
            fail(f"unresolved harness placeholder found: {placeholder}", errors)

    if errors:
        print("Property Assistant harness check: FAIL")
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print("Property Assistant harness check: PASS")
    print(f"Validated {len(REQUIRED_FILES)} required files, state contract, phases, blocking CI loop, and QA guardrails.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
