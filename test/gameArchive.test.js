import test from 'node:test';
import assert from 'node:assert/strict';
import { appendOrbitSnapshot, loadGameArchive, normalizeConstellations } from '../src/components/games/gameArchiveData.js';
import { planetSeeds } from '../src/components/games/gameUtils.js';
import { createPrivateStorage } from '../src/utils/privateStorage.js';
import { createJournalEncryption } from '../src/utils/journalEncryption.js';

class MemoryStorage {
  values = new Map();
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}
const makeLocks = () => {
  let queue = Promise.resolve();
  return { request: (_name, fn) => { const pending = queue.then(fn); queue = pending.catch(() => {}); return pending; } };
};

test('orbit history retains a legacy save and every new same-day snapshot', () => {
  const original = { planets: planetSeeds, reflection: 'Before' };
  const snapshot = { id: 'new', dateKey: '2026-10-12', createdAt: '2026-10-12T18:00:00Z', planets: planetSeeds, reflection: 'After' };
  const saved = appendOrbitSnapshot(original, snapshot);
  assert.equal(saved.history.length, 2);
  assert.equal(saved.history[0].reflection, 'Before');
  assert.equal(saved.reflection, 'After');
  assert.equal(original.history, undefined);
  assert.equal(appendOrbitSnapshot(saved, { ...snapshot, id: 'next' }).history.length, 3);
});

test('archives discover scoped and legacy orbits but never another account', async () => {
  const storage = new MemoryStorage();
  const guest = createPrivateStorage({ storage });
  const user = createPrivateStorage({ ownerId: 'user', storage });
  storage.setItem('moodOrbit:2026-01-01', JSON.stringify({ planets: planetSeeds, reflection: 'Legacy guest' }));
  await guest.write('moodOrbit:2026-02-01', { planets: planetSeeds, reflection: 'New guest' });
  await user.write('moodOrbit:2026-03-01', { planets: planetSeeds, reflection: 'Private user' });
  assert.deepEqual((await loadGameArchive(guest, 'orbit')).map((item) => item.reflection), ['New guest', 'Legacy guest']);
  assert.deepEqual((await loadGameArchive(user, 'orbit')).map((item) => item.reflection), ['Private user']);
});

test('game archives do not truncate constellations or memories and preserve star positions', async () => {
  const privateStorage = createPrivateStorage({ storage: new MemoryStorage() });
  const records = Array.from({ length: 40 }, (_, index) => ({ id: String(index), text: `Memory ${index}`, name: `Sky ${index}`, stars: [1, 2], starPositions: [{ id: 1, x: 23, y: 41 }], createdAt: '2026-10-12T12:00:00Z' }));
  await privateStorage.write('gameConstellations', records);
  await privateStorage.write('gameMemoryJar', records);
  assert.equal(normalizeConstellations(records).length, 40);
  assert.equal((await loadGameArchive(privateStorage, 'memory')).length, 40);
  const skies = await loadGameArchive(privateStorage, 'constellation');
  assert.equal(skies.length, 40);
  assert.deepEqual(skies[0].stars, [{ id: 1, x: 23, y: 41 }]);
});

test('serialized game appends preserve both saves and failed writes leave history intact', async () => {
  const storage = new MemoryStorage();
  const locks = makeLocks();
  const first = createPrivateStorage({ storage, locks });
  const second = createPrivateStorage({ storage, locks });
  await Promise.all([
    first.update('gameConstellations', [], (items) => [...items, { id: 'first' }]),
    second.update('gameConstellations', [], (items) => [...items, { id: 'second' }]),
  ]);
  const saved = await first.read('gameConstellations', []);
  assert.equal(saved.length, 2);
  storage.setItem = () => { throw new Error('Quota exceeded'); };
  await assert.rejects(first.update('gameConstellations', [], (items) => [...items, { id: 'lost' }]), /Quota/);
  assert.deepEqual(await first.read('gameConstellations', []), saved);
});

test('encrypted archives are readable only with an unlocked key and stay ciphertext in storage', async () => {
  const storage = new MemoryStorage();
  const { dataKey } = await createJournalEncryption('an archive passphrase', { iterations: 100000 });
  const privateStorage = createPrivateStorage({ ownerId: 'person', storage, encryptionEnabled: true, dataKey, locks: makeLocks() });
  await privateStorage.update('moodOrbit:2026-10-12', null, (saved) => appendOrbitSnapshot(saved, { id: 'one', dateKey: '2026-10-12', createdAt: '2026-10-12T12:00:00Z', planets: planetSeeds, reflection: 'Secret reflection' }));
  assert.equal([...storage.values.values()].some((value) => value.includes('Secret reflection')), false);
  assert.equal((await loadGameArchive(privateStorage, 'orbit'))[0].reflection, 'Secret reflection');
  const locked = createPrivateStorage({ ownerId: 'person', storage, encryptionEnabled: true });
  await assert.rejects(loadGameArchive(locked, 'orbit'), /Unlock/);
});

test('invalid game history and unavailable locking fail without replacement', async () => {
  assert.throws(() => normalizeConstellations(null), /could not be read/);
  assert.throws(() => appendOrbitSnapshot({ damaged: true }, { dateKey: '2026-10-12' }), /could not be read/);
  const privateStorage = createPrivateStorage({ storage: new MemoryStorage(), locks: null });
  await assert.rejects(privateStorage.update('gameMemoryJar', [], () => []), /Web Locks/);
});
