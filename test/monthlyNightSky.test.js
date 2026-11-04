import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthlySkies, skyPosition, validSkyMonth, skyBookPath, skyDayPath } from '../src/utils/monthlyNightSky.js';
const moods = [{ key: 'Calm', color: '#2aafa1', score: 7 }];
const entry = (dateKey, extra = {}) => ({ id: dateKey, dateKey, type: 'checkin', mood: 'Calm', intensity: 5, created: `${dateKey}T12:00:00`, ...extra });
const sky = (entries, month = '2026-10', today = '2026-11-04') => buildMonthlySkies(entries, moods, today).months.find((value) => value.month === month)?.stars || [];

test('monthly skies count saved days, including leap months, without changing positions', () => {
  for (const [month, count] of [['2026-02', 28], ['2024-02', 29], ['2026-04', 30], ['2026-10', 31]]) {
    const entries = Array.from({ length: count }, (_, i) => entry(`${month}-${String(i + 1).padStart(2, '0')}`));
    const stars = sky(entries, month);
    assert.equal(stars.length, count);
    assert.deepEqual(sky([...entries].reverse(), month), stars);
    const saved = stars[0];
    assert.equal(sky([entries[0]], month)[0].x, saved.x);
    assert.equal(sky([entries[0]], month)[0].y, saved.y);
  }
});
test('primary check-ins win, free writes never imply a mood or intensity', () => {
  const notes = [entry('2026-10-01', { id: 'writing', type: 'journal', intensity: 9 }), entry('2026-10-02', { id: 'secondary', intensity: 2 }), entry('2026-10-02', { id: 'primary', primary: true, intensity: 8 })];
  const stars = sky(notes);
  assert.equal(stars[0].label, 'Free write'); assert.equal(stars[0].intensity, null); assert.equal(stars[0].shape.points, 5); assert.equal(stars[0].starColor, '#f5f1df');
  assert.equal(stars[1].entryId, 'primary'); assert.equal(stars[1].intensity, 8); assert.equal(stars[1].entryCount, 2);
  assert.equal(sky(notes.slice(0, 2))[1].intensity, 2);
});
test('edits, moving dates and removal derive live skies with no archives', () => {
  const original = entry('2026-10-01');
  assert.equal(sky([{ ...original, intensity: 2 }])[0].shape.points, 4);
  assert.equal(sky([{ ...original, dateKey: '2026-09-01' }]).length, 0);
  assert.equal(sky([]).length, 0);
  assert.equal(sky([original]).length, 1);
});
test('legacy dates use library rules; invalid data and future entries do not invent stars', () => {
  const entries = [entry(null, { id: 'legacy', created: '2026-10-01T12:00:00' }), entry('2026-02-30', { created: 'broken' }), null, entry('2026-10-02', { type: 'game' }), entry('2027-01-01')];
  const result = buildMonthlySkies(entries, moods, '2026-11-04');
  assert.equal(result.invalidEntries, true); assert.equal(sky(entries).length, 1);
  assert.deepEqual(result.months.map((value) => value.month), ['2026-11', '2026-10']);
});
test('month rollover and links are local-date based and truthful', () => {
  const entries = [entry('2026-12-31')];
  assert.deepEqual(buildMonthlySkies(entries, moods, '2027-01-01').months.map((v) => v.month), ['2027-01', '2026-12']);
  assert.equal(validSkyMonth('2026-13', '2026-11-04'), false);
  assert.equal(validSkyMonth('2027-01', '2026-11-04'), false);
  assert.equal(skyBookPath('2026-10'), '/journal/library?month=2026-10&view=night-sky');
  assert.equal(skyDayPath('2026-10-01'), '/journal/library?month=2026-10&day=2026-10-01');
});
test('all 31 star targets stay separate at 320px and narrow book widths', () => {
  const points = Array.from({ length: 31 }, (_, i) => skyPosition(`2026-10-${String(i + 1).padStart(2, '0')}`));
  for (const width of [258, 288, 400, 1050]) for (let i = 0; i < points.length; i++) {
    const a = points[i];
    assert.ok(a.x / 100 * width >= 22 && a.x / 100 * width <= width - 22);
    for (const b of points.slice(i + 1)) assert.ok(Math.abs(a.x - b.x) / 100 * width >= 44 || Math.abs(a.y - b.y) / 100 * 440 >= 44);
  }
});
