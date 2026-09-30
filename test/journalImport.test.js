import test from 'node:test';
import assert from 'node:assert/strict';
import { buildImportedJournal, compareJournalImports, parseJournalBackup } from '../src/utils/journalImport.js';

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
  primary: false,
  bookmarked: true
};

test('journal backups are normalized to known entry fields', () => {
  const [entry] = parseJournalBackup(JSON.stringify({
    journalEntriesV2: [{ ...validEntry, unknownServerField: 'discard me' }]
  }));
  assert.equal(entry.note, validEntry.note);
  assert.equal(entry.bookmarked, true);
  assert.equal('unknownServerField' in entry, false);
});

test('backup previews separate new, duplicate, conflicting, and current-only entries', () => {
  const current = [validEntry, { ...validEntry, id: 'current-only' }];
  const duplicatePreview = compareJournalImports(current, [
    { ...validEntry },
    { ...validEntry, id: 'new-entry' }
  ]);
  assert.deepEqual(duplicatePreview.counts, { new: 1, duplicates: 1, conflicts: 0, currentOnly: 1 });

  const conflictImport = [
    { ...validEntry, note: 'Backup changed this note' },
    { ...validEntry, id: 'new-entry' }
  ];
  const comparison = compareJournalImports(current, conflictImport);
  assert.deepEqual(comparison.counts, { new: 1, duplicates: 0, conflicts: 1, currentOnly: 1 });
  assert.equal(buildImportedJournal(current, conflictImport, 'safe').find((entry) => entry.id === 'entry-1').note, validEntry.note);
  assert.equal(buildImportedJournal(current, conflictImport, 'backup').find((entry) => entry.id === 'entry-1').note, 'Backup changed this note');
  assert.deepEqual(buildImportedJournal(current, conflictImport, 'replace'), conflictImport);
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
