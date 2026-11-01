import test from 'node:test';
import assert from 'node:assert/strict';
import { getJournalRhythm, getRecentJournalEntries } from '../src/utils/dashboardUtils.js';
import { calendarWeekDays, formatDateKey, journalDateFromEntry } from '../src/utils/journalUtils.js';

const entry = (id, dateKey, type = 'checkin') => ({
  id,
  type,
  dateKey,
  created: `${dateKey}T12:00:00.000Z`,
  note: 'A note'
});

test('journal rhythm counts unique check-in days in the current week', () => {
  const entries = [
    entry('a', '2026-09-27'),
    entry('b', '2026-09-27'),
    entry('c', '2026-09-29'),
    entry('d', '2026-09-28', 'journal'),
    entry('e', '2026-09-20')
  ];
  assert.equal(getJournalRhythm(entries, new Date('2026-09-29T15:00:00')), 2);
});

test('recent journal entries are newest first and respect the limit', () => {
  const entries = [entry('a', '2026-09-25'), entry('b', '2026-09-27'), entry('c', '2026-09-26')];
  assert.deepEqual(getRecentJournalEntries(entries, 2).map(({ id }) => id), ['b', 'c']);
});

test('calendar weeks start Sunday and previous week ends Saturday', () => {
  const sunday = new Date(2026, 10, 1, 12);
  const monday = new Date(2026, 10, 2, 12);
  assert.deepEqual(calendarWeekDays(sunday).map(formatDateKey), [
    '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04',
    '2026-11-05', '2026-11-06', '2026-11-07'
  ]);
  assert.deepEqual(calendarWeekDays(monday).map(formatDateKey), calendarWeekDays(sunday).map(formatDateKey));
  assert.deepEqual(calendarWeekDays(sunday, -1).map(formatDateKey), [
    '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28',
    '2026-10-29', '2026-10-30', '2026-10-31'
  ]);
  assert.deepEqual(calendarWeekDays(new Date(2026, 0, 1, 12)).map(formatDateKey).slice(0, 2), ['2025-12-28', '2025-12-29']);
});

test('Home rhythm and Summary week use the same Sunday boundary', () => {
  const entries = [entry('previous', '2026-10-31'), entry('current', '2026-11-01')];
  assert.equal(getJournalRhythm(entries, new Date(2026, 10, 1, 12)), 1);
  assert.equal(getJournalRhythm(entries, new Date(2026, 10, 2, 12)), 1);
});

test('journal date prefers a valid local date key and falls back to creation', () => {
  assert.equal(formatDateKey(journalDateFromEntry({ dateKey: '2026-10-25', created: '2026-10-31T18:00:00Z' })), '2026-10-25');
  assert.equal(formatDateKey(journalDateFromEntry({ created: '2026-10-31T12:00:00' })), '2026-10-31');
  assert.equal(formatDateKey(journalDateFromEntry({ dateKey: '2026-02-30', created: '2026-10-31T12:00:00' })), '2026-10-31');
  assert.equal(journalDateFromEntry({ dateKey: 'invalid', created: null }), null);
  assert.equal(journalDateFromEntry({ dateKey: 'invalid', created: 'invalid' }), null);
});
