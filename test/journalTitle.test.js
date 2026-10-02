import test from 'node:test';
import assert from 'node:assert/strict';
import { checkInTitleAfterMoodChange } from '../src/data/journalData.js';

test('changing a check-in mood clears an old preset sub-emotion title', () => {
  assert.equal(checkInTitleAfterMoodChange('Distant', 'Numb', 'Calm'), '');
});

test('changing a check-in mood preserves a title written by the user', () => {
  assert.equal(checkInTitleAfterMoodChange('A long morning', 'Numb', 'Calm'), 'A long morning');
  assert.equal(checkInTitleAfterMoodChange('Distant', 'Numb', 'Numb'), 'Distant');
});
