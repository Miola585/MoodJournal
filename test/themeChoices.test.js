import test from 'node:test';
import assert from 'node:assert/strict';
import { themeChoices } from '../src/data/themeChoices.js';

test('the welcome experience offers every journal world exactly once', () => {
  assert.deepEqual(themeChoices.map((theme) => theme.key), ['warm', 'garden', 'sunrise', 'ocean', 'night']);
  assert.equal(new Set(themeChoices.map((theme) => theme.label)).size, 5);
  themeChoices.forEach((theme) => {
    assert.equal(theme.colors.length, 3);
    theme.colors.forEach((color) => assert.match(color, /^#[0-9a-f]{6}$/i));
    assert.ok(theme.description.length > 20);
  });
});

test('sunrise and cafe previews communicate different visual worlds', () => {
  const cafe = themeChoices.find((theme) => theme.key === 'warm');
  const sunrise = themeChoices.find((theme) => theme.key === 'sunrise');

  assert.ok(cafe.description.includes('Espresso'));
  assert.ok(sunrise.description.includes('Blue-sky'));
  assert.equal(cafe.colors.some((color) => sunrise.colors.includes(color)), false);
});
