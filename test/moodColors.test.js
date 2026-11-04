import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createMoodColorsMap, moodColors, moodColorsProportions, moveMoodColorsFocus,
  normalizeMoodColorsMap, normalizeMoodColorsRecords, MOOD_COLORS_STORAGE_KEY
} from '../src/utils/moodColors.js';

const map = () => createMoodColorsMap(new Date('2026-11-01T12:00:00.000Z'), 'map-one');

test('mood colors uses a versioned key, six labeled colors and 35 independent tiles', () => {
  assert.equal(MOOD_COLORS_STORAGE_KEY, 'gameMoodColorsV1');
  assert.deepEqual(moodColors.map(({ label }) => label), ['Calm', 'Joyful', 'Tender', 'Low', 'Restless', 'Hopeful']);
  const original = map();
  const normalized = normalizeMoodColorsMap({ ...original, extra: 'not persisted' });
  assert.deepEqual(normalized, original);
  assert.equal(normalized.tiles.length, 35);
  normalized.tiles[0] = 'calm';
  assert.equal(original.tiles[0], null);
});

test('normalization rejects damaged records, impossible dates, sparse grids and unknown versions', () => {
  const original = map();
  const invalid = [null, {}, { ...original, version: 2 }, { ...original, id: '' },
    { ...original, id: 7 }, { ...original, dateKey: '2026-02-30' },
    { ...original, createdAt: 'tomorrow' }, { ...original, updatedAt: '2026-10-01T12:00:00.000Z' },
    { ...original, updatedAt: '2026-11-31T12:00:00.000Z' },
    { ...original, tiles: Array(35) }, { ...original, tiles: Array(34).fill(null) },
    { ...original, tiles: ['unknown', ...Array(34).fill(null)] },
    { ...original, note: 42 }, { ...original, note: 'x'.repeat(2001) }];
  invalid.forEach((value) => assert.equal(normalizeMoodColorsMap(value), null));
  invalid.forEach((value) => assert.throws(() => normalizeMoodColorsRecords([original, value]), /Saving is blocked/u));
});

test('persisted history rejects non-arrays and sparse records while accepting an empty history', () => {
  for (const value of [null, undefined, {}, { maps: [map()] }, '[]', 0, Array(1)]) {
    assert.throws(() => normalizeMoodColorsRecords(value), /Saving is blocked/u);
  }
  assert.deepEqual(normalizeMoodColorsRecords([]), []);
});

test('history deduplicates by id, keeps the newest revision and preserves separate same-day maps', () => {
  const first = map();
  const changed = { ...first, updatedAt: '2026-11-01T13:00:00.000Z', note: 'Updated' };
  const second = { ...first, id: 'map-two', updatedAt: '2026-11-01T14:00:00.000Z' };
  const input = [first, second, changed, first];
  assert.deepEqual(normalizeMoodColorsRecords(input), [second, changed]);
  assert.equal(input.length, 4);
  assert.throws(() => normalizeMoodColorsRecords([changed, { ...first, tiles: [] }]), /Saving is blocked/u);
});

test('proportions count painted tiles only and handle empty maps without NaN', () => {
  const tiles = map().tiles;
  assert.ok(moodColorsProportions(tiles).every(({ count, percent }) => count === 0 && percent === 0));
  tiles[0] = 'calm';
  tiles[1] = 'calm';
  tiles[2] = 'joyful';
  const result = moodColorsProportions(tiles);
  assert.deepEqual(result.slice(0, 2).map(({ count, percent }) => ({ count, percent })), [
    { count: 2, percent: 67 }, { count: 1, percent: 33 }
  ]);
  assert.ok(moodColorsProportions(null).every(({ percent }) => percent === 0));
});

test('keyboard movement follows rows and columns without wrapping at edges', () => {
  assert.equal(moveMoodColorsFocus(0, 'ArrowLeft'), 0);
  assert.equal(moveMoodColorsFocus(6, 'ArrowRight'), 6);
  assert.equal(moveMoodColorsFocus(3, 'ArrowUp'), 3);
  assert.equal(moveMoodColorsFocus(31, 'ArrowDown'), 31);
  assert.equal(moveMoodColorsFocus(8, 'ArrowLeft'), 7);
  assert.equal(moveMoodColorsFocus(8, 'ArrowRight'), 9);
  assert.equal(moveMoodColorsFocus(8, 'ArrowUp'), 1);
  assert.equal(moveMoodColorsFocus(8, 'ArrowDown'), 15);
  assert.equal(moveMoodColorsFocus(10, 'Home'), 7);
  assert.equal(moveMoodColorsFocus(10, 'End'), 13);
  assert.equal(moveMoodColorsFocus(10, 'Enter'), 10);
});
