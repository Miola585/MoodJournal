import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dateKeyFromTimestamp,
  formatDateKey,
  isJournalDateAllowed,
  normalizeDailyPrimaries,
  removeJournalEntry,
  selectDailyPrimaryCheckIns,
  upsertJournalEntry
} from '../src/utils/journalUtils.js';

const checkIn = (id, dateKey, created, primary = false) => ({
  id,
  type: 'checkin',
  dateKey,
  created,
  mood: 'Calm',
  primary
});

test('journal dates reject future and impossible calendar dates', () => {
  assert.equal(isJournalDateAllowed('2026-09-30', '2026-09-30'), true);
  assert.equal(isJournalDateAllowed('2026-10-01', '2026-09-30'), false);
  assert.equal(isJournalDateAllowed('2026-02-31', '2026-09-30'), false);
});

test('journal dates are created from the local calendar rather than UTC slices', () => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    assert.equal(dateKeyFromTimestamp('2026-10-01T03:30:00.000Z'), '2026-09-30');
    assert.equal(dateKeyFromTimestamp('2026-03-08T04:30:00.000Z'), '2026-03-07');
    assert.equal(dateKeyFromTimestamp('2026-03-08T07:30:00.000Z'), '2026-03-08');
    assert.equal(formatDateKey(new Date(2026, 10, 1, 0, 30)), '2026-11-01');
  } finally {
    process.env.TZ = previousTimezone;
  }
});

test('several daily check-ins keep exactly one primary and summaries select only it', () => {
  const entries = normalizeDailyPrimaries([
    checkIn('later', '2026-09-30', '2026-09-30T18:00:00.000Z'),
    checkIn('first', '2026-09-30', '2026-09-30T08:00:00.000Z'),
    checkIn('next-day', '2026-10-01', '2026-10-01T08:00:00.000Z')
  ]);
  assert.deepEqual(entries.filter((entry) => entry.primary).map((entry) => entry.id).sort(), ['first', 'next-day']);
  assert.equal(selectDailyPrimaryCheckIns(entries).length, 2);
});

test('moving and deleting a primary repairs every affected day', () => {
  const original = normalizeDailyPrimaries([
    checkIn('first', '2026-09-29', '2026-09-29T08:00:00.000Z'),
    checkIn('second', '2026-09-29', '2026-09-29T12:00:00.000Z'),
    checkIn('other-day', '2026-09-30', '2026-09-30T08:00:00.000Z')
  ]);
  const moved = upsertJournalEntry(original, { ...original.find((entry) => entry.id === 'first'), dateKey: '2026-09-30' });
  assert.equal(moved.find((entry) => entry.id === 'second').primary, true);
  assert.equal(moved.find((entry) => entry.id === 'first').primary, true);
  assert.equal(moved.find((entry) => entry.id === 'other-day').primary, false);

  const afterDelete = removeJournalEntry(moved, 'first');
  assert.equal(afterDelete.find((entry) => entry.id === 'other-day').primary, true);
  assert.equal(afterDelete.filter((entry) => entry.primary).length, 2);
});
