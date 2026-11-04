import test from 'node:test';
import assert from 'node:assert/strict';
import { duplicateMemory, memoryViews, monthlyJars, readMemoryRecords, removeMemoryRecord, resolveJar } from '../src/components/games/memoryJarData.js';
import { containMarble, createJarPhysics, JAR_WALL, MARBLE_RADIUS } from '../src/components/games/memoryJarPhysics.js';

const today = '2026-11-04';
const records = (count) => Array.from({ length: count }, (_, i) => ({ id: `memory-${i}`, text: `Moment ${i}`, dateKey: today, createdAt: `2026-11-04T12:00:${String(i).padStart(2, '0')}Z`, custom: { keep: true } }));

for (const [count, jars, last] of [[0, 1, 0], [24, 1, 24], [25, 2, 1], [49, 3, 1]]) test(`${count} memories have ${jars} jars, latest jar opens with ${last}`, () => {
  const input = records(count), before = JSON.stringify(input);
  const groups = monthlyJars(input, today);
  const selected = resolveJar(groups, new URLSearchParams(), today);
  assert.equal(selected.jars, jars); assert.equal(selected.jar, jars); assert.equal(selected.visible.length, last);
  assert.equal(selected.memories.length, count); assert.equal(JSON.stringify(input), before);
  assert.equal(resolveJar(groups, new URLSearchParams('jar=1'), today).visible[0]?.text, count ? 'Moment 0' : undefined);
});

test('legacy dates, local boundaries, undated records and exact metadata survive derived views', () => {
  const timestamp = '2026-11-01T02:00:00Z';
  const expected = new Date(timestamp), local = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, '0')}-${String(expected.getDate()).padStart(2, '0')}`;
  const input = [{ text: 'Legacy', createdAt: timestamp }, { text: 'Local', dateKey: '2026-10-31', createdAt: timestamp }, { text: 'Lost date', createdAt: 'bad' }, null, { text: 'Impossible date', dateKey: '2026-02-30' }];
  assert.equal(memoryViews(input)[0].dateKey, local);
  assert.equal(memoryViews(input)[1].dateKey, '2026-10-31');
  const groups = monthlyJars(input, today);
  assert.equal(groups.at(-1).month, 'undated'); assert.equal(groups.at(-1).memories.length, 3);
  assert.equal(groups.reduce((sum, group) => sum + group.memories.length, 0), input.length);
  assert.equal(readMemoryRecords(input), input); assert.throws(() => readMemoryRecords({}));
});

test('new month defaults and invalid direct links safely resolve without creating history', () => {
  const groups = monthlyJars(records(49), '2026-12-01');
  assert.equal(resolveJar(groups, new URLSearchParams(), '2026-12-01').memories.length, 0);
  assert.equal(resolveJar(groups, new URLSearchParams('month=garbage&jar=-1'), '2026-12-01').month, '2026-12');
  assert.equal(resolveJar(groups, new URLSearchParams('month=2026-11&jar=999'), '2026-12-01').jar, 3);
});

test('duplicates respect stored local dates and removal only removes the selected original record', () => {
  const input = records(2);
  assert.ok(duplicateMemory(input, ' MOMENT 0 ', today));
  assert.equal(duplicateMemory(input, 'Moment 0', '2026-11-05'), false);
  const target = memoryViews(input)[1];
  assert.deepEqual(removeMemoryRecord([{ id: 'extra', text: 'Earlier' }, ...input], target), [{ id: 'extra', text: 'Earlier' }, input[0]]);
  assert.throws(() => removeMemoryRecord([], target));
});

function assertContained(points) {
  for (const point of points) JAR_WALL.forEach(([x, y], i) => {
    const [nx, ny] = JAR_WALL[(i + 1) % JAR_WALL.length], length = Math.hypot(nx - x, ny - y);
    const distance = ((point.x - x) * -(ny - y) + (point.y - y) * (nx - x)) / length;
    assert.ok(distance >= MARBLE_RADIUS - .1, `Marble escaped: ${distance}`);
  });
}

test('full jar settles, repeated shuffles stay contained and collisions prevent sustained overlap', () => {
  const physics = createJarPhysics(24);
  for (let round = 0; round < 8; round++) {
    physics.shuffle();
    const points = physics.settle();
    assertContained(points);
    points.forEach((a, i) => points.slice(i + 1).forEach((b) => assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 34, 'Sustained overlap')));
  }
  for (let i = 0; i < 600 && !physics.sleeping(); i++) physics.tick();
  assert.ok(physics.sleeping());
  physics.dispose();
});

test('drag boundaries and released marbles remain contained without persistence', () => {
  const physics = createJarPhysics(8);
  for (const point of [{ x: -1000, y: -1000 }, { x: 2000, y: 2000 }, { x: 500, y: 0 }]) {
    assertContained([containMarble(point)]);
    physics.drag(0, point); assertContained(physics.read()); physics.release(); assertContained(physics.settle());
  }
  physics.dispose();
});
