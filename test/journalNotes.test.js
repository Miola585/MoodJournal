import test from 'node:test';
import assert from 'node:assert/strict';
import { createJournalNote, getJournalNotes, normalizeJournalNotes } from '../src/utils/journalNotes.js';
import { normalizeImportedEntry } from '../src/utils/journalImport.js';

const entry = {
  id: 'note-test',
  created: '2026-09-30T10:00:00.000Z',
  dateKey: '2026-09-30',
  type: 'journal'
};

test('multiple notes keep their own text and normalized positions in backups', () => {
  const stickyNotes = [
    { uid: 1, text: 'First thought', x: 0.8, y: 0.7 },
    { uid: 2, text: 'Another thought', x: 0.4, y: 0.2 }
  ];
  assert.deepEqual(normalizeImportedEntry({ ...entry, stickyNotes }).stickyNotes, stickyNotes);
  assert.deepEqual(normalizeJournalNotes(stickyNotes), stickyNotes);
});

test('legacy page notes remain on the paper when opening older entries', () => {
  const notes = getJournalNotes({ pageNote: 'An older thought', stickyNotes: [{ uid: 0, text: 'Newer', x: 0.5, y: 0.5 }] });
  assert.equal(notes.length, 2);
  assert.equal(notes[0].text, 'An older thought');
  assert.notEqual(notes[0].uid, notes[1].uid);
});

test('new notes have unique ids and contained starting positions', () => {
  const notes = [{ uid: 3, text: 'Existing', x: 0.9, y: 0.9 }];
  const added = createJournalNote(notes);
  assert.equal(added.uid, 4);
  assert.equal(added.text, '');
  assert.ok(added.x >= 0 && added.x <= 1);
  assert.ok(added.y >= 0 && added.y <= 1);
});

test('malformed note positions and duplicate ids are rejected on import', () => {
  assert.throws(() => normalizeImportedEntry({ ...entry, stickyNotes: [{ uid: 1, text: 'Outside', x: 1.5, y: 0 }] }), /invalid sticky note/);
  assert.throws(() => normalizeImportedEntry({ ...entry, stickyNotes: [
    { uid: 1, text: 'A', x: 0, y: 0 },
    { uid: 1, text: 'B', x: 0, y: 0 }
  ] }), /invalid sticky note/);
});
