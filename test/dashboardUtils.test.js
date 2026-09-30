import test from 'node:test';
import assert from 'node:assert/strict';
import { getJournalRhythm, getRecentJournalEntries } from '../src/utils/dashboardUtils.js';

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
