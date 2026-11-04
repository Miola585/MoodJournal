import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthlyReflection } from '../src/utils/monthlyReflection.js';
const day = (dateKey, entries = [], keepsakes = []) => ({ dateKey, entries, keepsakes });
const check = (extra = {}) => ({ type: 'checkin', mood: 'Happy', intensity: 5, factors: [], ...extra });
const build = (days, month = '2026-10') => buildMonthlyReflection({ month, days }, '2026-11-04', []);

test('monthly reflection separates free writes, multiple check-ins and daily primary chart values', () => {
  const result = build([day('2026-10-01', [check({ intensity: 2 }), check({ primary: true, intensity: 8, factors: ['Sleep', 'Sleep'] }), { type: 'journal', intensity: 10, mood: 'Sad' }]), day('2026-10-02', [check({ intensity: 4, factors: ['Sleep'] })], [{ text: 'Memory' }])]);
  assert.equal(result.checkIns, 3); assert.equal(result.checkInDays, 2); assert.equal(result.freeWrites, 1); assert.equal(result.keepsakes, 1);
  assert.equal(result.averageIntensity, '6.0'); assert.equal(result.intensityData[0].intensity, 8);
  assert.equal(result.intensityData[2].intensity, null);
  assert.deepEqual(result.moodData.map(({ name, value }) => ({ name, value })), [{ name: 'Bright', value: 2 }]);
  assert.deepEqual(result.factors, [{ name: 'Sleep', value: 2 }]);
  assert.ok(result.insights.includes('Bright appeared on 2 check-in days.'));
});
test('empty and writing-only months never invent mood, intensity, or insights', () => {
  const result = build([day('2026-10-01', [{ type: 'journal', mood: 'Happy', intensity: 9 }])]);
  assert.equal(result.journalDays, 1); assert.equal(result.freeWrites, 1); assert.equal(result.averageIntensity, null);
  assert.deepEqual(result.moodData, []); assert.deepEqual(result.insights, []);
  assert.ok(result.intensityData.every((value) => value.intensity === null));
});
test('monthly reflection handles invalid intensities, tied moods and edits without causal claims', () => {
  const days = [day('2026-10-01', [check({ intensity: null })]), day('2026-10-02', [check({ intensity: 'broken' })]), day('2026-10-03', [check({ mood: 'Calm', intensity: 2 })]), day('2026-10-04', [check({ mood: 'Calm', intensity: 4 })])];
  const result = build(days);
  assert.equal(result.averageIntensity, '3.0'); assert.equal(result.moodData.length, 2);
  assert.ok(result.insights.includes('Bright, Calm each appeared on 2 check-in days.'));
  assert.equal(build(days.slice(0, 2)).averageIntensity, null);
  assert.equal(build([]).checkIns, 0);
});
test('monthly reflection respects actual month lengths and leaves absent days blank', () => {
  for (const [month, length] of [['2024-02', 29], ['2026-02', 28], ['2026-04', 30], ['2026-10', 31]]) assert.equal(build([], month).intensityData.length, length);
});
