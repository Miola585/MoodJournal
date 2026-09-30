import test from 'node:test';
import assert from 'node:assert/strict';
import { createJournalEncryption } from '../src/utils/journalEncryption.js';
import { createPrivateStorage } from '../src/utils/privateStorage.js';

class MemoryStorage {
  values = new Map();
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

test('private storage encrypts sensitive local data and separates owners', async () => {
  const storage = new MemoryStorage();
  const { dataKey } = await createJournalEncryption('private storage passphrase', { iterations: 100000 });
  const firstUser = createPrivateStorage({ ownerId: 'user-1', encryptionEnabled: true, dataKey, storage });
  const secondUser = createPrivateStorage({ ownerId: 'user-2', encryptionEnabled: true, dataKey, storage });
  await firstUser.write('gameMemoryJar', [{ text: 'A private memory' }]);

  assert.equal([...storage.values.values()].some((value) => value.includes('A private memory')), false);
  assert.deepEqual(await firstUser.read('gameMemoryJar', []), [{ text: 'A private memory' }]);
  assert.deepEqual(await secondUser.read('gameMemoryJar', []), []);
});

test('private storage migrates a legacy plaintext value when encryption is on', async () => {
  const storage = new MemoryStorage();
  storage.setItem('activityNotes:2026-09-30', JSON.stringify({ Calm: 'A private note' }));
  const { dataKey } = await createJournalEncryption('private storage passphrase', { iterations: 100000 });
  const privateStorage = createPrivateStorage({ ownerId: 'user-1', encryptionEnabled: true, dataKey, storage });

  await privateStorage.migrateKnown();
  assert.deepEqual(await privateStorage.read('activityNotes:2026-09-30', {}), { Calm: 'A private note' });
  assert.equal(storage.getItem('activityNotes:2026-09-30'), null);
  assert.equal([...storage.values.values()].some((value) => value.includes('A private note')), false);
});
