#!/usr/bin/env bash
# Decides whether today gets an activity-log commit.
#
# Goal: contributions land on random days throughout the month instead of
# every day, but every calendar month ends up with at least MIN_DAYS of
# activity. We derive "how many days this month already have a commit"
# from git history (no extra state file needed), then force today's commit
# once the days remaining in the month can no longer cover the shortfall.
set -euo pipefail

LOG_FILE="activity.log"
MIN_DAYS=3
BASE_CHANCE=35 # percent chance on a non-forced day

TODAY=$(date -u +%Y-%m-%d)
MONTH_START=$(date -u +%Y-%m-01)
DAY_OF_MONTH=$(date -u +%-d)
DAYS_IN_MONTH=$(date -u -d "${MONTH_START} +1 month -1 day" +%-d)
REMAINING_DAYS=$((DAYS_IN_MONTH - DAY_OF_MONTH + 1))

COMMITS_THIS_MONTH=$(git log --oneline --since="${MONTH_START}" --until="${TODAY} 23:59:59" --grep="^chore(activity)" | wc -l | tr -d ' ')
REMAINING_NEEDED=$((MIN_DAYS - COMMITS_THIS_MONTH))

FORCE=0
if [ "${REMAINING_NEEDED}" -gt 0 ] && [ "${REMAINING_NEEDED}" -ge "${REMAINING_DAYS}" ]; then
  FORCE=1
fi

ROLL=$((RANDOM % 100))
SHOULD_COMMIT=0
if [ "${FORCE}" -eq 1 ]; then
  SHOULD_COMMIT=1
elif [ "${ROLL}" -lt "${BASE_CHANCE}" ]; then
  SHOULD_COMMIT=1
fi

if [ "${SHOULD_COMMIT}" -eq 0 ]; then
  echo "Skipping ${TODAY} (roll=${ROLL}, already ${COMMITS_THIS_MONTH}/${MIN_DAYS} this month, ${REMAINING_DAYS} day(s) left)."
  exit 0
fi

echo "- ${TODAY}" >> "${LOG_FILE}"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add "${LOG_FILE}"
git commit -m "chore(activity): log ${TODAY}"
echo "committed=true" >> "${GITHUB_OUTPUT:-/dev/null}"
