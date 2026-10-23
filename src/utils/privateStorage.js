import { decryptPrivateValue, encryptPrivateValue } from './journalEncryption.js';

const plainPrefix = 'moodJournalPrivateV1';
const encryptedPrefix = 'moodJournalPrivateEncryptedV1';

const scopedKey = (prefix, ownerId, key) => `${prefix}:${encodeURIComponent(ownerId)}:${encodeURIComponent(key)}`;

const parseStoredValue = (raw, fallback) => {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('A private saved item is damaged and could not be read.');
  }
};

export function createPrivateStorage({ ownerId, encryptionEnabled, dataKey, storage = globalThis.localStorage, locks = globalThis.navigator?.locks }) {
  const owner = ownerId || 'local-browser';
  const legacyValue = (key) => owner === 'local-browser' ? storage.getItem(key) : null;
  const removeLegacy = (key) => { if (owner === 'local-browser') storage.removeItem(key); };
  const plainKeyFor = (key) => scopedKey(plainPrefix, owner, key);
  const encryptedKeyFor = (key) => scopedKey(encryptedPrefix, owner, key);
  const contextFor = (key) => `${owner}:${key}`;

  const write = async (key, value) => {
    if (encryptionEnabled) {
      if (!dataKey) throw new Error('Unlock the journal before saving private activity data.');
      const payload = await encryptPrivateValue(value, dataKey, contextFor(key));
      storage.setItem(encryptedKeyFor(key), payload);
      storage.removeItem(plainKeyFor(key));
      removeLegacy(key);
      return;
    }
    storage.setItem(plainKeyFor(key), JSON.stringify(value));
    removeLegacy(key);
  };

  const read = async (key, fallback) => {
    if (encryptionEnabled) {
      if (!dataKey) throw new Error('Unlock the journal before opening private activity data.');
      const encrypted = storage.getItem(encryptedKeyFor(key));
      if (encrypted !== null) return decryptPrivateValue(encrypted, dataKey, contextFor(key));
      const legacyRaw = storage.getItem(plainKeyFor(key)) ?? legacyValue(key);
      if (legacyRaw === null) return fallback;
      const value = parseStoredValue(legacyRaw, fallback);
      await write(key, value);
      return value;
    }

    const current = storage.getItem(plainKeyFor(key));
    if (current !== null) return parseStoredValue(current, fallback);
    const legacy = legacyValue(key);
    if (legacy === null) return fallback;
    const value = parseStoredValue(legacy, fallback);
    await write(key, value);
    return value;
  };

  const remove = async (key) => {
    storage.removeItem(encryptedKeyFor(key));
    storage.removeItem(plainKeyFor(key));
    removeLegacy(key);
  };

  const migrateKnown = async () => {
    if (!encryptionEnabled || !dataKey || typeof storage.key !== 'function') return;
    const privateNames = new Set(['gameMemoryJar', 'gameConstellations']);
    const ownerPlainPrefix = `${plainPrefix}:${encodeURIComponent(owner)}:`;
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(Boolean);
    keys.forEach((storedKey) => {
      if (storedKey.startsWith('activityNotes:') || storedKey.startsWith('moodOrbit:')) privateNames.add(storedKey);
      if (storedKey.startsWith(ownerPlainPrefix)) {
        privateNames.add(decodeURIComponent(storedKey.slice(ownerPlainPrefix.length)));
      }
    });
    await Promise.all([...privateNames].map(async (key) => {
      const hasPlaintext = storage.getItem(plainKeyFor(key)) !== null || legacyValue(key) !== null;
      if (hasPlaintext) await read(key, null);
    }));
  };

  const listKeys = (prefix) => {
    const names = new Set();
    const prefixes = [plainPrefix, encryptedPrefix].map((value) => `${value}:${encodeURIComponent(owner)}:`);
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      const scopedPrefix = prefixes.find((value) => key?.startsWith(value));
      if (scopedPrefix) {
        const name = decodeURIComponent(key.slice(scopedPrefix.length));
        if (name.startsWith(prefix)) names.add(name);
      } else if (owner === 'local-browser' && key?.startsWith(prefix)) names.add(key);
    }
    return [...names].sort();
  };

  const update = async (key, fallback, change) => {
    if (!locks?.request) throw new Error('This browser cannot safely save game history. Use HTTPS or localhost in a browser with Web Locks. Your current creation has not been cleared.');
    return locks.request(`mood-journal-private:${owner}:${key}`, async () => {
      const next = change(await read(key, fallback));
      await write(key, next);
      return next;
    });
  };

  return { read, write, update, listKeys, remove, migrateKnown, ownerId: owner, encrypted: Boolean(encryptionEnabled) };
}
