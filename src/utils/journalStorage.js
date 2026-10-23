import { localEncryptedJournalKey, localEncryptionConfigKey, isEncryptionConfigRow, isEncryptedEntryRow, parseEncryptionConfig } from './journalEncryption.js';

export const JOURNAL_CONFLICT = 'MJ409';
export class JournalStorageError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}
export const conflictError = () => new JournalStorageError('The journal changed in another tab or device. Your unsaved work has been kept. Review the latest journal before saving again.', JOURNAL_CONFLICT);

export function journalStorageError(error) {
  if (error?.code === JOURNAL_CONFLICT) return conflictError();
  if (['42883', 'PGRST202', 'PGRST205', '42P01', '42501'].includes(error?.code)) {
    return new JournalStorageError('Cloud saving is unavailable until the journal security upgrade is installed. No unsafe fallback was used.', 'MJ_SETUP');
  }
  return error instanceof Error ? error : new JournalStorageError(error?.message || 'The journal could not be saved. Keep your draft and review the latest journal before retrying.', error?.code);
}

export function journalChanges(previous, next) {
  const old = new Map(previous.map((entry) => [String(entry.id), entry]));
  const ids = new Set(next.map((entry) => String(entry.id)));
  return {
    changed: next.filter((entry) => JSON.stringify(old.get(String(entry.id))) !== JSON.stringify(entry)),
    deleted: previous.filter((entry) => !ids.has(String(entry.id))).map((entry) => String(entry.id))
  };
}

export function assertExplicitDeletion(previous, next, deletedId) {
  const { deleted } = journalChanges(previous, next);
  if (deleted.length && (deleted.length !== 1 || deleted[0] !== String(deletedId))) {
    throw new Error('A normal save cannot remove journal entries. Use an explicit entry deletion or a confirmed backup replacement.');
  }
}

export function readLocalJournal(storage, plainKey) {
  const raw = storage.getItem(plainKey);
  if (raw === null) return [];
  const value = JSON.parse(raw);
  const entries = Array.isArray(value) ? value : value?.version === 2 && Number.isSafeInteger(value.revision) && value.revision >= 0 ? value.entries : null;
  if (Array.isArray(entries) && entries.every((entry) => entry && typeof entry === 'object' && !Array.isArray(entry) && typeof entry.id === 'string' && entry.id)) return entries;
  throw new Error('The local journal is damaged. Export or preserve this browser data before changing it.');
}

// Compare the complete stored record, including legacy data and key settings.
const localToken = (storage, plainKey) => JSON.stringify([
  storage.getItem(plainKey), storage.getItem(localEncryptedJournalKey), storage.getItem(localEncryptionConfigKey)
]);

export function createJournalStorage({ client = null, ownerId, plainKey, storage = globalThis.localStorage, locks = globalThis.navigator?.locks }) {
  let active = true;
  let revision = null;
  let token = client ? null : localToken(storage, plainKey);
  let queue = Promise.resolve();
  const assertActive = () => { if (!active) throw new JournalStorageError('The account session changed. This save was cancelled.', 'MJ_SESSION'); };
  const serialize = (operation) => {
    const result = queue.then(() => { assertActive(); return operation(); });
    queue = result.catch(() => {});
    return result;
  };
  const rpc = async (name, args) => {
    assertActive();
    const { data, error } = await client.rpc(name, args);
    assertActive();
    if (error) throw journalStorageError(error);
    return data;
  };
  const snapshot = () => serialize(async () => {
    if (client) {
      const result = await rpc('get_journal_snapshot');
      if (!result || !Array.isArray(result.rows) || !/^\d+$/.test(String(result.revision))) throw new Error('The server returned an invalid journal snapshot. Saving is blocked.');
      const configs = result.rows.filter(isEncryptionConfigRow);
      if (configs.length || result.rows.some(isEncryptedEntryRow)) {
        if (configs.length !== 1 || !parseEncryptionConfig(configs[0].note)
          || result.rows.some((row) => !isEncryptionConfigRow(row) && !isEncryptedEntryRow(row))) {
          throw new Error('Encrypted journal rows or key settings are damaged or missing. Keep the stored data; saving is blocked.');
        }
      }
      revision = String(result.revision);
      return result;
    }
    token = localToken(storage, plainKey);
    const encrypted = storage.getItem(localEncryptedJournalKey);
    if (encrypted !== null) {
      const value = JSON.parse(encrypted);
      if (value?.version !== 1 || !parseEncryptionConfig(value.config) || !Array.isArray(value.rows) || value.rows.some((row) => !isEncryptedEntryRow(row))) {
        throw new Error('Encrypted journal rows or key settings are damaged. Keep the stored data; saving is blocked.');
      }
    }
    return { entries: readLocalJournal(storage, plainKey), encrypted: encrypted === null ? null : JSON.parse(encrypted), legacyConfig: storage.getItem(localEncryptionConfigKey) };
  });
  const capture = () => ({ revision, token });
  const save = ({ rows = [], deleted = [], replacement = false, dryRun = false, entries, config, expectedSnapshot = capture() } = {}) => {
    const expected = expectedSnapshot.revision;
    const expectedToken = expectedSnapshot.token;
    return serialize(async () => {
      if (client) {
        if (expected === null) throw new Error('Load the journal successfully before saving.');
        const result = await rpc(replacement ? 'replace_journal_entries' : 'save_journal_changes', replacement
          ? { replacement_rows: rows, expected_revision: expected, dry_run: dryRun }
          : { changed_rows: rows, deleted_ids: deleted, expected_revision: expected });
        if (!/^\d+$/.test(String(result))) throw new Error('The save result could not be confirmed. Review the latest journal before retrying.');
        if (!dryRun) revision = String(result);
        return;
      }
      if (!locks?.request) throw new Error('This browser cannot safely coordinate journal saves. You can still read and export your journal; use a browser with Web Locks on HTTPS or localhost to save.');
      await locks.request(`mood-journal:${ownerId}`, async () => {
        assertActive();
        if (localToken(storage, plainKey) !== expectedToken) throw conflictError();
        readLocalJournal(storage, plainKey);
        if (replacement && !entries?.length) throw new Error('An empty backup cannot replace your journal.');
        if (dryRun) return;
        const old = JSON.parse(storage.getItem(config ? localEncryptedJournalKey : plainKey) || 'null');
        const nextRevision = (Number.isSafeInteger(old?.revision) ? old.revision : 0) + 1;
        if (config) {
          storage.setItem(localEncryptedJournalKey, JSON.stringify({ version: 1, revision: nextRevision, config, rows }));
          storage.removeItem(plainKey);
          storage.removeItem(localEncryptionConfigKey);
        } else {
          if (storage.getItem(localEncryptedJournalKey) || storage.getItem(localEncryptionConfigKey)) throw new Error('Unlock the encrypted journal before saving.');
          storage.setItem(plainKey, JSON.stringify({ version: 2, revision: nextRevision, entries }));
        }
        token = localToken(storage, plainKey);
      });
    });
  };
  const removeImportedLocal = (expectedRaw) => serialize(async () => {
    if (!locks?.request) throw new Error('Import saved, but this browser cannot safely remove the local copy. It has been kept.');
    await locks.request('mood-journal:local-browser', () => {
      assertActive();
      if (storage.getItem(plainKey) !== expectedRaw) throw conflictError();
      storage.removeItem(plainKey);
    });
  });
  return { snapshot, capture, save, removeImportedLocal, deactivate: () => { active = false; }, isActive: () => active };
}
