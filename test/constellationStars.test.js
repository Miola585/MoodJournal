import test from 'node:test';
import assert from 'node:assert/strict';
import { constellationStars } from '../src/components/games/gameUtils.js';

test('expanded sky preserves every legacy star ID and coordinate', () => {
  const legacy = [[12, 34], [30, 29], [52, 37], [76, 31], [91, 40], [20, 43], [39, 46], [62, 43], [82, 48], [8, 55], [27, 52], [47, 58], [69, 54], [92, 59], [16, 65], [34, 63], [57, 68], [78, 65], [6, 75], [24, 77], [44, 73], [63, 79], [85, 76], [14, 83], [51, 84], [74, 83]];
  legacy.forEach(([x, y], index) => {
    const star = constellationStars.find((value) => value.id === index + 1);
    assert.deepEqual([star.x, star.y], [x, y]);
  });
  assert.equal(constellationStars.length, 32);
  assert.equal(new Set(constellationStars.map((star) => star.id)).size, 32);
  assert.ok(constellationStars.every((star) => star.x >= 6 && star.x <= 94 && star.y >= 29 && star.y <= 84));
});
