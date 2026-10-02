import assert from 'node:assert/strict';
import test from 'node:test';
import { quickActivityGroups } from '../src/data/journalData.js';
import { selectDailyActivities } from '../src/utils/activityUtils.js';

test('daily quick activities stay stable for a date and include one activity from each group', () => {
  const first = selectDailyActivities(quickActivityGroups, '2026-10-01');
  const second = selectDailyActivities(quickActivityGroups, '2026-10-01');

  assert.deepEqual(second, first);
  assert.deepEqual(first.map((activity) => activity.kind), ['body', 'reflection', 'action']);
});

test('all three featured quick activities rotate on the following day', () => {
  const today = selectDailyActivities(quickActivityGroups, '2026-10-01');
  const tomorrow = selectDailyActivities(quickActivityGroups, '2026-10-02');

  assert.equal(today.length, 3);
  assert.equal(tomorrow.length, 3);
  assert.equal(today.every((activity, index) => activity.title !== tomorrow[index].title), true);
});

test('quick activity instructions are concrete and complete', () => {
  quickActivityGroups.flat().forEach((activity) => {
    assert.equal(activity.steps.length, 3);
    assert.ok(activity.detail.length >= 45);
    assert.ok(activity.notePrompt.endsWith('...') || activity.notePrompt.endsWith('?'));
  });
});
