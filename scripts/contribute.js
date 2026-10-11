#!/usr/bin/env node
// Decides whether "today" is one of this month's randomly chosen contribution
// days and, if so, records it. Each calendar month gets its own random set of
// days (minimum 3) generated once and reused on every later run that month.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SCHEDULE_PATH = path.join(__dirname, 'contribution-schedule.json');
const LOG_PATH = path.join(__dirname, '..', 'CONTRIBUTIONS.md');

const MIN_DAYS_PER_MONTH = 3;
const MAX_DAYS_PER_MONTH = 9;

function loadSchedule() {
  try {
    return JSON.parse(fs.readFileSync(SCHEDULE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveSchedule(schedule) {
  fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(schedule, null, 2) + '\n');
}

function randomInt(min, max) {
  // inclusive range [min, max]
  return min + crypto.randomInt(max - min + 1);
}

function daysInMonth(year, month) {
  // month is 1-indexed here
  return new Date(year, month, 0).getDate();
}

function pickRandomDays(year, month) {
  const total = daysInMonth(year, month);
  const count = Math.min(randomInt(MIN_DAYS_PER_MONTH, MAX_DAYS_PER_MONTH), total);
  const pool = Array.from({ length: total }, (_, i) => i + 1);
  const chosen = [];
  while (chosen.length < count && pool.length) {
    const idx = crypto.randomInt(pool.length);
    chosen.push(pool.splice(idx, 1)[0]);
  }
  return chosen.sort((a, b) => a - b);
}

function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function main() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed
  const day = now.getDate();
  const key = monthKey(year, month);

  const schedule = loadSchedule();

  if (!schedule[key]) {
    schedule[key] = { days: pickRandomDays(year, month), done: [] };
    saveSchedule(schedule);
  }

  const entry = schedule[key];
  const isScheduledDay = entry.days.includes(day);
  const alreadyDone = entry.done.includes(day);

  if (!isScheduledDay || alreadyDone) {
    console.log('SKIP');
    process.exit(0);
  }

  entry.done.push(day);
  saveSchedule(schedule);

  const stamp = now.toISOString();
  const line = `- ${stamp.slice(0, 10)} (${stamp})\n`;
  fs.appendFileSync(LOG_PATH, line);

  console.log('CONTRIBUTE');
}

main();
