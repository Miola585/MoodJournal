import test from 'node:test';
import assert from 'node:assert/strict';
import { journalDayNumber } from '../src/utils/journalUtils.js';
import { normalizeNoteDoc, noteDocToPlainText, plainTextToNoteDoc } from '../src/utils/journalRichText.js';
import { normalizeImportedEntry } from '../src/utils/journalImport.js';

const entry = { id: 'page-1', type: 'journal', created: '2026-05-24T12:00:00.000Z', dateKey: '2026-05-24' };

test('journal day numbers use calendar days even across daylight saving time', () => {
  assert.equal(journalDayNumber('2026-01-01'), 1);
  assert.equal(journalDayNumber('2026-05-24'), 144);
  assert.equal(journalDayNumber('2024-12-31'), 366);
  assert.equal(journalDayNumber('2026-03-09') - journalDayNumber('2026-03-08'), 1);
});

test('plain journal writing becomes paragraphs without losing searchable text', () => {
  const doc = plainTextToNoteDoc('First line\n\nLast line');
  assert.equal(noteDocToPlainText(doc), 'First line\n\nLast line');
});

test('formatted writing keeps only supported paragraphs, bullets, bold and italic', () => {
  const doc = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'A small win', marks: [{ type: 'bold' }] }] },
      { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Made tea', marks: [{ type: 'italic' }] }] }] }] }
    ]
  };
  assert.deepEqual(normalizeNoteDoc(doc), doc);
  assert.equal(noteDocToPlainText(doc), 'A small win\nMade tea');
  const imported = normalizeImportedEntry({ ...entry, note: 'A small win\nMade tea', noteDoc: doc, pageNote: 'Remember this.', paperStyle: 'plain' });
  assert.deepEqual(imported.noteDoc, doc);
  assert.equal(imported.pageNote, 'Remember this.');
  assert.equal(imported.paperStyle, 'plain');
});

test('backups reject unsupported rich content and oversized sticky notes', () => {
  assert.throws(() => normalizeImportedEntry({ ...entry, noteDoc: { type: 'doc', content: [{ type: 'image', attrs: { src: 'https://example.com/x' } }] } }), /unsupported formatting/);
  assert.throws(() => normalizeImportedEntry({ ...entry, noteDoc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }] } }), /unsupported formatting/);
  assert.throws(() => normalizeImportedEntry({ ...entry, pageNote: 'x'.repeat(601) }), /invalid pageNote/);
});
