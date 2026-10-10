#!/usr/bin/env node
// Decides whether "today" is one of this month's contribution days and, if so,
// appends an entry to contribution-log.json. The active-day set is re-derived
// deterministically from the year/month each run (seeded PRNG), so repeated
// runs within the same month always agree without needing separate state.

const fs = require('fs');
const path = require('path');

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return h;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MIN_ACTIVE_DAYS = 3;
const MAX_ACTIVE_DAYS = 10;

function activeDaysForMonth(year, monthIndex, daysInMonth) {
  const rand = mulberry32(hashSeed(`${year}-${monthIndex}`));

  const maxDays = Math.min(MAX_ACTIVE_DAYS, daysInMonth);
  const numActive = MIN_ACTIVE_DAYS + Math.floor(rand() * (maxDays - MIN_ACTIVE_DAYS + 1));

  const pool = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, numActive).sort((a, b) => a - b);
}

function main() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const monthIndex = now.getUTCMonth(); // 0-based
  const day = now.getUTCDate();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  const activeDays = activeDaysForMonth(year, monthIndex, daysInMonth);
  const monthLabel = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

  if (!activeDays.includes(day)) {
    console.log(`${monthLabel}: today (day ${day}) is not an active day. Active days: ${activeDays.join(', ')}`);
    return;
  }

  const logPath = path.join(__dirname, 'contribution-log.json');
  let log = [];
  if (fs.existsSync(logPath)) {
    log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  }

  const dateStr = `${monthLabel}-${String(day).padStart(2, '0')}`;
  if (log.some((entry) => entry.date === dateStr)) {
    console.log(`${dateStr}: already logged, skipping.`);
    return;
  }

  log.push({ date: dateStr, timestamp: now.toISOString() });
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2) + '\n');
  console.log(`${dateStr}: logged (active days this month: ${activeDays.join(', ')}).`);
}

main();
