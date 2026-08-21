# Property Assistant

Private, local-first AI memory and deal assistant for Property Advisors.

## Start here — every AI session

1. Read `AGENTS.md` completely.
2. Read `PROJECT_STATE.yaml` for the current phase, blockers, last verified commit, and next actions.
3. Read `docs/product/PRODUCT_GUARDRAILS.md` before making product or architecture decisions.
4. Read `docs/engineering/DELIVERY_PHASES.md` and work only on the active phase unless a blocker requires otherwise.
5. Run `python3 scripts/harness_check.py` before changing code and again before handoff.
6. Update `PROJECT_STATE.yaml` and append `docs/handoff/HANDOFF_LOG.md` before ending the session.

## Non-negotiable product loop

**Capture → Understand → Remember → Match → Act**

Voice is primary, not exclusive. The application must remain local-first, private by default, usable by non-technical Property Advisors, lightweight for approximately 4 GB Android devices, and functional for core workflows when an AI model is unavailable.

## Harness contract

No phase is complete because an agent says it is complete. A phase is complete only when its acceptance criteria are implemented, automated checks pass, evidence is recorded, QA/reviewer findings are closed, and `PROJECT_STATE.yaml` is advanced.

The harness is intentionally model-agnostic: ChatGPT, Codex, Claude, Gemini, Grok, Cursor agents, or another capable coding agent should be able to resume by reading repository state only.
