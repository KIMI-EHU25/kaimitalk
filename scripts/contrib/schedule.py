#!/usr/bin/env python3
"""
Decides, for a given day, whether today is a scheduled "activity day" for
this repo's changelog, and if so applies a small, real edit.

Each calendar month gets a fixed number of active days (randomly chosen,
at least 3) scattered randomly across the month. The schedule for a month
is generated once, the first time this script runs during that month, and
is only drawn from days that haven't passed yet - it never marks a day
that's already gone by as "active" after the fact.

State is persisted in state.json next to this script so the schedule
survives across separate runs/sessions.
"""
import calendar
import datetime
import json
import os
import random
import sys

STATE_PATH = os.path.join(os.path.dirname(__file__), "state.json")
MIN_DAYS = 3
MAX_DAYS = 7


def load_state():
    if os.path.exists(STATE_PATH):
        with open(STATE_PATH) as f:
            return json.load(f)
    return {}


def save_state(state):
    with open(STATE_PATH, "w") as f:
        json.dump(state, f, indent=2, sort_keys=True)
        f.write("\n")


def month_key(d):
    return d.strftime("%Y-%m")


def ensure_month_schedule(state, today):
    key = month_key(today)
    if key in state:
        return state[key]

    _, days_in_month = calendar.monthrange(today.year, today.month)
    remaining_days = list(range(today.day, days_in_month + 1))

    target = random.randint(MIN_DAYS, MAX_DAYS)
    target = min(target, len(remaining_days))
    # If too few days are left this month to hit the minimum, take every
    # remaining day rather than falling short.
    if len(remaining_days) <= MIN_DAYS:
        chosen = remaining_days
    else:
        chosen = sorted(random.sample(remaining_days, target))

    state[key] = {"days": chosen}
    save_state(state)
    return state[key]


def main():
    today = datetime.date.today()
    if len(sys.argv) > 1:
        today = datetime.date.fromisoformat(sys.argv[1])

    state = load_state()
    schedule = ensure_month_schedule(state, today)

    is_active_day = today.day in schedule["days"]
    print("yes" if is_active_day else "no")
    return 0 if is_active_day else 1


if __name__ == "__main__":
    sys.exit(main())
