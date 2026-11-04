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

test('guest private storage migrates a legacy plaintext value when encryption is on', async () => {
  const storage = new MemoryStorage();
  storage.setItem('activityNotes:2026-09-30', JSON.stringify({ Calm: 'A private note' }));
  const { dataKey } = await createJournalEncryption('private storage passphrase', { iterations: 100000 });
  const privateStorage = createPrivateStorage({ ownerId: 'local-browser', encryptionEnabled: true, dataKey, storage });

  await privateStorage.migrateKnown();
  assert.deepEqual(await privateStorage.read('activityNotes:2026-09-30', {}), { Calm: 'A private note' });
  assert.equal(storage.getItem('activityNotes:2026-09-30'), null);
  assert.equal([...storage.values.values()].some((value) => value.includes('A private note')), false);
});

test('accounts cannot adopt or remove unowned legacy game data', async () => {
  const storage = new MemoryStorage();
  storage.setItem('gameMemoryJar', JSON.stringify([{ text: 'Guest memory' }]));
  const account = createPrivateStorage({ ownerId: 'user-1', storage });
  assert.deepEqual(await account.read('gameMemoryJar', []), []);
  await account.write('gameMemoryJar', [{ text: 'Account memory' }]);
  await account.remove('gameMemoryJar');
  assert.deepEqual(JSON.parse(storage.getItem('gameMemoryJar')), [{ text: 'Guest memory' }]);
});

test('encrypted device drafts can be removed without leaving plaintext copies', async () => {
  const storage = new MemoryStorage();
  const { dataKey } = await createJournalEncryption('private storage passphrase', { iterations: 100000 });
  const privateStorage = createPrivateStorage({ ownerId: 'user-1', encryptionEnabled: true, dataKey, storage });
  const record = { version: 1, formId: 'entry:1', savedAt: new Date().toISOString(), draft: { note: 'Private unfinished writing' } };
  await privateStorage.write('journalDraft:entry:1', record);
  assert.equal([...storage.values.values()].some((value) => value.includes(record.draft.note)), false);
  assert.deepEqual(await privateStorage.read('journalDraft:entry:1', null), record);
  await privateStorage.remove('journalDraft:entry:1');
  assert.equal(await privateStorage.read('journalDraft:entry:1', null), null);
});

test('garden care is separate for each account and ignores the unowned legacy flag', async () => {
  const storage = new MemoryStorage();
  const key = 'gardenCare:2026-10-04';
  storage.setItem('gardenTendedToday:2026-10-04', 'true');
  const firstUser = createPrivateStorage({ ownerId: 'user-1', storage });
  const secondUser = createPrivateStorage({ ownerId: 'user-2', storage });
  assert.equal(await firstUser.read(key, false), false);
  await firstUser.write(key, true);
  assert.equal(await firstUser.read(key, false), true);
  assert.equal(await secondUser.read(key, false), false);
});

test('completion records separate accounts and local days without adopting unowned progress', async () => {
  const storage = new MemoryStorage();
  const firstDay = 'activityCompletions:2026-11-01';
  const nextDay = 'activityCompletions:2026-11-02';
  storage.setItem(firstDay, JSON.stringify({ 'Guest activity': true }));
  const first = createPrivateStorage({ ownerId: 'account-a', storage });
  const second = createPrivateStorage({ ownerId: 'account-b', storage });
  assert.deepEqual(await first.read(firstDay, {}), {});
  await first.write(firstDay, { 'Account activity': true });
  assert.deepEqual(await second.read(firstDay, {}), {});
  assert.deepEqual(await first.read(nextDay, {}), {});
  assert.deepEqual(await first.read(firstDay, {}), { 'Account activity': true });
  const guest = createPrivateStorage({ storage });
  assert.deepEqual(await guest.read(firstDay, {}), { 'Guest activity': true });
  assert.equal(storage.getItem(firstDay), null);
  assert.deepEqual(await guest.read(firstDay, {}), { 'Guest activity': true });
});

test('guest completion migration inherits encryption and refuses reads while locked', async () => {
  const storage = new MemoryStorage();
  const key = 'activityCompletions:2026-11-01';
  storage.setItem(key, JSON.stringify({ 'A private activity': true }));
  const { dataKey } = await createJournalEncryption('private storage passphrase', { iterations: 100000 });
  const unlocked = createPrivateStorage({ storage, encryptionEnabled: true, dataKey });
  await unlocked.migrateKnown();
  assert.equal(storage.getItem(key), null);
  assert.equal([...storage.values.values()].some((value) => value.includes('A private activity')), false);
  assert.deepEqual(await unlocked.read(key, {}), { 'A private activity': true });
  const locked = createPrivateStorage({ storage, encryptionEnabled: true });
  await assert.rejects(locked.read(key, {}), /Unlock/);
});
