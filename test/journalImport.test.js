import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJournalBackup } from '../src/utils/journalImport.js';

const validEntry = {
  id: 'entry-1',
  type: 'journal',
  created: '2026-09-30T12:00:00.000Z',
  dateKey: '2026-09-30',
  mood: 'Content',
  intensity: 5,
  note: 'A private note',
  factors: [],
  tags: ['free-write'],
  primary: false
};

test('journal backups are normalized to known entry fields', () => {
  const [entry] = parseJournalBackup(JSON.stringify({
    journalEntriesV2: [{ ...validEntry, unknownServerField: 'discard me' }]
  }));
  assert.equal(entry.note, validEntry.note);
  assert.equal('unknownServerField' in entry, false);
});

test('journal backups reject malformed entries and duplicate IDs', () => {
  assert.throws(
    () => parseJournalBackup(JSON.stringify({ journalEntriesV2: [{ ...validEntry, dateKey: '../private' }] })),
    /invalid journal date/
  );
  assert.throws(
    () => parseJournalBackup(JSON.stringify({ journalEntriesV2: [validEntry, validEntry] })),
    /duplicate entry IDs/
  );
});
