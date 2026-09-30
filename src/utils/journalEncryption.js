const ENTRY_PREFIX = 'mj-e2ee:v1:';
const PRIVATE_VALUE_PREFIX = 'mj-e2ee-private:v1:';
const CONFIG_PREFIX = 'mj-e2ee-config:v1:';
const RECOVERY_PREFIX = 'MJ1.';
const DEFAULT_PBKDF2_ITERATIONS = 600000;
const MIN_PBKDF2_ITERATIONS = 100000;
const MAX_PBKDF2_ITERATIONS = 2000000;
const MAX_CONFIG_LENGTH = 4096;
const MAX_ENCRYPTED_ENTRY_LENGTH = 8 * 1024 * 1024;
const MAX_ENTRY_BYTES = 2 * 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const localEncryptionConfigKey = 'journalEncryptionConfigV1';
export const localEncryptedJournalKey = 'journalEncryptedStoreV1';

const getCrypto = () => {
  if (!globalThis.crypto?.subtle) throw new Error('This browser does not support secure journal encryption.');
  return globalThis.crypto;
};

const randomBytes = (length) => {
  const bytes = new Uint8Array(length);
  getCrypto().getRandomValues(bytes);
  return bytes;
};

const bytesToBase64Url = (bytes) => {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
};

const base64UrlToBytes = (value) => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new Error('Invalid encrypted data encoding.');
  }
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const encodeObject = (value) => bytesToBase64Url(encoder.encode(JSON.stringify(value)));
const decodeObject = (value) => JSON.parse(decoder.decode(base64UrlToBytes(value)));

const isValidIterations = (value) => Number.isInteger(value)
  && value >= MIN_PBKDF2_ITERATIONS
  && value <= MAX_PBKDF2_ITERATIONS;

const isValidWrappedKey = (value) => {
  if (!value || typeof value !== 'object') return false;
  try {
    return base64UrlToBytes(value.iv).length === 12
      && base64UrlToBytes(value.ciphertext).length === 48;
  } catch {
    return false;
  }
};

const isValidEncryptionConfig = (config) => {
  if (!config || typeof config !== 'object' || config.version !== 1) return false;
  if (config.kdf?.name !== 'PBKDF2' || config.kdf?.hash !== 'SHA-256') return false;
  if (!isValidIterations(config.kdf.iterations)) return false;
  try {
    if (base64UrlToBytes(config.kdf.salt).length !== 16) return false;
  } catch {
    return false;
  }
  return isValidWrappedKey(config.passphraseWrap) && isValidWrappedKey(config.recoveryWrap);
};

const assertEncryptionConfig = (config) => {
  if (!isValidEncryptionConfig(config)) {
    throw new Error('The journal encryption settings are damaged or unsupported.');
  }
};

const getIterations = (value) => {
  const iterations = value ?? DEFAULT_PBKDF2_ITERATIONS;
  if (!isValidIterations(iterations)) throw new Error('The encryption work factor is outside the supported range.');
  return iterations;
};

const derivePassphraseKey = async (passphrase, salt, iterations) => {
  const material = await getCrypto().subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return getCrypto().subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

const importAesKey = (rawKey, extractable = false) => getCrypto().subtle.importKey(
  'raw',
  rawKey,
  { name: 'AES-GCM' },
  extractable,
  ['encrypt', 'decrypt']
);

const wrapRawKey = async (rawDataKey, wrappingKey, context) => {
  const iv = randomBytes(12);
  const ciphertext = await getCrypto().subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(context) },
    wrappingKey,
    rawDataKey
  );
  return { iv: bytesToBase64Url(iv), ciphertext: bytesToBase64Url(new Uint8Array(ciphertext)) };
};

const unwrapRawKey = async (wrapped, wrappingKey, context) => {
  try {
    const rawDataKey = await getCrypto().subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64UrlToBytes(wrapped.iv),
        additionalData: encoder.encode(context)
      },
      wrappingKey,
      base64UrlToBytes(wrapped.ciphertext)
    );
    return importAesKey(rawDataKey, true);
  } catch {
    throw new Error('That passphrase or recovery key could not unlock this journal.');
  }
};

const assertPassphrase = (passphrase) => {
  if (typeof passphrase !== 'string' || passphrase.length < 12) {
    throw new Error('Use a journal passphrase with at least 12 characters.');
  }
};

export async function createJournalEncryption(passphrase, options = {}) {
  assertPassphrase(passphrase);
  const iterations = getIterations(options.iterations);
  const salt = randomBytes(16);
  const dataKeyBytes = randomBytes(32);
  const recoveryKeyBytes = randomBytes(32);
  const passphraseKey = await derivePassphraseKey(passphrase, salt, iterations);
  const recoveryWrappingKey = await importAesKey(recoveryKeyBytes);
  const config = {
    version: 1,
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations,
      salt: bytesToBase64Url(salt)
    },
    passphraseWrap: await wrapRawKey(dataKeyBytes, passphraseKey, 'mood-journal-passphrase-wrap:v1'),
    recoveryWrap: await wrapRawKey(dataKeyBytes, recoveryWrappingKey, 'mood-journal-recovery-wrap:v1')
  };
  return {
    config,
    dataKey: await importAesKey(dataKeyBytes, true),
    recoveryKey: `${RECOVERY_PREFIX}${bytesToBase64Url(recoveryKeyBytes)}`
  };
}

export async function unlockJournalWithPassphrase(config, passphrase) {
  assertEncryptionConfig(config);
  const passphraseKey = await derivePassphraseKey(
    passphrase,
    base64UrlToBytes(config.kdf.salt),
    config.kdf.iterations
  );
  return unwrapRawKey(config.passphraseWrap, passphraseKey, 'mood-journal-passphrase-wrap:v1');
}

export async function unlockJournalWithRecoveryKey(config, recoveryKey) {
  assertEncryptionConfig(config);
  const normalized = String(recoveryKey || '').trim().replace(/\s/g, '');
  if (!normalized.startsWith(RECOVERY_PREFIX)) throw new Error('Enter the complete recovery key beginning with MJ1.');
  try {
    const recoveryKeyBytes = base64UrlToBytes(normalized.slice(RECOVERY_PREFIX.length));
    if (recoveryKeyBytes.length !== 32) throw new Error('Invalid recovery key length.');
    const wrappingKey = await importAesKey(recoveryKeyBytes);
    return unwrapRawKey(config.recoveryWrap, wrappingKey, 'mood-journal-recovery-wrap:v1');
  } catch (error) {
    if (error?.message?.includes('could not unlock')) throw error;
    throw new Error('That recovery key is not valid.');
  }
}

export async function changeJournalPassphrase(config, dataKey, newPassphrase, options = {}) {
  assertEncryptionConfig(config);
  assertPassphrase(newPassphrase);
  const iterations = getIterations(options.iterations);
  const salt = randomBytes(16);
  const passphraseKey = await derivePassphraseKey(newPassphrase, salt, iterations);
  const rawDataKey = await getCrypto().subtle.exportKey('raw', dataKey);
  return {
    ...config,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: bytesToBase64Url(salt) },
    passphraseWrap: await wrapRawKey(rawDataKey, passphraseKey, 'mood-journal-passphrase-wrap:v1')
  };
}

export async function encryptJournalEntry(entry, dataKey) {
  const iv = randomBytes(12);
  const id = String(entry.id);
  const serializedEntry = JSON.stringify(entry);
  const entrySize = encoder.encode(serializedEntry).length;
  if (entrySize > MAX_ENTRY_BYTES) throw new Error('This journal entry is too large to encrypt safely.');
  const paddedSize = Math.ceil((entrySize + 128) / 1024) * 1024;
  const plaintext = JSON.stringify({ entry, padding: '0'.repeat(Math.max(0, paddedSize - entrySize)) });
  const ciphertext = await getCrypto().subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(`mood-journal-entry:v1:${id}`) },
    dataKey,
    encoder.encode(plaintext)
  );
  return `${ENTRY_PREFIX}${encodeObject({
    version: 1,
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(ciphertext))
  })}`;
}

export async function decryptJournalEntry(payload, dataKey, expectedId) {
  if (!isEncryptedPayload(payload)) throw new Error('This journal entry is not encrypted.');
  if (payload.length > MAX_ENCRYPTED_ENTRY_LENGTH) throw new Error('This encrypted journal entry is too large to open safely.');
  try {
    const envelope = decodeObject(payload.slice(ENTRY_PREFIX.length));
    if (envelope?.version !== 1) throw new Error('Unsupported encrypted entry version.');
    const iv = base64UrlToBytes(envelope.iv);
    const ciphertext = base64UrlToBytes(envelope.ciphertext);
    if (iv.length !== 12 || ciphertext.length < 16 || ciphertext.length > MAX_ENTRY_BYTES + 4096) {
      throw new Error('Invalid encrypted entry envelope.');
    }
    const plaintext = await getCrypto().subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData: encoder.encode(`mood-journal-entry:v1:${expectedId}`)
      },
      dataKey,
      ciphertext
    );
    const decoded = JSON.parse(decoder.decode(plaintext));
    const entry = decoded.entry || decoded;
    if (String(entry.id) !== String(expectedId)) throw new Error('Entry identity mismatch.');
    return entry;
  } catch {
    throw new Error('An encrypted journal entry could not be opened.');
  }
}

export async function encryptPrivateValue(value, dataKey, context) {
  const serialized = JSON.stringify(value);
  if (encoder.encode(serialized).length > MAX_ENTRY_BYTES) {
    throw new Error('This private item is too large to encrypt safely.');
  }
  const iv = randomBytes(12);
  const ciphertext = await getCrypto().subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(`mood-journal-private:v1:${context}`) },
    dataKey,
    encoder.encode(serialized)
  );
  return `${PRIVATE_VALUE_PREFIX}${encodeObject({
    version: 1,
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(ciphertext))
  })}`;
}

export async function decryptPrivateValue(payload, dataKey, context) {
  if (typeof payload !== 'string' || !payload.startsWith(PRIVATE_VALUE_PREFIX) || payload.length > MAX_ENCRYPTED_ENTRY_LENGTH) {
    throw new Error('This private item is not valid encrypted data.');
  }
  try {
    const envelope = decodeObject(payload.slice(PRIVATE_VALUE_PREFIX.length));
    const iv = base64UrlToBytes(envelope.iv);
    const ciphertext = base64UrlToBytes(envelope.ciphertext);
    if (envelope?.version !== 1 || iv.length !== 12 || ciphertext.length < 16 || ciphertext.length > MAX_ENTRY_BYTES + 32) {
      throw new Error('Invalid private item envelope.');
    }
    const plaintext = await getCrypto().subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: encoder.encode(`mood-journal-private:v1:${context}`) },
      dataKey,
      ciphertext
    );
    return JSON.parse(decoder.decode(plaintext));
  } catch {
    throw new Error('A private saved item could not be opened.');
  }
}

export const isEncryptedPayload = (value) => typeof value === 'string' && value.startsWith(ENTRY_PREFIX);
export const isEncryptionConfigPayload = (value) => typeof value === 'string' && value.startsWith(CONFIG_PREFIX);
export const serializeEncryptionConfig = (config) => `${CONFIG_PREFIX}${encodeObject(config)}`;
export const parseEncryptionConfig = (payload) => {
  if (!isEncryptionConfigPayload(payload) || payload.length > MAX_CONFIG_LENGTH) return null;
  try {
    const config = decodeObject(payload.slice(CONFIG_PREFIX.length));
    return isValidEncryptionConfig(config) ? config : null;
  } catch {
    return null;
  }
};

export const encryptionConfigRowId = (ownerId) => `journal-encryption-config:${ownerId}`;

export const createEncryptionConfigRow = (config, ownerId) => ({
  id: encryptionConfigRowId(ownerId),
  user_id: ownerId,
  entry_type: 'checkin',
  created: '1970-01-01T00:00:00.000Z',
  date_key: '1970-01-01',
  mood: 'Encrypted',
  specific_feeling: '',
  intensity: 5,
  factors: [],
  tags: [],
  note: serializeEncryptionConfig(config),
  coping_step: '',
  meals: '',
  water: '',
  sleep: '',
  primary: false,
  mood_score: null,
  updated_at: '1970-01-01T00:00:00.000Z'
});

export const createEncryptedEntryRow = (entry, ownerId, payload) => ({
  id: String(entry.id),
  user_id: ownerId,
  entry_type: 'checkin',
  created: '1970-01-01T00:00:00.000Z',
  date_key: '1970-01-01',
  mood: 'Encrypted',
  specific_feeling: '',
  intensity: 5,
  factors: [],
  tags: [],
  note: payload,
  coping_step: '',
  meals: '',
  water: '',
  sleep: '',
  primary: false,
  mood_score: null,
  updated_at: '1970-01-01T00:00:00.000Z'
});

export const isEncryptionConfigRow = (row) => isEncryptionConfigPayload(row?.note);
export const isEncryptedEntryRow = (row) => isEncryptedPayload(row?.note);

export async function encryptEntriesToRows(entries, ownerId, dataKey) {
  return Promise.all(entries.map(async (entry) => createEncryptedEntryRow(
    entry,
    ownerId,
    await encryptJournalEntry(entry, dataKey)
  )));
}

export async function decryptEntryRows(rows, dataKey) {
  const entries = await Promise.all(rows.filter(isEncryptedEntryRow).map((row) => decryptJournalEntry(row.note, dataKey, row.id)));
  return entries.sort((left, right) => new Date(right.created || 0) - new Date(left.created || 0));
}
