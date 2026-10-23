import test from 'node:test';
import assert from 'node:assert/strict';
import { createJournalStorage, journalChanges, assertExplicitDeletion, readLocalJournal, JOURNAL_CONFLICT } from '../src/utils/journalStorage.js';
import { localEncryptedJournalKey } from '../src/utils/journalEncryption.js';
import { collectSupportDiagnostics } from '../src/utils/support.js';

const plainKey = 'journalEntriesV2';
const memory = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
};
const lockManager = () => {
  let tail = Promise.resolve();
  return { request: (_, fn) => { const result = tail.then(fn); tail = result.catch(() => {}); return result; } };
};
const local = (storage, locks = lockManager()) => createJournalStorage({ storage, locks, plainKey, ownerId: 'local-browser' });

test('local legacy journals migrate only on a successful save', async () => {
  const storage = memory();
  storage.setItem(plainKey, JSON.stringify([{ id: 'old', note: 'kept' }]));
  const store = local(storage);
  assert.deepEqual((await store.snapshot()).entries, [{ id: 'old', note: 'kept' }]);
  assert.ok(Array.isArray(JSON.parse(storage.getItem(plainKey))));
  await store.save({ entries: [{ id: 'old', note: 'updated' }] });
  assert.equal(JSON.parse(storage.getItem(plainKey)).revision, 1);
  assert.equal(readLocalJournal(storage, plainKey)[0].note, 'updated');
});

test('simultaneous tabs cannot overwrite a newer local journal', async () => {
  const storage = memory(); const locks = lockManager();
  const a = local(storage, locks); const b = local(storage, locks);
  const results = await Promise.allSettled([a.save({ entries: [{ id: 'a' }] }), b.save({ entries: [{ id: 'b' }] })]);
  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].reason.code, JOURNAL_CONFLICT);
  assert.deepEqual(readLocalJournal(storage, plainKey), [{ id: 'a' }]);
});

test('stale deletions and simultaneous encryption setup preserve the winner', async () => {
  const storage = memory(); const locks = lockManager();
  const a = local(storage, locks); const b = local(storage, locks);
  await a.save({ config: 'config-a', rows: [{ id: 'a', note: 'cipher-a' }] });
  const before = storage.getItem(localEncryptedJournalKey);
  await assert.rejects(b.save({ config: 'config-b', rows: [] }), { code: JOURNAL_CONFLICT });
  await assert.rejects(b.save({ entries: [] }), { code: JOURNAL_CONFLICT });
  assert.equal(storage.getItem(localEncryptedJournalKey), before);
});

test('replacement preview is non-mutating and empty replacements fail', async () => {
  const storage = memory(); const store = local(storage);
  await store.save({ entries: [{ id: 'keep' }] });
  const before = storage.getItem(plainKey);
  await store.save({ entries: [{ id: 'import' }], replacement: true, dryRun: true });
  await assert.rejects(store.save({ entries: [], replacement: true }), /empty backup/);
  assert.equal(storage.getItem(plainKey), before);
});

test('missing Web Locks, malformed storage and quota failures fail visibly', async () => {
  const storage = memory();
  await assert.rejects(local(storage, null).save({ entries: [] }), /cannot safely coordinate/);
  storage.setItem(plainKey, '{broken');
  await assert.rejects(local(storage).save({ entries: [] }));
  assert.equal(storage.getItem(plainKey), '{broken');
  storage.removeItem(plainKey);
  const store = local(storage);
  storage.setItem = () => { throw new Error('quota exceeded'); };
  await assert.rejects(store.save({ entries: [] }), /quota exceeded/);
});

test('changes only contain modified entries and explicit deletions', () => {
  assert.deepEqual(journalChanges([{ id: 'a', note: 'same' }, { id: 'b', note: 'old' }, { id: 'c' }], [{ id: 'a', note: 'same' }, { id: 'b', note: 'new' }]), {
    changed: [{ id: 'b', note: 'new' }], deleted: ['c']
  });
});

test('accidentally empty browser state is not permission to delete entries', () => {
  assert.throws(() => assertExplicitDeletion([{ id: 'a' }], []), /normal save cannot remove/);
  assert.throws(() => assertExplicitDeletion([{ id: 'a' }, { id: 'b' }], [], 'a'), /normal save cannot remove/);
  assert.doesNotThrow(() => assertExplicitDeletion([{ id: 'a' }], [], 'a'));
});

test('cloud saves use snapshots and versioned RPCs, never direct writes', async () => {
  const calls = [];
  const client = { rpc: async (name, args) => { calls.push([name, args]); return { data: name === 'get_journal_snapshot' ? { revision: '8', rows: [] } : '9' }; } };
  const store = createJournalStorage({ client, ownerId: 'user' });
  await assert.rejects(store.save({ rows: [] }), /Load the journal/);
  await store.snapshot();
  await store.save({ rows: [{ id: 'changed' }], deleted: ['removed'] });
  assert.deepEqual(calls[1], ['save_journal_changes', { changed_rows: [{ id: 'changed' }], deleted_ids: ['removed'], expected_revision: '8' }]);
  await store.save({ rows: [{ id: 'import' }], replacement: true, dryRun: true });
  assert.equal(calls[2][1].expected_revision, '9');
  assert.equal(calls[2][1].dry_run, true);
});

test('cloud conflicts, missing RPCs and uncertain network responses never retry blindly', async () => {
  for (const error of [{ code: JOURNAL_CONFLICT }, { code: 'PGRST202' }, { message: 'Network response lost' }]) {
    let writes = 0;
    const client = { rpc: async (name) => name === 'get_journal_snapshot' ? { data: { revision: '0', rows: [] } } : (writes++, { error }) };
    const store = createJournalStorage({ client, ownerId: 'user' });
    await store.snapshot();
    await assert.rejects(store.save({ rows: [] }));
    assert.equal(writes, 1);
  }
});

test('results from a previous account session are rejected', async () => {
  let respond;
  const client = { rpc: () => new Promise((resolve) => { respond = resolve; }) };
  const store = createJournalStorage({ client, ownerId: 'old-user' });
  const loading = store.snapshot();
  await Promise.resolve();
  store.deactivate();
  respond({ data: { revision: '0', rows: [] } });
  await assert.rejects(loading, { code: 'MJ_SESSION' });
});

test('local cleanup preserves entries changed while importing', async () => {
  const storage = memory(); const store = local(storage);
  storage.setItem(plainKey, 'new writing');
  await assert.rejects(store.removeImportedLocal('old writing'), { code: JOURNAL_CONFLICT });
  assert.equal(storage.getItem(plainKey), 'new writing');
});

test('diagnostics reject arbitrary values and URLs carrying secrets', () => {
  assert.deepEqual(collectSupportDiagnostics({ pathname: '/entries?token=secret#writing', theme: 'private text', mode: 'token', width: Infinity, height: -5, userAgent: 'secret' }), {
    page: 'unknown', theme: 'unknown', mode: 'unknown', browser: 'Other', viewport: '1x1'
  });
});

test('a snapshot captured before encryption stays stale even if another snapshot was loaded', async () => {
  const storage = memory(); const locks = lockManager();
  const a = local(storage, locks); const b = local(storage, locks);
  const beforeEncryption = b.capture();
  await a.save({ entries: [{ id: 'winner' }] });
  await b.snapshot();
  await assert.rejects(b.save({ config: 'stale key', rows: [], expectedSnapshot: beforeEncryption }), { code: JOURNAL_CONFLICT });
  assert.equal(readLocalJournal(storage, plainKey)[0].id, 'winner');
});

test('two simultaneous writes from the same snapshot do not silently overwrite', async () => {
  const storage = memory(); const store = local(storage);
  const results = await Promise.allSettled([store.save({ entries: [{ id: 'one' }] }), store.save({ entries: [{ id: 'two' }] })]);
  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].reason.code, JOURNAL_CONFLICT);
});

test('cloud preview leaves the expected revision unchanged', async () => {
  const writes = [];
  const client = { rpc: async (name, args) => {
    if (name === 'get_journal_snapshot') return { data: { revision: '4', rows: [] } };
    writes.push(args);
    return { data: args.dry_run ? '4' : '5' };
  } };
  const store = createJournalStorage({ client, ownerId: 'user' });
  await store.snapshot();
  await store.save({ rows: [{ id: 'import' }], replacement: true, dryRun: true });
  await store.save({ rows: [{ id: 'import' }], replacement: true });
  assert.equal(writes[1].expected_revision, '4');
});

test('orphaned encrypted cloud rows block saving instead of becoming an empty journal', async () => {
  const client = { rpc: async () => ({ data: { revision: '7', rows: [{ id: 'orphan', note: 'mj-e2ee:v1:broken' }] } }) };
  const store = createJournalStorage({ client, ownerId: 'user' });
  await assert.rejects(store.snapshot(), /damaged or missing/);
  await assert.rejects(store.save({ rows: [] }), /Load the journal/);
});
