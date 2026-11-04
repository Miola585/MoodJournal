export const MOOD_COLORS_STORAGE_KEY = 'gameMoodColorsV1';
export const MOOD_COLORS_VERSION = 1;
export const MOOD_COLORS_COLUMNS = 7;
export const MOOD_COLORS_ROWS = 5;
export const MOOD_COLORS_TILE_COUNT = MOOD_COLORS_COLUMNS * MOOD_COLORS_ROWS;
export const MOOD_COLORS_NOTE_LIMIT = 2000;

export const moodColors = Object.freeze([
  { key: 'calm', label: 'Calm', color: '#72b6b1', mark: 'C' },
  { key: 'joyful', label: 'Joyful', color: '#f1c75b', mark: 'J' },
  { key: 'tender', label: 'Tender', color: '#e7a0b2', mark: 'T' },
  { key: 'low', label: 'Low', color: '#93a7cd', mark: 'L' },
  { key: 'restless', label: 'Restless', color: '#e99b73', mark: 'R' },
  { key: 'hopeful', label: 'Hopeful', color: '#a4c781', mark: 'H' }
].map(Object.freeze));

const validTiles = (tiles) => Array.isArray(tiles) && tiles.length === MOOD_COLORS_TILE_COUNT
  && Array.from(tiles).every((tile) => tile === null || moodColors.some(({ key }) => key === tile));
const validTimestamp = (value) => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const validDateKey = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value)
  && Number.isFinite(Date.parse(`${value}T12:00:00Z`))
  && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;

export function createMoodColorsMap(now = new Date(), id = globalThis.crypto.randomUUID()) {
  return {
    version: MOOD_COLORS_VERSION,
    id,
    dateKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    tiles: Array(MOOD_COLORS_TILE_COUNT).fill(null),
    note: ''
  };
}

// Reject damaged maps rather than silently changing someone's saved colors.
export function normalizeMoodColorsMap(value) {
  if (!value || value.version !== MOOD_COLORS_VERSION
    || typeof value.id !== 'string' || !value.id.trim() || value.id.length > 128
    || !validDateKey(value.dateKey) || !validTimestamp(value.createdAt) || !validTimestamp(value.updatedAt)
    || value.updatedAt < value.createdAt || !validTiles(value.tiles)
    || typeof value.note !== 'string' || value.note.length > MOOD_COLORS_NOTE_LIMIT) return null;
  const { version, id, dateKey, createdAt, updatedAt, tiles, note } = value;
  return { version, id, dateKey, createdAt, updatedAt, tiles: [...tiles], note };
}

export function normalizeMoodColorsRecords(value) {
  const errorMessage = 'Saved Mood Colors history is damaged or unsupported. Saving is blocked to protect your saved maps.';
  if (!Array.isArray(value)) throw new Error(errorMessage);
  const records = new Map();
  // Validate every revision before deduplication, including sparse array slots.
  for (const item of value) {
    const record = normalizeMoodColorsMap(item);
    if (!record) throw new Error(errorMessage);
    if (!records.has(record.id) || records.get(record.id).updatedAt < record.updatedAt) {
      records.set(record.id, record);
    }
  }
  return [...records.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function moodColorsProportions(tiles) {
  const safeTiles = validTiles(tiles) ? tiles : [];
  const total = safeTiles.filter(Boolean).length;
  return moodColors.map((mood) => {
    const count = safeTiles.filter((tile) => tile === mood.key).length;
    return { ...mood, count, percent: total ? Math.round(count / total * 100) : 0 };
  });
}

export function moveMoodColorsFocus(index, key) {
  const column = index % MOOD_COLORS_COLUMNS;
  switch (key) {
    case 'ArrowLeft': return column > 0 ? index - 1 : index;
    case 'ArrowRight': return column < MOOD_COLORS_COLUMNS - 1 ? index + 1 : index;
    case 'ArrowUp': return Math.max(column, index - MOOD_COLORS_COLUMNS);
    case 'ArrowDown': return Math.min(MOOD_COLORS_TILE_COUNT - MOOD_COLORS_COLUMNS + column, index + MOOD_COLORS_COLUMNS);
    case 'Home': return index - column;
    case 'End': return index - column + MOOD_COLORS_COLUMNS - 1;
    default: return index;
  }
}
