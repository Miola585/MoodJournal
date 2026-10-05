import test from 'node:test';
import assert from 'node:assert/strict';
import { getGalaxyStarShape } from '../src/components/games/gameUtils.js';

test('personal night sky uses four, five, and six points by intensity', () => {
  for (const [intensity, expected] of [[1, 4], [3, 4], [4, 5], [7, 5], [8, 6], [10, 6]]) {
    const shape = getGalaxyStarShape(intensity);
    assert.equal(shape.points, expected);
    assert.equal(shape.polygon.split(' ').length, expected * 2);
    assert.doesNotMatch(shape.polygon, /NaN|Infinity/u);
  }
});
