#!/usr/bin/env bash
set -euo pipefail

# Blocking GitHub Actions watcher for AI/human agents.
# Usage: scripts/ci_wait.sh [commit-sha]
# Requires: git, gh authenticated for this repository.

SHA="${1:-$(git rev-parse HEAD)}"
REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
MAX_DISCOVERY_ATTEMPTS="${CI_DISCOVERY_ATTEMPTS:-30}"
DISCOVERY_SLEEP_SECONDS="${CI_DISCOVERY_SLEEP_SECONDS:-10}"

echo "CI gate: repository=$REPO commit=$SHA"

discover_run() {
  gh run list \
    --repo "$REPO" \
    --commit "$SHA" \
    --limit 20 \
    --json databaseId,status,conclusion,event,workflowName,headSha,createdAt \
    --jq 'sort_by(.createdAt) | reverse | .[0] // empty'
}

RUN_JSON=""
for ((i=1; i<=MAX_DISCOVERY_ATTEMPTS; i++)); do
  RUN_JSON="$(discover_run)"
  if [[ -n "$RUN_JSON" ]]; then
    break
  fi
  echo "CI gate: no run discovered yet for $SHA ($i/$MAX_DISCOVERY_ATTEMPTS)"
  sleep "$DISCOVERY_SLEEP_SECONDS"
done

if [[ -z "$RUN_JSON" ]]; then
  echo "CI gate: ERROR — no GitHub Actions run found for current commit $SHA" >&2
  echo "Do not advance the task or phase. Check workflow triggers/actions permissions." >&2
  exit 2
fi

RUN_ID="$(jq -r '.databaseId' <<<"$RUN_JSON")"
WORKFLOW="$(jq -r '.workflowName' <<<"$RUN_JSON")"
EVENT="$(jq -r '.event' <<<"$RUN_JSON")"

echo "CI gate: watching run=$RUN_ID workflow=$WORKFLOW event=$EVENT"

# gh run watch blocks until the run reaches a terminal state.
set +e
gh run watch "$RUN_ID" --repo "$REPO" --exit-status
WATCH_STATUS=$?
set -e

if [[ $WATCH_STATUS -ne 0 ]]; then
  echo "CI gate: FAILED — printing failed job logs" >&2
  gh run view "$RUN_ID" --repo "$REPO" --log-failed || true
  echo "CI gate: fix the root cause, push a new commit, then run this watcher again." >&2
  exit $WATCH_STATUS
fi

CONCLUSION="$(gh run view "$RUN_ID" --repo "$REPO" --json conclusion --jq .conclusion)"
if [[ "$CONCLUSION" != "success" ]]; then
  echo "CI gate: ERROR — terminal conclusion is $CONCLUSION, not success" >&2
  exit 3
fi

echo "CI gate: GREEN — run $RUN_ID succeeded for commit $SHA"
