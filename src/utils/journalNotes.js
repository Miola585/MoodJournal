export const MAX_JOURNAL_NOTES = 20;
export const MAX_JOURNAL_NOTE_LENGTH = 600;

const clamp = (value) => Math.max(0, Math.min(1, value));

export function normalizeJournalNotes(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_JOURNAL_NOTES) {
    throw new Error('An imported entry has an invalid sticky notes list.');
  }
  const ids = new Set();
  return value.map((note) => {
    if (!note || typeof note !== 'object' || Array.isArray(note)
      || !Number.isSafeInteger(note.uid) || note.uid < 0 || ids.has(note.uid)
      || typeof note.text !== 'string' || note.text.length > MAX_JOURNAL_NOTE_LENGTH
      || !Number.isFinite(note.x) || note.x < 0 || note.x > 1
      || !Number.isFinite(note.y) || note.y < 0 || note.y > 1) {
      throw new Error('An imported entry has an invalid sticky note.');
    }
    ids.add(note.uid);
    return { uid: note.uid, text: note.text, x: note.x, y: note.y };
  });
}

export function getJournalNotes(entry) {
  const notes = Array.isArray(entry?.stickyNotes) ? entry.stickyNotes : [];
  const legacyText = typeof entry?.pageNote === 'string' ? entry.pageNote : '';
  if (!legacyText.trim()) return notes;
  const uid = notes.some((note) => note.uid === 0) ? Math.max(0, ...notes.map((note) => note.uid)) + 1 : 0;
  return [{ uid, text: legacyText, x: 0.82, y: 0.08 }, ...notes];
}

export function createJournalNote(notes) {
  const uid = Math.max(0, ...notes.map((note) => note.uid)) + 1;
  const offset = notes.length % 4;
  return { uid, text: '', x: clamp(0.94 - offset * 0.1), y: clamp(0.78 - offset * 0.08) };
}
