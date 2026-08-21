# Agent Execution Loop

This loop is mandatory for every implementation task and every phase. An AI agent must not treat `git push` as completion.

## Required control loop

1. Read `PROJECT_STATE.yaml` and choose only the current highest-priority unfinished task.
2. Implement the smallest coherent change.
3. Run the narrow local tests available for the change.
4. Commit and push the change to the active branch.
5. Discover the GitHub Actions workflow run associated with the pushed commit / open PR.
6. Poll the workflow until the relevant run reaches a terminal `completed` state. A queued or in-progress workflow is not evidence of success.
7. Inspect every required job result.
8. If any required job is `failure`, `cancelled`, `timed_out`, `action_required`, `stale`, or otherwise non-successful:
   - inspect the failed job steps and logs;
   - identify root cause;
   - fix the smallest correct layer;
   - add or improve a regression test when practical;
   - commit and push the fix;
   - return to step 5 and repeat.
9. If workflow discovery returns no run/checks, treat CI as **missing/unverified**, not green. Investigate workflow trigger/configuration before advancing.
10. Only when all required jobs for the current commit are terminal and successful may the agent run the three review gates: code review, QA review, and product-guardrail review.
11. Resolve every Critical/High finding and repeat the test/CI loop after fixes.
12. Update `PROJECT_STATE.yaml` with the last observed green commit SHA, workflow/run evidence, review results, and next action. The state-update commit itself may be newer than `last_verified_commit`; live CI for the current PR HEAD remains authoritative for merge/advance decisions.
13. Advance to the next task or phase only after the current phase's acceptance criteria and Definition of Done are satisfied.

## Hard rule: do not advance

The agent must **do not advance** to the next implementation task/phase while any of these are true:

- the latest relevant workflow is queued or in progress;
- the latest relevant workflow failed;
- required checks are missing;
- the workflow result belongs to an older implementation/build commit rather than the code being evaluated;
- required E2E/unit/integration tests have not run;
- Critical or High review findings remain open;
- CI evidence cannot be tied to the code under review.

## CI state model

Use these states in `PROJECT_STATE.yaml`:

- `not_started` — no push requiring validation yet.
- `waiting` — pushed; run is queued/in progress.
- `failed` — terminal required run/check failed.
- `missing` — no relevant run/check can be found for current HEAD.
- `green` — all required checks for the evaluated code are successful.
- `blocked` — external/tool/platform constraint prevents validation.

Only `green` plus green review gates permits phase advancement. Immediately before merge, inspect live CI for the exact current PR HEAD; do not rely only on the state file.

## Failure loop

The expected loop is:

`implement → local test → push → discover CI → poll → completed? → inspect → failure? → logs → fix → regression test → push → repeat`

When successful:

`CI green → code review → QA review → product review → fix findings if any → CI loop again → state/handoff update → verify final PR HEAD CI → next task/merge`

## Tool/environment limitation

If the active AI environment cannot poll a run continuously or cannot access logs, it must not pretend to wait or claim green. It must record `ci_gate.status: blocked` or `missing`, include the exact limitation, and stop phase advancement. A later session with the required capability resumes from that state.
