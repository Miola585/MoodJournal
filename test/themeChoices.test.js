import test from 'node:test';
import assert from 'node:assert/strict';
import { themeChoices } from '../src/data/themeChoices.js';

test('the welcome experience offers every journal world exactly once', () => {
  assert.deepEqual(themeChoices.map((theme) => theme.key), ['warm', 'garden', 'sunrise', 'ocean', 'night']);
  assert.equal(new Set(themeChoices.map((theme) => theme.label)).size, 5);
  themeChoices.forEach((theme) => {
    assert.equal(theme.colors.length, 3);
    assert.ok(theme.description.length > 20);
  });
});
