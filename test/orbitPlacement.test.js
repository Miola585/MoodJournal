import test from 'node:test';
import assert from 'node:assert/strict';
import { findOpenOrbitAngle } from '../src/components/games/orbitPlacement.js';

const sizes = { A: { halfWidth: 30, top: 30, bottom: 45 }, B: { halfWidth: 30, top: 30, bottom: 45 } };
const planets = [{ name: 'A', orbit: 'far', angle: 180 }, { name: 'B', orbit: 'between', angle: 0 }];
const input = { planets, sizes, name: 'A', orbit: 'between', angle: 0, stage: { width: 400, height: 500 } };

test('orbit placement finds a nearby clear angle without moving the other planet', () => {
  const result = findOpenOrbitAngle(input);
  assert.ok(Math.abs(result) > 0 && Math.abs(result) < 90);
  assert.deepEqual(planets, [{ name: 'A', orbit: 'far', angle: 180 }, { name: 'B', orbit: 'between', angle: 0 }]);
  assert.equal(findOpenOrbitAngle({ ...input, angle: 180 }), 180);
});

test('orbit spacing checks neighboring rings, the center and occupied small screens', () => {
  assert.notEqual(findOpenOrbitAngle({ ...input, orbit: 'close' }), 0);
  assert.equal(findOpenOrbitAngle({ ...input, stage: { width: 60, height: 60 } }), null);
  assert.equal(findOpenOrbitAngle({ ...input, planets: [planets[0]], centerSize: { halfWidth: 200, top: 250, bottom: 250 } }), null);
});

test('orbit placement uses current viewport dimensions and accepts wrapped angles', () => {
  const phone = findOpenOrbitAngle({ ...input, stage: { width: 320, height: 500 } });
  const wide = findOpenOrbitAngle({ ...input, stage: { width: 1000, height: 700 } });
  assert.ok(Math.abs(phone) > Math.abs(wide));
  assert.equal(findOpenOrbitAngle({ ...input, angle: 540 }), 540);
  assert.equal(findOpenOrbitAngle({ ...input, angle: NaN }), null);
});
