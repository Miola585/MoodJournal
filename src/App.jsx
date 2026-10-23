import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, ExternalLink, MessageCircleQuestionMark, Moon, Settings as SettingsIcon, Sun, Sunset } from 'lucide-react';
import { appViews, createEntry, localEntriesKey, logoUrl, moods, viewPaths } from './data/journalData';
import { getPrimaryEntry, groupEntriesByDate, isCheckIn, isJournalDateAllowed, normalizeDailyPrimaries, normalizeReminder, readStorage, removeJournalEntry, rowToEntry, todayKey, upsertJournalEntry, viewFromPath } from './utils/journalUtils';
import {
  changeJournalPassphrase,
  createEncryptionConfigRow,
  createJournalEncryption,
  decryptEntryRows,
  encryptEntriesToRows,
  isEncryptedEntryRow,
  isEncryptionConfigPayload,
  isEncryptionConfigRow,
  localEncryptionConfigKey,
  localEncryptedJournalKey,
  parseEncryptionConfig,
  serializeEncryptionConfig,
  unlockJournalWithPassphrase,
  unlockJournalWithRecoveryKey
} from './utils/journalEncryption';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import { AppNav } from './components/layout/AppNav';
import { ThemeAtmosphere } from './components/layout/ThemeAtmosphere';
import { JournalPrivacyGate, LockScreen } from './components/layout/JournalLocks';
import { JournalEncryptionGate, RecoveryKeyNotice } from './components/layout/JournalEncryptionGate';
import { AccountStatus } from './components/layout/AccountStatus';
import { ReminderBell } from './components/layout/ReminderBell';
import { ProfileMenu } from './components/layout/ProfileMenu';
import { AuthScreen } from './components/auth/AuthScreen';
import { PasswordUpdateScreen } from './components/auth/PasswordUpdateScreen';
import { AdminPanel } from './components/auth/AdminPanel';
import { Support } from './screens/Support';
import { countNewSupportRequests } from './utils/supportApi';
import { supportErrorMessage } from './utils/support';
import { Home } from './screens/Home';
import { About } from './screens/About';
import { Newsletter } from './screens/Newsletter';
import { CheckIn } from './screens/CheckIn';
import { Calendar } from './screens/Calendar';
import { Activities } from './screens/Activities';
import { Settings } from './screens/Settings';
import { createPrivateStorage } from './utils/privateStorage';
import { confirmJournalNavigation } from './hooks/useJournalDraft';
import { flushJournalDrafts } from './hooks/useJournalDraft';
import { createJournalStorage, journalChanges, assertExplicitDeletion, JOURNAL_CONFLICT, journalStorageError, readLocalJournal, conflictError } from './utils/journalStorage';
import { JournalConflictDialog } from './components/layout/JournalConflictDialog';
import { compareJournalImports } from './utils/journalImport';

const Games = lazy(() => import('./components/games/Games').then((module) => ({ default: module.Games })));
const Entries = lazy(() => import('./screens/Entries').then((module) => ({ default: module.Entries })));
const Summary = lazy(() => import('./screens/Summary').then((module) => ({ default: module.Summary })));
const encryptionRevisionKey = 'journalEncryptionRevision';
const invalidEncryptionConfig = { version: 0, invalid: true };

const storedEncryptedJournal = () => {
  try { JSON.parse(localStorage.getItem(localEncryptedJournalKey) || 'null'); }
  catch { return { config: invalidEncryptionConfig, rows: [] }; }
  const stored = readStorage(localEncryptedJournalKey, null);
  if (localStorage.getItem(localEncryptedJournalKey) !== null && (stored?.version !== 1 || !Array.isArray(stored.rows) || stored.rows.some((row) => !isEncryptedEntryRow(row)) || typeof stored.config !== 'string')) return { config: invalidEncryptionConfig, rows: [] };
  const configPayload = stored?.config || localStorage.getItem(localEncryptionConfigKey) || '';
  const config = parseEncryptionConfig(configPayload);
  if (!config && !isEncryptionConfigPayload(configPayload)) return configPayload || stored ? { config: invalidEncryptionConfig, rows: [] } : null;
  return {
    config: config || invalidEncryptionConfig,
    rows: Array.isArray(stored?.rows) ? stored.rows : readStorage(localEntriesKey, [])
  };
};

const storedEncryptionConfig = () => storedEncryptedJournal()?.config || null;
const localJournalEntries = () => {
  try { return readLocalJournal(localStorage, localEntriesKey); }
  catch { return []; }
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const view = viewFromPath(location.pathname, viewPaths);
  const [authMode, setAuthMode] = useState('signin');
  const [entries, setEntries] = useState(() => isSupabaseConfigured || storedEncryptionConfig() ? [] : normalizeDailyPrimaries(localJournalEntries()));
  const [localEntries, setLocalEntries] = useState(localJournalEntries);
  const [encryptionConfig, setEncryptionConfig] = useState(() => isSupabaseConfigured ? null : storedEncryptionConfig());
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [encryptedRows, setEncryptedRows] = useState(() => !isSupabaseConfigured ? storedEncryptedJournal()?.rows || [] : []);
  const [encryptionBusy, setEncryptionBusy] = useState(false);
  const [encryptionError, setEncryptionError] = useState(() => storedEncryptionConfig()?.invalid
    ? 'The stored encryption settings are damaged. Keep this browser data and your recovery material; do not overwrite the journal.'
    : '');
  const [session, setSession] = useState(null);
  const [accountDataLoadedFor, setAccountDataLoadedFor] = useState(null);
  const [authEncryptionCredential, setAuthEncryptionCredential] = useState('');
  const [automaticSetupAttemptedFor, setAutomaticSetupAttemptedFor] = useState(null);
  const [pendingRecoveryKey, setPendingRecoveryKey] = useState('');
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState(() => {
    try { readLocalJournal(localStorage, localEntriesKey); return ''; }
    catch (error) { return error.message; }
  });
  const [importMessage, setImportMessage] = useState('');
  const [profile, setProfile] = useState(null);
  const [newSupportCount, setNewSupportCount] = useState(0);
  const [supportCountError, setSupportCountError] = useState('');
  const [supportRefreshRevision, setSupportRefreshRevision] = useState(0);
  const [supportOriginPage, setSupportOriginPage] = useState(() => location.pathname);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [siteTheme, setSiteTheme] = useState(() => localStorage.getItem('siteTheme') || 'warm');
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem('reduceMotion') === 'true');
  const [fontScale, setFontScale] = useState(() => Number(localStorage.getItem('fontScale') || 1));
  const [fontStyle, setFontStyle] = useState(() => localStorage.getItem('fontStyle') || 'friendly');
  const [pin, setPin] = useState(() => localStorage.getItem('journalPin') || '');
  const [locked, setLocked] = useState(() => Boolean(localStorage.getItem('journalPin')));
  // Journal lock is a local UI privacy layer. It hides journal content on this device,
  // while Supabase RLS remains the database rule that prevents users from reading other users' entries.
  const [journalLockCode, setJournalLockCode] = useState(() => localStorage.getItem('journalPrivacyCode') || '');
  const [journalUnlocked, setJournalUnlocked] = useState(() => !localStorage.getItem('journalPrivacyCode'));
  const [reminder, setReminder] = useState(() => normalizeReminder(readStorage('journalReminder', { enabled: false, time: '19:00', times: ['19:00'] })));

  const user = session?.user || null;
  const storageRef = useRef(null);
  const ownerId = isSupabaseConfigured ? user?.id || 'signed-out' : 'local-browser';
  if (storageRef.current?.ownerId !== ownerId || !storageRef.current?.store.isActive()) {
    storageRef.current?.store.deactivate();
    storageRef.current = { ownerId, store: createJournalStorage({ client: isSupabaseConfigured ? supabase : null, ownerId, plainKey: localEntriesKey }) };
  }
  const journalStore = storageRef.current.store;
  const renderSnapshot = journalStore.capture();
  const saveBusy = useMemo(() => ({ current: false }), [journalStore]);
  const lastSaveError = useRef(null);
  const conflictBlocked = useRef(false);
  const [conflict, setConflict] = useState(null);
  const conflictResolver = useRef(null);
  const [externalLock, setExternalLock] = useState(false);
  const privateStorage = useMemo(() => createPrivateStorage({
    ownerId: user?.id || 'local-browser',
    encryptionEnabled: Boolean(encryptionConfig),
    dataKey: encryptionKey
  }), [user?.id, encryptionConfig, encryptionKey]);
  const notifyOtherTabsOfEncryptionChange = () => {
    try { localStorage.setItem(encryptionRevisionKey, JSON.stringify({ ownerId, nonce: crypto.randomUUID() })); }
    catch { setDataError('Journal protection changed, but other tabs could not be notified. Close other journal tabs manually.'); }
  };
  const persistEncryptedJournal = async (nextEntries, config = encryptionConfig, dataKey = encryptionKey, { replacement = false, dryRun = false, expectedSnapshot = renderSnapshot } = {}) => {
    if (!config || config.invalid || !dataKey) throw new Error('Unlock your encrypted journal before changing it.');
    if (conflictBlocked.current && !dryRun) throw conflictError();
    const delta = journalChanges(entries, nextEntries);
    const initializing = !encryptionConfig;
    const changed = await encryptEntriesToRows(replacement || initializing ? nextEntries : delta.changed, user?.id || 'local-browser', dataKey);
    if (!journalStore.isActive()) throw new Error('The account session changed.');
    const changedIds = new Set(changed.map((row) => row.id));
    const remainingIds = new Set(nextEntries.map((entry) => String(entry.id)));
    const rows = replacement || initializing ? changed : [...encryptedRows.filter((row) => remainingIds.has(row.id) && !changedIds.has(row.id)), ...changed];
    const configChanged = serializeEncryptionConfig(config) !== (encryptionConfig ? serializeEncryptionConfig(encryptionConfig) : null);
    const cloudRows = [...(isSupabaseConfigured && (replacement || configChanged) ? [createEncryptionConfigRow(config, user.id)] : []), ...changed];
    await journalStore.save({
      rows: isSupabaseConfigured ? cloudRows : rows, deleted: delta.deleted,
      entries: nextEntries, config: serializeEncryptionConfig(config), replacement, dryRun, expectedSnapshot
    });
    if (!journalStore.isActive()) throw new Error('The account session changed.');
    if (!dryRun) { setEncryptedRows(rows); setEntries(nextEntries); setDataError(''); }
    return rows;
  };

  const recordSaveError = (error) => {
    if (!journalStore.isActive()) return;
    const safe = journalStorageError(error);
    lastSaveError.current = safe;
    setDataError(safe.message);
    if (safe.code === JOURNAL_CONFLICT) {
      conflictBlocked.current = true;
      setConflict((current) => current || { entry: null, latest: null, error: '' });
    }
  };

  const saveEntries = async (nextEntries, { deletedId } = {}) => {
    if (saveBusy.current) { setDataError('A journal save is already in progress. Please wait before saving again.'); return false; }
    saveBusy.current = true;
    lastSaveError.current = null;
    try {
      if (conflictBlocked.current) throw conflictError();
      const normalized = normalizeDailyPrimaries(nextEntries);
      assertExplicitDeletion(entries, normalized, deletedId);
      if (isSupabaseConfigured && user && (!encryptionConfig || !encryptionKey)) throw new Error('Unlock your encrypted journal before saving.');
      if (encryptionConfig) await persistEncryptedJournal(normalized);
      else {
        await journalStore.save({ entries: normalized, expectedSnapshot: renderSnapshot });
        if (journalStore.isActive()) { setEntries(normalized); setDataError(''); }
      }
      return journalStore.isActive();
    } catch (error) { recordSaveError(error); return false; }
    finally { saveBusy.current = false; }
  };

  const replaceJournalEntries = async (nextEntries, dryRun = false) => {
    if (!nextEntries.length) return { ok: false, error: 'An empty backup cannot replace your journal.' };
    if (saveBusy.current) return { ok: false, error: 'Wait for the current save to finish.' };
    saveBusy.current = true;
    try {
      if (conflictBlocked.current) throw conflictError();
      const normalized = normalizeDailyPrimaries(nextEntries);
      if (encryptionConfig) await persistEncryptedJournal(normalized, encryptionConfig, encryptionKey, { replacement: true, dryRun });
      else {
        if (isSupabaseConfigured) throw new Error('Unlock your encrypted journal before replacing it.');
        await journalStore.save({ entries: normalized, replacement: true, dryRun, expectedSnapshot: renderSnapshot });
        if (!dryRun && journalStore.isActive()) setEntries(normalized);
      }
      return { ok: true, unavailable: false };
    } catch (error) {
      recordSaveError(error);
      return { ok: false, unavailable: error.code === 'MJ_SETUP', error: error.message };
    } finally { saveBusy.current = false; }
  };

  const checkJournalReplaceAvailable = (importedEntries) => replaceJournalEntries(importedEntries, true);

  const readLatestJournal = async () => {
    const snapshot = await journalStore.snapshot();
    if (!journalStore.isActive()) throw new Error('The account session changed.');
    const rows = isSupabaseConfigured ? snapshot.rows : snapshot.encrypted?.rows || [];
    const configRow = isSupabaseConfigured ? rows.find(isEncryptionConfigRow) : null;
    const configPayload = isSupabaseConfigured ? configRow?.note : snapshot.encrypted?.config || snapshot.legacyConfig;
    const config = configPayload ? parseEncryptionConfig(configPayload) : null;
    if (configPayload && !config) throw new Error('The encryption settings are damaged. Do not overwrite this journal.');
    if (!config && rows.some(isEncryptedEntryRow)) throw new Error('The encryption settings are missing. Do not overwrite this journal.');
    if ((config || encryptionConfig) && serializeEncryptionConfig(config) !== serializeEncryptionConfig(encryptionConfig)) {
      throw new Error('Encryption settings changed. Lock and unlock this journal before continuing; keep your draft.');
    }
    const latestEntries = config ? await decryptEntryRows(rows.filter(isEncryptedEntryRow), encryptionKey)
      : isSupabaseConfigured ? rows.map(rowToEntry) : snapshot.entries;
    return { entries: normalizeDailyPrimaries(latestEntries), rows: rows.filter(isEncryptedEntryRow) };
  };
  const reviewConflict = async () => {
    setConflict((current) => ({ ...current, busy: true, error: '' }));
    try {
      const latest = await readLatestJournal();
      if (journalStore.isActive()) setConflict((current) => ({ ...current, latest, busy: false }));
    } catch (error) { if (journalStore.isActive()) setConflict((current) => ({ ...current, busy: false, error: error.message })); }
  };
  const closeConflict = () => {
    conflictResolver.current?.(false);
    conflictResolver.current = null;
    setConflict(null);
  };
  const acceptLatest = () => {
    setEntries(conflict.latest.entries);
    setEncryptedRows(conflict.latest.rows);
    conflictBlocked.current = false;
    setDataError('');
    closeConflict();
  };
  const saveConflictCopy = async () => {
    setConflict((current) => ({ ...current, busy: true, error: '' }));
    try {
      const latest = await readLatestJournal();
      const expectedSnapshot = journalStore.capture();
      const copy = { ...conflict.entry, id: crypto.randomUUID(), primary: false, updated: new Date().toISOString() };
      const next = normalizeDailyPrimaries([copy, ...latest.entries]);
      if (encryptionConfig) {
        const rows = await encryptEntriesToRows([next.find((entry) => entry.id === copy.id)], user?.id || 'local-browser', encryptionKey);
        await journalStore.save({ rows: isSupabaseConfigured ? rows : [...latest.rows, ...rows], entries: next, config: serializeEncryptionConfig(encryptionConfig), expectedSnapshot });
        if (journalStore.isActive()) setEncryptedRows([...latest.rows, ...rows]);
      } else await journalStore.save({ entries: next, expectedSnapshot });
      if (!journalStore.isActive()) return;
      setEntries(next); setDataError(''); conflictBlocked.current = false;
      conflictResolver.current?.(true); conflictResolver.current = null; setConflict(null);
    } catch (error) { if (journalStore.isActive()) setConflict((current) => ({ ...current, busy: false, error: error.message })); }
  };

  const enableJournalEncryption = async (passphrase) => {
    if (saveBusy.current) throw new Error('Wait for the current journal operation to finish.');
    saveBusy.current = true;
    const expectedSnapshot = renderSnapshot;
    setEncryptionBusy(true);
    setEncryptionError('');
    try {
      if (isSupabaseConfigured && user && localEntries.length > 0) {
        throw new Error('Import the local entries shown above before turning on encryption, so no readable browser copy is left behind.');
      }
      const created = await createJournalEncryption(passphrase);
      await persistEncryptedJournal(entries, created.config, created.dataKey, { expectedSnapshot });
      setEncryptionConfig(created.config);
      setEncryptionKey(created.dataKey);
      try {
        const encryptedPrivateStorage = createPrivateStorage({
          ownerId: user?.id || 'local-browser',
          encryptionEnabled: true,
          dataKey: created.dataKey
        });
        await encryptedPrivateStorage.migrateKnown();
      } catch (migrationError) {
        if (journalStore.isActive()) setEncryptionError(`Your journal entries are encrypted, but some older activity data could not be migrated: ${migrationError.message}`);
      }
      if (!journalStore.isActive()) return false;
      notifyOtherTabsOfEncryptionChange();
      return created.recoveryKey;
    } catch (error) {
      if (journalStore.isActive()) setEncryptionError(error.message);
      throw error;
    } finally {
      saveBusy.current = false;
      if (journalStore.isActive()) setEncryptionBusy(false);
    }
  };

  const initializeAccountEncryption = async (accountPassword, verifyAccount = true) => {
    if (saveBusy.current) return false;
    saveBusy.current = true;
    const expectedSnapshot = renderSnapshot;
    setEncryptionBusy(true);
    setEncryptionError('');
    try {
      if (!user?.email) throw new Error('Sign in to your account before creating its encrypted journal.');
      if (accountPassword.length < 12) {
        throw new Error('For automatic encryption, use an account password with at least 12 characters. Reset your account password, then return here.');
      }
      if (verifyAccount) {
        const { error: verificationError } = await supabase.auth.signInWithPassword({ email: user.email, password: accountPassword });
        if (verificationError) throw new Error('That account password did not match.');
      }
      const created = await createJournalEncryption(accountPassword);
      const automaticConfig = { ...created.config, unlockMethod: 'account-password' };
      await persistEncryptedJournal(entries, automaticConfig, created.dataKey, { expectedSnapshot });
      setEncryptionConfig(automaticConfig);
      setEncryptionKey(created.dataKey);
      setPendingRecoveryKey(created.recoveryKey);
      try {
        const encryptedPrivateStorage = createPrivateStorage({
          ownerId: user.id,
          encryptionEnabled: true,
          dataKey: created.dataKey
        });
        await encryptedPrivateStorage.migrateKnown();
      } catch (migrationError) {
        if (journalStore.isActive()) setEncryptionError(`Your journal entries are encrypted, but some older activity data could not be migrated: ${migrationError.message}`);
      }
      if (!journalStore.isActive()) return false;
      notifyOtherTabsOfEncryptionChange();
      return true;
    } catch (error) {
      if (journalStore.isActive()) setEncryptionError(error.message);
      return false;
    } finally {
      saveBusy.current = false;
      if (journalStore.isActive()) setEncryptionBusy(false);
    }
  };

  const unlockEncryptedJournal = async (credential, useRecoveryKey = false) => {
    if (!encryptionConfig) return false;
    setEncryptionBusy(true);
    setEncryptionError('');
    try {
      const dataKey = useRecoveryKey
        ? await unlockJournalWithRecoveryKey(encryptionConfig, credential)
        : await unlockJournalWithPassphrase(encryptionConfig, credential);
      const decryptedEntries = normalizeDailyPrimaries(await decryptEntryRows(encryptedRows, dataKey));
      if (!journalStore.isActive()) return false;
      setEncryptionKey(dataKey);
      setEntries(decryptedEntries);
      return true;
    } catch (error) {
      if (!journalStore.isActive()) return false;
      setEncryptionKey(null);
      setEntries([]);
      if (journalStore.isActive()) setEncryptionError(error.message);
      return false;
    } finally {
      if (journalStore.isActive()) setEncryptionBusy(false);
    }
  };

  const lockEncryptedJournal = async () => {
    try { await flushJournalDrafts(); }
    catch { setEncryptionError('The device draft could not be saved. Your draft is kept in this tab until you unlock.'); }
    if (!journalStore.isActive()) return;
    setEncryptionKey(null);
    setEntries([]);
    notifyOtherTabsOfEncryptionChange();
  };

  const updateEncryptionPassphrase = async (newPassphrase) => {
    if (!encryptionConfig || !encryptionKey) throw new Error('Unlock your journal before changing its passphrase.');
    if (saveBusy.current) throw new Error('Wait for the current journal operation to finish.');
    saveBusy.current = true;
    const expectedSnapshot = renderSnapshot;
    setEncryptionBusy(true);
    setEncryptionError('');
    try {
      const changedConfig = await changeJournalPassphrase(encryptionConfig, encryptionKey, newPassphrase);
      const nextConfig = { ...changedConfig, unlockMethod: 'journal-passphrase' };
      await persistEncryptedJournal(entries, nextConfig, encryptionKey, { expectedSnapshot });
      if (!journalStore.isActive()) return false;
      setEncryptionConfig(nextConfig);
      if (!journalStore.isActive()) return false;
      notifyOtherTabsOfEncryptionChange();
      return true;
    } catch (error) {
      if (journalStore.isActive()) setEncryptionError(error.message);
      throw error;
    } finally {
      saveBusy.current = false;
      if (journalStore.isActive()) setEncryptionBusy(false);
    }
  };
  const resetAccountPassword = async (newPassword, recoveryKey) => {
    if (newPassword.length < 12) return { ok: false, error: 'Use an account password with at least 12 characters.' };
    if (saveBusy.current) return { ok: false, error: 'Wait for the current journal operation to finish.' };
    saveBusy.current = true;
    setEncryptionBusy(true);
    setEncryptionError('');
    try {
      let nextConfig = null;
      let recoveredDataKey = null;
      const snapshot = await journalStore.snapshot();
      const storedConfig = snapshot.rows.find(isEncryptionConfigRow);
      const latestConfig = storedConfig ? parseEncryptionConfig(storedConfig.note) : null;
      if ((storedConfig && !latestConfig) || (!latestConfig && snapshot.rows.some(isEncryptedEntryRow))) throw new Error('Encryption settings are damaged or missing. Password reset cannot safely continue.');
      const expectedSnapshot = journalStore.capture();
      if (latestConfig) {
        recoveredDataKey = await unlockJournalWithRecoveryKey(latestConfig, recoveryKey);
        const changedConfig = await changeJournalPassphrase(latestConfig, recoveredDataKey, newPassword);
        nextConfig = { ...changedConfig, unlockMethod: 'account-password' };
      }
      if (!journalStore.isActive()) throw new Error('The account session changed.');
      const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
      if (passwordError) throw new Error(passwordError.message);
      if (nextConfig) {
        try {
          await journalStore.save({ rows: [createEncryptionConfigRow(nextConfig, user.id)], expectedSnapshot });
        } catch (storageError) {
          throw new Error(`Your account password changed, but the journal key update needs to be retried with your recovery key: ${storageError.message}`);
        }
        if (!journalStore.isActive()) return { ok: false, error: 'The account session changed.' };
        setEncryptionConfig(nextConfig);
        setEncryptionKey(recoveredDataKey);
        setEncryptedRows(snapshot.rows.filter(isEncryptedEntryRow));
        const recoveredEntries = normalizeDailyPrimaries(await decryptEntryRows(snapshot.rows.filter(isEncryptedEntryRow), recoveredDataKey));
        if (!journalStore.isActive()) return { ok: false, error: 'The account session changed.' };
        setEntries(recoveredEntries);
      }
      return { ok: true };
    } catch (error) {
      if (journalStore.isActive()) setEncryptionError(error.message);
      return { ok: false, error: error.message };
    } finally {
      saveBusy.current = false;
      if (journalStore.isActive()) setEncryptionBusy(false);
    }
  };
  const saveEntry = async (entry) => {
    if (!isJournalDateAllowed(entry.dateKey)) {
      setDataError('Choose today or an earlier journal date.');
      return false;
    }
    const mood = moods.find((item) => item.key === entry.mood);
    const entryType = entry.type || 'checkin';
    const existing = entries.find((item) => item.id === entry.id);
    const normalized = {
      ...entry,
      type: entryType,
      created: existing?.created || entry.created || new Date().toISOString(),
      bookmarked: Boolean(entry.bookmarked),
      moodScore: mood?.score || null,
      updated: new Date().toISOString()
    };
    const saved = await saveEntries(upsertJournalEntry(entries, normalized));
    if (!saved && journalStore.isActive() && lastSaveError.current?.code === JOURNAL_CONFLICT) {
      setConflict({ entry: normalized, latest: null, error: '' });
      return new Promise((resolve) => { conflictResolver.current = resolve; });
    }
    return saved;
  };
  const deleteEntry = async (id) => {
    const nextEntries = removeJournalEntry(entries, id);
    return saveEntries(nextEntries, { deletedId: id });
  };
  const setPrimaryEntry = async (id) => {
    const target = entries.find((entry) => entry.id === id);
    if (!target || !isCheckIn(target)) return false;
    return saveEntries(entries.map((entry) => isCheckIn(entry) && entry.dateKey === target.dateKey ? { ...entry, primary: entry.id === id } : entry));
  };
  const setBookmarkedEntry = async (id, bookmarked) => saveEntries(entries.map((entry) => entry.id === id ? { ...entry, bookmarked } : entry));
  const importLocalEntries = async () => {
    if (!user || localEntries.length === 0) return false;
    try {
      const raw = localStorage.getItem(localEntriesKey);
      const local = readLocalJournal(localStorage, localEntriesKey);
      const comparison = compareJournalImports(entries, local);
      if (comparison.conflicts.length) throw new Error('Some local entries have the same IDs but different writing. The local copy has been kept. Export and review these entries before importing.');
      if (comparison.newEntries.length && !await saveEntries([...comparison.newEntries, ...entries])) return false;
      await journalStore.removeImportedLocal(raw);
      if (!journalStore.isActive()) return false;
      setLocalEntries([]);
      setImportMessage('Local entries were confirmed saved. The old browser copy was removed.');
      return true;
    } catch (error) { recordSaveError(error); return false; }
  };
  const openApp = (nextView = 'checkin') => {
    if (!confirmJournalNavigation()) return false;
    navigate(viewPaths[nextView] || viewPaths.checkin);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    return true;
  };
  const updateTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
  };
  const updateSiteTheme = (value) => {
    setSiteTheme(value);
    localStorage.setItem('siteTheme', value);
  };
  const updateMotion = () => {
    const next = !reduceMotion;
    setReduceMotion(next);
    localStorage.setItem('reduceMotion', String(next));
  };
  const updateFontScale = (value) => {
    setFontScale(value);
    localStorage.setItem('fontScale', String(value));
  };
  const updateFontStyle = (value) => {
    setFontStyle(value);
    localStorage.setItem('fontStyle', value);
  };
  const updatePin = (value) => {
    setPin(value);
    if (value) {
      localStorage.setItem('journalPin', value);
      setLocked(true);
    } else {
      localStorage.removeItem('journalPin');
      setLocked(false);
    }
  };
  const updateJournalLock = (value) => {
    const nextValue = value.trim();
    setJournalLockCode(nextValue);
    if (nextValue) {
      localStorage.setItem('journalPrivacyCode', nextValue);
      setJournalUnlocked(false);
    } else {
      localStorage.removeItem('journalPrivacyCode');
      setJournalUnlocked(true);
    }
  };
  const recoverLocalLock = async (lockType, accountPassword) => {
    if (!isSupabaseConfigured || !user?.email) {
      return { ok: false, error: 'Account verification is unavailable for this local-only journal.' };
    }
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: accountPassword });
    if (error) return { ok: false, error: 'That account password did not match.' };
    if (lockType === 'pin') updatePin('');
    if (lockType === 'journal') updateJournalLock('');
    return { ok: true };
  };
  const updateReminder = (nextReminder) => {
    const normalizedReminder = normalizeReminder(nextReminder);
    setReminder(normalizedReminder);
    localStorage.setItem('journalReminder', JSON.stringify(normalizedReminder));
  };

  useEffect(() => {
    const handleEncryptionChange = async (event) => {
      if (event.key !== encryptionRevisionKey) return;
      let notice;
      try { notice = JSON.parse(event.newValue); } catch { return; }
      if (notice?.ownerId !== ownerId) return;
      setExternalLock(true);
      try { await flushJournalDrafts(); }
      catch { if (journalStore.isActive()) setDataError('The device draft could not be saved. Keep this tab open to recover its in-memory draft.'); }
      if (!journalStore.isActive()) return;
      setEncryptionKey(null); setEntries([]);
      closeConflict();
      conflictBlocked.current = false;
      try {
        const snapshot = await journalStore.snapshot();
        if (!journalStore.isActive()) return;
        const rows = isSupabaseConfigured ? snapshot.rows : snapshot.encrypted?.rows || snapshot.entries;
        const payload = isSupabaseConfigured ? rows.find(isEncryptionConfigRow)?.note : snapshot.encrypted?.config || snapshot.legacyConfig;
        setEncryptionConfig(parseEncryptionConfig(payload) || invalidEncryptionConfig);
        setEncryptedRows(rows.filter(isEncryptedEntryRow));
      } catch (error) { if (journalStore.isActive()) { setEncryptionConfig(invalidEncryptionConfig); setEncryptionError(error.message); } }
      finally { if (journalStore.isActive()) setExternalLock(false); }
    };
    window.addEventListener('storage', handleEncryptionChange);
    return () => window.removeEventListener('storage', handleEncryptionChange);
  }, [journalStore, ownerId]);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const nextOwner = nextSession?.user?.id || 'signed-out';
      if (storageRef.current?.ownerId !== nextOwner) {
        storageRef.current?.store.deactivate();
        conflictResolver.current?.(false); conflictResolver.current = null;
        conflictBlocked.current = false; setConflict(null);
        setEncryptionKey(null); setEntries([]); setEncryptedRows([]); setEncryptionConfig(null);
      }
      setSession(nextSession);
      setAuthLoading(false);
      setImportMessage('');
      setProfile(null);
      if (event === 'SIGNED_OUT') {
        setAuthEncryptionCredential('');
        setPendingRecoveryKey('');
        setAutomaticSetupAttemptedFor(null);
      }
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!user) {
      setEntries([]);
      setEncryptedRows([]);
      setEncryptionConfig(null);
      setEncryptionKey(null);
      setEncryptionError('');
      setProfile(null);
      setAccountDataLoadedFor(null);
      return;
    }
    let active = true;
    setAccountDataLoadedFor(null);
    setDataLoading(true);
    setDataError('');
    journalStore.snapshot()
      .then(({ rows }) => {
        if (!active) return;
          const configRow = rows.find(isEncryptionConfigRow);
          const config = configRow ? parseEncryptionConfig(configRow.note) : null;
          if (configRow || rows.some(isEncryptedEntryRow)) {
            setEncryptionConfig(config || invalidEncryptionConfig);
            setEncryptionKey(null);
            setEncryptedRows(rows.filter(isEncryptedEntryRow));
            setEntries([]);
            setEncryptionError(config ? '' : 'The stored encryption settings are damaged. Keep the encrypted rows and recovery material; do not overwrite this journal.');
          } else {
            setEncryptionConfig(null);
            setEncryptionKey(null);
            setEncryptedRows([]);
            setEntries(normalizeDailyPrimaries(rows.filter((row) => !isEncryptionConfigRow(row)).map(rowToEntry)));
          }
          setAccountDataLoadedFor(user.id);
        setDataLoading(false);
      }).catch((error) => {
        if (active) { setDataError(journalStorageError(error).message); setAuthEncryptionCredential(''); setDataLoading(false); }
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user || accountDataLoadedFor !== user.id || !authEncryptionCredential || automaticSetupAttemptedFor === user.id) return;
    let active = true;
    setAutomaticSetupAttemptedFor(user.id);
    const prepareEncryptedJournal = async () => {
      if (encryptionConfig) await unlockEncryptedJournal(authEncryptionCredential);
      else await initializeAccountEncryption(authEncryptionCredential, false);
      if (active) setAuthEncryptionCredential('');
    };
    prepareEncryptedJournal();
    return () => { active = false; };
    // The attempt guard prevents this one-time login credential from being reused.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, accountDataLoadedFor, authEncryptionCredential, automaticSetupAttemptedFor, encryptionConfig]);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;
    let active = true;
    supabase
      .from('profiles')
      .select('username, role')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (!active) return;
        if (data) {
          setProfile(data);
          return;
        }
        if (error) {
          setDataError(error.message);
          return;
        }
        const { data: createdProfile, error: createError } = await supabase.rpc('ensure_journal_profile');
        if (!active) return;
        if (createError) setDataError(createError.message);
        else setProfile(createdProfile);
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (profile?.role !== 'admin') {
      setNewSupportCount(0);
      setSupportCountError('');
      return undefined;
    }
    let active = true;
    const refreshCount = () => {
      countNewSupportRequests().then((count) => {
        if (active) { setNewSupportCount(count); setSupportCountError(''); }
      }).catch((error) => {
        if (active) { setNewSupportCount(0); setSupportCountError(supportErrorMessage(error)); }
      });
    };
    refreshCount();
    const interval = window.setInterval(refreshCount, 60000);
    return () => { active = false; window.clearInterval(interval); };
  }, [profile?.role, view, supportRefreshRevision]);

  useEffect(() => {
    if (!reminder.enabled || !('Notification' in window) || Notification.permission !== 'granted') return undefined;
    const now = new Date();
    const upcoming = reminder.times.map((time) => {
      const [hours, minutes] = time.split(':').map(Number);
      const next = new Date();
      next.setHours(hours, minutes, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      return next;
    }).sort((a, b) => a - b);
    const next = upcoming[0];
    const timeout = setTimeout(() => {
      new Notification('Mood Journal', { body: 'Take a minute to check in with yourself.' });
    }, next.getTime() - now.getTime());
    return () => clearTimeout(timeout);
  }, [reminder]);

  const canUseApp = !authLoading && (!isSupabaseConfigured || user);
  const visibleViews = profile?.role === 'admin' ? [...appViews, 'admin'] : appViews;
  const journalIsHidden = Boolean(journalLockCode && !journalUnlocked);
  const accountDataReady = !isSupabaseConfigured || !user || accountDataLoadedFor === user.id;
  const encryptedJournalLocked = Boolean(encryptionConfig && !encryptionKey)
    || Boolean(isSupabaseConfigured && user && accountDataReady && !encryptionConfig);
  const immersiveGameActive = canUseApp && !locked && !passwordRecovery && accountDataReady
    && !encryptedJournalLocked && !journalIsHidden
    && /^\/games\/(?:garden|constellation|orbit)\/?$/u.test(location.pathname);
  const isSunsetMode = siteTheme === 'sunrise' && theme === 'dark';
  const ThemeToggleIcon = isSunsetMode ? Sunset : theme === 'dark' ? Moon : Sun;
  const colorModeLabel = siteTheme === 'sunrise' ? (theme === 'dark' ? 'Sunset mode' : 'Sunrise mode') : (theme === 'dark' ? 'Dark mode' : 'Light mode');
  const showingAuth = !authLoading && isSupabaseConfigured && !user;
  const appNav = canUseApp && !locked && !passwordRecovery ? (
    <AppNav
      activeView={view}
      views={visibleViews}
      onOpen={openApp}
      variant="top"
      badgeCounts={{ admin: newSupportCount }}
      badgeErrors={{ admin: supportCountError }}
      moreActions={<ReminderBell reminder={reminder} setReminder={updateReminder} variant="menu" />}
    />
  ) : null;

  return (
    <div className={`app theme-${siteTheme} ${theme === 'dark' ? 'dark' : ''} ${reduceMotion ? 'reduced-motion' : ''} ${showingAuth ? 'auth-active' : ''} ${immersiveGameActive ? 'immersive-game-active' : ''} font-${fontStyle}`} style={{ '--font-scale': fontScale }}>
      <ThemeAtmosphere siteTheme={siteTheme} dark={theme === 'dark'} />
      {!immersiveGameActive && <header className="topbar">
        <div className="topbar-inner app-container">
          <button className="brand" onClick={() => openApp('home')} type="button">
            <img src={logoUrl} alt="" />
            <span>Mood Journal</span>
          </button>
          {appNav}
          <div className="header-actions">
            {!canUseApp && isSupabaseConfigured ? <>
              <button className={authMode === 'signin' ? 'header-link active' : 'header-link'} onClick={() => setAuthMode('signin')} type="button">Log In</button>
              <button className={authMode === 'signup' ? 'header-link active' : 'header-link'} onClick={() => setAuthMode('signup')} type="button">Sign Up</button>
            </> : (
              <button className={view === 'settings' ? 'header-link icon-link active' : 'header-link icon-link'} aria-label="Settings" onClick={() => openApp('settings')} title="Settings" type="button"><SettingsIcon aria-hidden="true" size={18} strokeWidth={2.4} /></button>
            )}
            <button className={theme === 'dark' ? 'toggle icon-toggle active' : 'toggle icon-toggle'} aria-label={`Toggle color mode. Current: ${colorModeLabel}`} onClick={updateTheme} title={colorModeLabel} type="button"><span /><ThemeToggleIcon aria-hidden="true" className="toggle-icon" size={15} strokeWidth={2.4} /></button>
            {user && <ProfileMenu user={user} profile={profile} openApp={openApp} />}
          </div>
        </div>
      </header>}
      <main className="app-container">
        {authLoading && <section className="screen app-screen"><div className="panel auth-panel"><p>Loading your account...</p></div></section>}
        {showingAuth && <AuthScreen mode={authMode} setMode={setAuthMode} siteTheme={siteTheme} setSiteTheme={updateSiteTheme} theme={theme} setTheme={updateTheme} onAuthenticated={(credential) => { setAuthEncryptionCredential(credential); setAutomaticSetupAttemptedFor(null); }} />}
        {canUseApp && passwordRecovery && (!accountDataReady
          ? <section className="screen app-screen"><div className="panel auth-panel"><p>{dataLoading ? 'Preparing secure password recovery...' : dataError || 'Your encrypted journal settings could not be loaded safely.'}</p></div></section>
          : <PasswordUpdateScreen requiresRecoveryKey={Boolean(encryptionConfig)} onUpdate={resetAccountPassword} onDone={() => setPasswordRecovery(false)} />)}
        {canUseApp && !passwordRecovery && (locked ? <LockScreen pin={pin} onUnlock={() => setLocked(false)} onRecover={(password) => recoverLocalLock('pin', password)} /> : view === 'support' ? <Support user={user} siteTheme={siteTheme} theme={theme} originPage={supportOriginPage} onRequestChanged={() => setSupportRefreshRevision((current) => current + 1)} /> : view === 'admin' ? (!user ? <Navigate to="/" replace /> : !profile ? <section className="screen app-screen"><p>Checking admin access...</p></section> : profile.role === 'admin' ? <AdminPanel user={user} onRequestChanged={() => setSupportRefreshRevision((current) => current + 1)} /> : <Navigate to="/" replace />) : <>
        <AccountStatus localEntries={isSupabaseConfigured ? localEntries : []} onImport={importLocalEntries} message={importMessage} error={dataError} loading={dataLoading} />
        {!accountDataReady ? (
          <section className="screen app-screen"><div className="panel auth-panel"><p>{dataLoading ? 'Preparing your private journal...' : dataError || 'Your journal could not be loaded safely.'}</p></div></section>
        ) : pendingRecoveryKey ? (
          <RecoveryKeyNotice recoveryKey={pendingRecoveryKey} onStored={() => setPendingRecoveryKey('')} />
        ) : externalLock ? <p role="status">Locking your journal and keeping your draft...</p> : encryptedJournalLocked ? (
          <JournalEncryptionGate
            busy={encryptionBusy}
            error={encryptionError}
            setupRequired={!encryptionConfig}
            usesAccountPassword={encryptionConfig?.unlockMethod === 'account-password'}
            onSetup={(credential) => initializeAccountEncryption(credential)}
            onUnlockPassphrase={(credential) => unlockEncryptedJournal(credential)}
            onUnlockRecovery={(credential) => unlockEncryptedJournal(credential, true)}
          />
        ) : (
        <Suspense fallback={<section className="screen app-screen"><div className="panel auth-panel"><p>Loading page...</p></div></section>}>
        <Routes>
          <Route path="/" element={<Home entries={entries} onOpen={openApp} onOpenGame={(game) => navigate(`/games/${game}`)} profile={profile} />} />
          <Route path="/checkin" element={<CheckIn nav={null} entries={entries} onSave={saveEntry} onDone={() => openApp('activities')} privateStorage={privateStorage} />} />
          <Route path="/activities" element={<Activities nav={null} entries={entries} privateStorage={privateStorage} />} />
          <Route path="/games" element={<JournalPrivacyGate locked={journalIsHidden} onUnlock={setJournalUnlocked} onRecover={(password) => recoverLocalLock('journal', password)} code={journalLockCode}><Games nav={null} entries={entries} onSave={saveEntry} moods={moods} createEntry={createEntry} todayKey={todayKey} getPrimaryEntry={getPrimaryEntry} groupEntriesByDate={groupEntriesByDate} privateStorage={privateStorage} /></JournalPrivacyGate>} />
          <Route path="/games/:gameId" element={<JournalPrivacyGate locked={journalIsHidden} onUnlock={setJournalUnlocked} onRecover={(password) => recoverLocalLock('journal', password)} code={journalLockCode}><Games nav={null} entries={entries} onSave={saveEntry} moods={moods} createEntry={createEntry} todayKey={todayKey} getPrimaryEntry={getPrimaryEntry} groupEntriesByDate={groupEntriesByDate} privateStorage={privateStorage} /></JournalPrivacyGate>} />
          <Route path="/entries" element={<JournalPrivacyGate locked={journalIsHidden} onUnlock={setJournalUnlocked} onRecover={(password) => recoverLocalLock('journal', password)} code={journalLockCode}><Entries nav={null} entries={entries} onCreate={() => openApp('checkin')} onSave={saveEntry} onDelete={deleteEntry} onPrimary={setPrimaryEntry} onBookmark={setBookmarkedEntry} privateStorage={privateStorage} /></JournalPrivacyGate>} />
          <Route path="/calendar" element={<JournalPrivacyGate locked={journalIsHidden} onUnlock={setJournalUnlocked} onRecover={(password) => recoverLocalLock('journal', password)} code={journalLockCode}><Calendar nav={null} entries={entries} onPrimary={setPrimaryEntry} onBookmark={setBookmarkedEntry} /></JournalPrivacyGate>} />
          <Route path="/summary" element={<JournalPrivacyGate locked={journalIsHidden} onUnlock={setJournalUnlocked} onRecover={(password) => recoverLocalLock('journal', password)} code={journalLockCode}><Summary nav={null} entries={entries} /></JournalPrivacyGate>} />
          <Route path="/about" element={<About nav={null} />} />
          <Route path="/newsletter" element={<Newsletter nav={null} />} />
          <Route path="/settings" element={<Settings nav={null} user={user} profile={profile} entries={entries} saveEntries={saveEntries} replaceJournalEntries={replaceJournalEntries} checkJournalReplaceAvailable={checkJournalReplaceAvailable} fontScale={fontScale} setFontScale={updateFontScale} fontStyle={fontStyle} setFontStyle={updateFontStyle} siteTheme={siteTheme} setSiteTheme={updateSiteTheme} theme={theme} setTheme={updateTheme} reduceMotion={reduceMotion} setReduceMotion={updateMotion} pin={pin} setPin={updatePin} recoverPin={(password) => recoverLocalLock('pin', password)} onOpen={openApp} journalLockCode={journalLockCode} setJournalLockCode={updateJournalLock} journalUnlocked={journalUnlocked} setJournalUnlocked={setJournalUnlocked} reminder={reminder} setReminder={updateReminder} journalEncryption={{ enabled: Boolean(encryptionConfig), unlocked: Boolean(encryptionKey), busy: encryptionBusy, error: encryptionError, enable: enableJournalEncryption, lock: lockEncryptedJournal, changePassphrase: updateEncryptionPassphrase }} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        )}
        </>)}
      </main>
      {conflict && !externalLock && !encryptedJournalLocked && <JournalConflictDialog conflict={conflict} onReview={reviewConflict} onCopy={saveConflictCopy} onAccept={acceptLatest} onClose={closeConflict} />}
      {canUseApp && !locked && !passwordRecovery && view !== 'support' && !immersiveGameActive && <button className={`support-help-bubble${view === 'checkin' ? ' checkin-help-bubble' : ''}`} onClick={() => { setSupportOriginPage(location.pathname); openApp('support'); }} title="Help & feedback" aria-label="Help & feedback" type="button"><MessageCircleQuestionMark aria-hidden="true" size={23} /></button>}
      {!immersiveGameActive && <footer className="footer">
        <div className="footer-brand">
          <img src={logoUrl} alt="" />
          <div>
            <strong>Mood Journal</strong>
            <span>A quiet place to notice what is here.</span>
          </div>
        </div>
        <nav className="footer-links" aria-label="Journaling resources">
          <Link to="/about#art-credits">Art credits</Link>
          <a href="https://positivepsychology.com/benefits-of-journaling/" target="_blank" rel="noreferrer">
            <BookOpen aria-hidden="true" size={16} strokeWidth={2.2} />
            Learn More
            <ExternalLink aria-hidden="true" size={13} strokeWidth={2.4} />
          </a>
          <a href="https://www.choosingtherapy.com/journaling-for-mental-health/" target="_blank" rel="noreferrer">
            <BookOpen aria-hidden="true" size={16} strokeWidth={2.2} />
            About Journaling
            <ExternalLink aria-hidden="true" size={13} strokeWidth={2.4} />
          </a>
        </nav>
      </footer>}
    </div>
  );
}

export default App;
