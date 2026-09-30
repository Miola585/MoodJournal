import test from 'node:test';
import assert from 'node:assert/strict';
import {
  changeJournalPassphrase,
  createJournalEncryption,
  decryptEntryRows,
  encryptEntriesToRows,
  parseEncryptionConfig,
  serializeEncryptionConfig,
  unlockJournalWithPassphrase,
  unlockJournalWithRecoveryKey
} from '../src/utils/journalEncryption.js';

const entry = {
  id: 'entry-1',
  type: 'journal',
  created: '2026-09-30T12:00:00.000Z',
  dateKey: '2026-09-30',
  mood: 'Anxious',
  title: 'Private title',
  note: 'This is the private journal writing.',
  tags: ['private-tag'],
  bookmarked: true,
  factors: ['School'],
  copingStep: 'Take a walk'
};

test('encrypted journal rows round-trip without exposing sensitive fields', async () => {
  const { config, dataKey } = await createJournalEncryption('a long test passphrase', { iterations: 100000 });
  const rows = await encryptEntriesToRows([entry], 'user-1', dataKey);
  const serialized = JSON.stringify(rows);

  assert.equal(serialized.includes(entry.note), false);
  assert.equal(serialized.includes(entry.title), false);
  assert.equal(serialized.includes(entry.mood), false);
  assert.equal(serialized.includes(entry.tags[0]), false);
  assert.equal(serialized.includes(entry.dateKey), false);
  assert.equal(serialized.includes(entry.created), false);
  assert.equal(serialized.includes(entry.type), false);
  assert.equal(serialized.includes('bookmarked'), false);
  assert.equal(rows[0].date_key, '1970-01-01');
  assert.equal(rows[0].created, '1970-01-01T00:00:00.000Z');

  const unlockedKey = await unlockJournalWithPassphrase(config, 'a long test passphrase');
  assert.deepEqual(await decryptEntryRows(rows, unlockedKey), [entry]);
});

test('wrong passphrases fail closed', async () => {
  const { config } = await createJournalEncryption('correct test passphrase', { iterations: 100000 });
  await assert.rejects(
    unlockJournalWithPassphrase(config, 'incorrect test passphrase'),
    /could not unlock/
  );
});

test('recovery key unlocks the same encrypted entries', async () => {
  const { config, dataKey, recoveryKey } = await createJournalEncryption('another test passphrase', { iterations: 100000 });
  const rows = await encryptEntriesToRows([entry], 'user-1', dataKey);
  const recoveredKey = await unlockJournalWithRecoveryKey(config, recoveryKey);
  assert.deepEqual(await decryptEntryRows(rows, recoveredKey), [entry]);
});

test('encryption configuration serialization is versioned and reversible', async () => {
  const { config } = await createJournalEncryption('configuration passphrase', { iterations: 100000 });
  assert.deepEqual(parseEncryptionConfig(serializeEncryptionConfig(config)), config);
});

test('automatic account-password configuration keeps its unlock method without storing a password', async () => {
  const { config } = await createJournalEncryption('a sufficiently long account password', { iterations: 100000 });
  const automaticConfig = { ...config, unlockMethod: 'account-password' };
  const serialized = serializeEncryptionConfig(automaticConfig);

  assert.deepEqual(parseEncryptionConfig(serialized), automaticConfig);
  assert.doesNotMatch(serialized, /sufficiently long account password/u);
});

test('changing the passphrase keeps the existing data key and recovery key valid', async () => {
  const { config, dataKey, recoveryKey } = await createJournalEncryption('original test passphrase', { iterations: 100000 });
  const rows = await encryptEntriesToRows([entry], 'user-1', dataKey);
  const changedConfig = await changeJournalPassphrase(config, dataKey, 'replacement test passphrase', { iterations: 100000 });

  await assert.rejects(unlockJournalWithPassphrase(changedConfig, 'original test passphrase'), /could not unlock/);
  const changedPassphraseKey = await unlockJournalWithPassphrase(changedConfig, 'replacement test passphrase');
  assert.deepEqual(await decryptEntryRows(rows, changedPassphraseKey), [entry]);
  const recoveredKey = await unlockJournalWithRecoveryKey(changedConfig, recoveryKey);
  assert.deepEqual(await decryptEntryRows(rows, recoveredKey), [entry]);
});

test('malformed or unreasonable encryption settings are rejected before key derivation', async () => {
  const { config } = await createJournalEncryption('configuration passphrase', { iterations: 100000 });
  const unreasonable = { ...config, kdf: { ...config.kdf, iterations: 999999999 } };
  const malformed = { ...config, passphraseWrap: { ...config.passphraseWrap, iv: 'not base64!' } };

  assert.equal(parseEncryptionConfig(serializeEncryptionConfig(unreasonable)), null);
  assert.equal(parseEncryptionConfig(serializeEncryptionConfig(malformed)), null);
  await assert.rejects(unlockJournalWithPassphrase(unreasonable, 'configuration passphrase'), /damaged or unsupported/);
});
