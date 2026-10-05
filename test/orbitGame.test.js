import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeStoredOrbit, orbitRings, planetSeeds } from '../src/components/games/gameUtils.js';

test('mood orbit keeps three distances and migrates older saved rings', () => {
  assert.deepEqual(orbitRings, ['close', 'between', 'far']);
  const saved = [
    { name: 'Emotion', orbit: 'near', angle: 42 },
    { name: 'Thought', orbit: 'middle', angle: -12 },
    { name: 'Goal', orbit: 'far', angle: 190 }
  ];
  const restored = normalizeStoredOrbit(saved);
  assert.equal(restored.length, planetSeeds.length);
  assert.deepEqual(restored.slice(0, 3).map(({ orbit, angle }) => ({ orbit, angle })), [
    { orbit: 'between', angle: 42 },
    { orbit: 'between', angle: -12 },
    { orbit: 'far', angle: 190 }
  ]);
});

test('mood orbit rejects unknown saved rings and invalid angles', () => {
  const restored = normalizeStoredOrbit({ planets: [{ name: 'Emotion', orbit: 'unknown', angle: Infinity }] });
  assert.equal(restored[0].orbit, planetSeeds[0].orbit);
  assert.equal(restored[0].angle, planetSeeds[0].angle);
});
