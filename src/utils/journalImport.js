const MAX_IMPORT_ENTRIES = 5000;
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;

const stringFields = {
  title: 300,
  mood: 80,
  specificFeeling: 120,
  note: 1000000,
  copingStep: 1000,
  meals: 120,
  water: 120,
  sleep: 120
};

const readString = (entry, field, maxLength, fallback = '') => {
  const value = entry[field];
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new Error(`An imported entry has an invalid ${field} field.`);
  }
  return value;
};

const readStringList = (entry, field) => {
  const value = entry[field];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 100 || value.some((item) => typeof item !== 'string' || item.length > 200)) {
    throw new Error(`An imported entry has an invalid ${field} list.`);
  }
  return value;
};

const normalizeEntry = (entry) => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error('The backup contains an invalid journal entry.');
  }
  if (JSON.stringify(entry).length > 1500000) throw new Error('An imported journal entry is too large.');

  const created = readString(entry, 'created', 64);
  if (!created || Number.isNaN(Date.parse(created))) throw new Error('An imported entry has an invalid creation date.');
  const dateKey = readString(entry, 'dateKey', 10, created.slice(0, 10));
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(dateKey)) throw new Error('An imported entry has an invalid journal date.');
  const type = readString(entry, 'type', 20, 'checkin');
  if (!['checkin', 'journal', 'game'].includes(type)) throw new Error('An imported entry has an unsupported entry type.');

  const intensity = Number(entry.intensity ?? 5);
  if (!Number.isFinite(intensity) || intensity < 1 || intensity > 10) {
    throw new Error('An imported entry has an invalid intensity.');
  }

  const normalized = {
    id: String(entry.id || crypto.randomUUID()).slice(0, 128),
    type,
    created,
    dateKey,
    intensity,
    factors: readStringList(entry, 'factors'),
    tags: readStringList(entry, 'tags'),
    primary: Boolean(entry.primary)
  };
  Object.entries(stringFields).forEach(([field, maxLength]) => {
    normalized[field] = readString(entry, field, maxLength);
  });
  if (entry.moodScore !== undefined && entry.moodScore !== null) {
    const moodScore = Number(entry.moodScore);
    if (!Number.isFinite(moodScore) || moodScore < 0 || moodScore > 10) {
      throw new Error('An imported entry has an invalid mood score.');
    }
    normalized.moodScore = moodScore;
  }
  if (entry.updated !== undefined && entry.updated !== null) {
    const updated = readString(entry, 'updated', 64);
    if (Number.isNaN(Date.parse(updated))) throw new Error('An imported entry has an invalid update date.');
    normalized.updated = updated;
  }
  return normalized;
};

export function parseJournalBackup(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_IMPORT_FILE_BYTES) {
    throw new Error('That backup is too large to import.');
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.journalEntriesV2)) {
    throw new Error('That file does not contain Mood Journal entries.');
  }
  if (data.journalEntriesV2.length > MAX_IMPORT_ENTRIES) {
    throw new Error(`A backup can contain at most ${MAX_IMPORT_ENTRIES} entries.`);
  }
  const entries = data.journalEntriesV2.map(normalizeEntry);
  if (new Set(entries.map((entry) => entry.id)).size !== entries.length) {
    throw new Error('The backup contains duplicate entry IDs.');
  }
  return entries;
}
