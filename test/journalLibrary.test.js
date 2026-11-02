import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthlyLibrary, libraryConstellation, loadLibraryKeepsakes, savedDate } from '../src/utils/journalLibrary.js';
import { createPrivateStorage } from '../src/utils/privateStorage.js';
import { createJournalEncryption } from '../src/utils/journalEncryption.js';
import { createMoodColorsMap } from '../src/utils/moodColors.js';

const storage = (data) => ({ read: async (key, fallback) => data[key] ?? fallback, listKeys: (prefix) => Object.keys(data).filter((key) => key.startsWith(prefix)) });
const sky = { id: 'sky', name: 'A path', createdAt: '2026-10-03T12:00:00Z', stars: [1, 2], connections: [[1, 2]] };

test('books count real saved days and retain multiple same-day entries and keepsakes', async () => {
  const result = await loadLibraryKeepsakes(storage({ gameConstellations: [sky, { ...sky, id: 'second' }], 'groundingNoteV1:senses:2026-09-01': 'Just a note', 'activityNotes:2026-10-03': { Rest: 'Without completing the activity', Blank: ' ' }, 'journalDraft:unsaved': 'Never include' }));
  const library = buildMonthlyLibrary([{ id: 'one', type: 'journal', dateKey: '2026-10-03' }, { id: 'two', dateKey: '2026-10-03', pageNote: 'In the margin' }], result.items, '2026-11-01');
  assert.deepEqual(library.months.map((book) => book.month), ['2026-11', '2026-10', '2026-09']);
  assert.equal(library.months[0].days.length, 0);
  assert.equal(library.months[1].days.length, 1);
  assert.equal(library.months[1].entryCount, 2);
  assert.equal(library.months[1].keepsakeCount, 4);
  assert.equal(library.months[2].entryCount, 0);
  assert.equal(library.months[2].keepsakeCount, 1);
});

test('local dates take precedence, legacy timestamps use local date, invalid dates are not invented', () => {
  assert.equal(savedDate({ dateKey: '2026-10-01', createdAt: '2026-10-02T02:00:00Z' }), '2026-10-01');
  const date = new Date('2026-10-02T02:00:00Z');
  const expected = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  assert.equal(savedDate({ createdAt: date.toISOString() }), expected);
  assert.equal(savedDate({ dateKey: '2026-02-30' }), null);
  assert.equal(savedDate({ createdAt: '' }), null);
});

test('legacy geometry and explicit positions preserve star IDs and aspect ratio', () => {
  const legacy = libraryConstellation(sky);
  assert.equal(legacy.aspectRatio, 1);
  assert.deepEqual(legacy.stars.map((star) => star.id), [1, 2]);
  const custom = libraryConstellation({ ...sky, aspectRatio: 2, starPositions: [{ id: 1, x: 19, y: 40 }, { id: 2, x: 78, y: 81 }] });
  assert.deepEqual(custom.stars.map((star) => star.x), [19, 78]);
  assert.equal(custom.aspectRatio, 2);
  assert.throws(() => libraryConstellation({ ...sky, connections: [[1, 99]] }));
});

test('malformed records report a source warning without hiding readable records', async () => {
  const result = await loadLibraryKeepsakes(storage({ gameConstellations: [null, sky], gameMemoryJar: [{ text: 'No date' }], gameMoodColorsV1: [false], 'groundingNoteV1:breathing:2026-10-03': 'A breath' }));
  assert.equal(result.items.length, 2);
  assert.deepEqual(result.unavailable.sort(), ['Constellations', 'Memory Jar', 'Mood Colors']);
});

test('all orbit snapshots, maps and completed wonders are included; unfinished progress is excluded', async () => {
  const planet = { name: 'Emotion', orbit: 'close', angle: 45 };
  const map = createMoodColorsMap(new Date('2026-10-03T12:00:00Z'), 'map');
  const result = await loadLibraryKeepsakes(storage({
    'moodOrbit:2026-10-03': { version: 3, history: [{ id: 'a', planets: [planet], reflection: 'One' }, { id: 'b', planets: [planet], reflection: 'Two' }] },
    'moodOrbit:2026-10-02': [planet], gameMoodColorsV1: [map],
    'gameSmallWondersV1:2026-10-03': { stage: 'complete', finds: ['light', 'texture'] },
    'gameSmallWondersV1:2026-10-02': { stage: 'hunt', finds: ['light'] }
  }));
  assert.equal(result.items.length, 5);
  assert.equal(result.items.filter((item) => item.kind === 'orbit').length, 3);
  assert.equal(result.unavailable.length, 0);
});

test('owner-scoped storage and encryption keep books isolated', async () => {
  const values = new Map();
  const backing = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key), key: (index) => [...values.keys()][index], get length() { return values.size; } };
  const { dataKey } = await createJournalEncryption('library test passphrase');
  const alice = createPrivateStorage({ ownerId: 'alice', encryptionEnabled: true, dataKey, storage: backing });
  await alice.write('gameConstellations', [sky]);
  await alice.write('groundingNoteV1:senses:2026-10-03', 'A private thought');
  assert.equal((await loadLibraryKeepsakes(alice)).items.length, 2);
  const bob = createPrivateStorage({ ownerId: 'bob', storage: backing });
  assert.equal((await loadLibraryKeepsakes(bob)).items.length, 0);
  const locked = createPrivateStorage({ ownerId: 'alice', encryptionEnabled: true, storage: backing });
  const result = await loadLibraryKeepsakes(locked);
  assert.equal(result.items.length, 0);
  assert.ok(result.unavailable.length > 0);
  assert.ok(![...values.values()].join('').includes('A private thought'));
});

test('canceled loads cannot return pending private previews', async () => {
  const controller = new AbortController();
  let release;
  const pending = loadLibraryKeepsakes({ ...storage({}), read: () => new Promise((resolve) => { release = resolve; }) }, { signal: controller.signal });
  controller.abort(); release([sky]);
  await assert.rejects(pending, { name: 'AbortError' });
});

test('invalid content reports problems without crashing a readable book', async () => {
  const result = await loadLibraryKeepsakes(storage({ gameConstellations: [{ ...sky, name: {} }, sky], 'gameSmallWondersV1:2026-10-03': { stage: 'complete', finds: [{}] } }));
  assert.equal(result.items.length, 1);
  assert.deepEqual(result.unavailable.sort(), ['Constellations', 'Small Wonders']);
  const library = buildMonthlyLibrary([{ type: 'journal', dateKey: '2026-10-03', factors: {} }, { id: 'readable', type: 'journal', dateKey: '2026-10-03', note: 'Still here' }], result.items, '2026-11-01');
  assert.equal(library.invalidEntries, true);
  assert.equal(library.months[1].entryCount, 1);
});
