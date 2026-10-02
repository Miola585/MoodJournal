import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, ExternalLink, Moon, Settings as SettingsIcon, Sun, Sunset } from 'lucide-react';
import { appViews, createEntry, localEntriesKey, logoUrl, moods, viewPaths } from './data/journalData';
import { entryToRow, getPrimaryEntry, groupEntriesByDate, isCheckIn, isJournalDateAllowed, isMissingEntryTypeError, normalizeDailyPrimaries, normalizeReminder, normalizeUsername, readStorage, removeJournalEntry, rowToEntry, todayKey, upsertJournalEntry, viewFromPath } from './utils/journalUtils';
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
import { Home } from './screens/Home';
import { About } from './screens/About';
import { Newsletter } from './screens/Newsletter';
import { CheckIn } from './screens/CheckIn';
import { Calendar } from './screens/Calendar';
import { Summary } from './screens/Summary';
import { Activities } from './screens/Activities';
import { Settings } from './screens/Settings';
import { createPrivateStorage } from './utils/privateStorage';
import { confirmJournalNavigation } from './hooks/useJournalDraft';

const Games = lazy(() => import('./components/games/Games').then((module) => ({ default: module.Games })));
const Entries = lazy(() => import('./screens/Entries').then((module) => ({ default: module.Entries })));
const encryptionRevisionKey = 'journalEncryptionRevision';
const invalidEncryptionConfig = { version: 0, invalid: true };

const storedEncryptedJournal = () => {
  const stored = readStorage(localEncryptedJournalKey, null);
  const configPayload = stored?.config || localStorage.getItem(localEncryptionConfigKey) || '';
  const config = parseEncryptionConfig(configPayload);
  if (!config && !isEncryptionConfigPayload(configPayload)) return null;
  return {
    config: config || invalidEncryptionConfig,
    rows: Array.isArray(stored?.rows) ? stored.rows : readStorage(localEntriesKey, [])
  };
};

const storedEncryptionConfig = () => storedEncryptedJournal()?.config || null;

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const view = viewFromPath(location.pathname, viewPaths);
  const [authMode, setAuthMode] = useState('signin');
  const [entries, setEntries] = useState(() => isSupabaseConfigured || storedEncryptionConfig() ? [] : normalizeDailyPrimaries(readStorage(localEntriesKey, [])));
  const [localEntries, setLocalEntries] = useState(() => readStorage(localEntriesKey, []));
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
  const [dataError, setDataError] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [profile, setProfile] = useState(null);
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
  const privateStorage = useMemo(() => createPrivateStorage({
    ownerId: user?.id || 'local-browser',
    encryptionEnabled: Boolean(encryptionConfig),
    dataKey: encryptionKey
  }), [user?.id, encryptionConfig, encryptionKey]);
  const notifyOtherTabsOfEncryptionChange = () => {
    localStorage.setItem(encryptionRevisionKey, String(Date.now()));
  };
  const upsertJournalRows = async (rows) => {
    const { error } = await supabase.from('journal_entries').upsert(rows);
    if (!error) return null;
    if (!isMissingEntryTypeError(error)) return error;
    const fallbackRows = rows.map(({ entry_type, ...row }) => row);
    const { error: fallbackError } = await supabase.from('journal_entries').upsert(fallbackRows);
    return fallbackError;
  };

  const persistEncryptedJournal = async (nextEntries, config = encryptionConfig, dataKey = encryptionKey) => {
    if (!config || !dataKey) throw new Error('Unlock your encrypted journal before changing it.');
    const ownerId = user?.id || 'local-browser';
    const rows = await encryptEntriesToRows(nextEntries, ownerId, dataKey);
    if (!isSupabaseConfigured || !user) {
      localStorage.setItem(localEncryptedJournalKey, JSON.stringify({
        version: 1,
        config: serializeEncryptionConfig(config),
        rows
      }));
      localStorage.removeItem(localEntriesKey);
      localStorage.removeItem(localEncryptionConfigKey);
    } else {
      const error = await upsertJournalRows([createEncryptionConfigRow(config, user.id), ...rows]);
      if (error) throw new Error(error.message);
    }
    setEncryptedRows(rows);
    setEntries(nextEntries);
    setDataError('');
    return rows;
  };

  const saveEntries = async (nextEntries) => {
    const normalizedEntries = normalizeDailyPrimaries(nextEntries);
    if (isSupabaseConfigured && user && (!encryptionConfig || !encryptionKey)) {
      setDataError('Your encrypted journal must be unlocked before anything can be saved.');
      return false;
    }
    if (encryptionConfig) {
      try {
        await persistEncryptedJournal(normalizedEntries);
        return true;
      } catch (error) {
        setDataError(error.message);
        return false;
      }
    }
    if (!isSupabaseConfigured || !user) {
      try {
        localStorage.setItem(localEntriesKey, JSON.stringify(normalizedEntries));
        setEntries(normalizedEntries);
        setDataError('');
        return true;
      } catch (error) {
        setDataError(error.message || 'This browser could not save the journal.');
        return false;
      }
    }
    const rows = normalizedEntries.map((entry) => entryToRow(entry, user.id));
    if (rows.length === 0) {
      setEntries([]);
      setDataError('');
      return true;
    }
    const { error } = await supabase.from('journal_entries').upsert(rows);
    if (!error) {
      setEntries(normalizedEntries);
      setDataError('');
      return true;
    }
    if (isMissingEntryTypeError(error)) {
      const fallbackRows = rows.map(({ entry_type, ...row }) => row);
      const { error: fallbackError } = await supabase.from('journal_entries').upsert(fallbackRows);
      if (fallbackError) {
        setDataError(fallbackError.message);
        return false;
      }
      setEntries(normalizedEntries);
      setDataError('Saved without entry type because Supabase is missing the entry_type column. Run docs/supabase-schema.sql in Supabase SQL Editor to fully enable Check-In, Free Write, and Game entry separation.');
      return true;
    }
    setDataError(error.message);
    return false;
  };

  const replaceJournalEntries = async (nextEntries) => {
    const normalizedEntries = normalizeDailyPrimaries(nextEntries);
    if (!isSupabaseConfigured || !user) {
      const saved = await saveEntries(normalizedEntries);
      return { ok: saved, unavailable: false };
    }
    if (!encryptionConfig || !encryptionKey) {
      return { ok: false, unavailable: false, error: 'Unlock your encrypted journal before replacing it.' };
    }
    try {
      const encrypted = await encryptEntriesToRows(normalizedEntries, user.id, encryptionKey);
      const replacementRows = [createEncryptionConfigRow(encryptionConfig, user.id), ...encrypted];
      const { error } = await supabase.rpc('replace_journal_entries', { replacement_rows: replacementRows, dry_run: false });
      if (error) {
        const unavailable = /replace_journal_entries|schema cache|function/i.test(error.message || '');
        return {
          ok: false,
          unavailable,
          error: unavailable
            ? 'Full replacement is unavailable until replace_journal_entries is installed from docs/supabase-schema.sql.'
            : error.message
        };
      }
      setEncryptedRows(encrypted);
      setEntries(normalizedEntries);
      setDataError('');
      return { ok: true, unavailable: false };
    } catch (error) {
      setDataError(error.message);
      return { ok: false, unavailable: false, error: error.message };
    }
  };

  const checkJournalReplaceAvailable = async () => {
    if (!isSupabaseConfigured || !user) return true;
    const { error } = await supabase.rpc('replace_journal_entries', { replacement_rows: [], dry_run: true });
    return !error;
  };

  const enableJournalEncryption = async (passphrase) => {
    setEncryptionBusy(true);
    setEncryptionError('');
    try {
      if (isSupabaseConfigured && user && localEntries.length > 0) {
        throw new Error('Import the local entries shown above before turning on encryption, so no readable browser copy is left behind.');
      }
      const created = await createJournalEncryption(passphrase);
      await persistEncryptedJournal(entries, created.config, created.dataKey);
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
        setEncryptionError(`Your journal entries are encrypted, but some older activity data could not be migrated: ${migrationError.message}`);
      }
      notifyOtherTabsOfEncryptionChange();
      return created.recoveryKey;
    } catch (error) {
      setEncryptionError(error.message);
      throw error;
    } finally {
      setEncryptionBusy(false);
    }
  };

  const initializeAccountEncryption = async (accountPassword, verifyAccount = true) => {
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
      await persistEncryptedJournal(entries, automaticConfig, created.dataKey);
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
        setEncryptionError(`Your journal entries are encrypted, but some older activity data could not be migrated: ${migrationError.message}`);
      }
      notifyOtherTabsOfEncryptionChange();
      return true;
    } catch (error) {
      setEncryptionError(error.message);
      return false;
    } finally {
      setEncryptionBusy(false);
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
      setEncryptionKey(dataKey);
      setEntries(decryptedEntries);
      return true;
    } catch (error) {
      setEncryptionKey(null);
      setEntries([]);
      setEncryptionError(error.message);
      return false;
    } finally {
      setEncryptionBusy(false);
    }
  };

  const lockEncryptedJournal = () => {
    setEncryptionKey(null);
    setEntries([]);
    setEncryptionError('');
    notifyOtherTabsOfEncryptionChange();
  };

  const updateEncryptionPassphrase = async (newPassphrase) => {
    if (!encryptionConfig || !encryptionKey) throw new Error('Unlock your journal before changing its passphrase.');
    setEncryptionBusy(true);
    setEncryptionError('');
    try {
      const changedConfig = await changeJournalPassphrase(encryptionConfig, encryptionKey, newPassphrase);
      const nextConfig = { ...changedConfig, unlockMethod: 'journal-passphrase' };
      if (!isSupabaseConfigured || !user) {
        localStorage.setItem(localEncryptedJournalKey, JSON.stringify({
          version: 1,
          config: serializeEncryptionConfig(nextConfig),
          rows: encryptedRows
        }));
        localStorage.removeItem(localEncryptionConfigKey);
      } else {
        const error = await upsertJournalRows([createEncryptionConfigRow(nextConfig, user.id)]);
        if (error) throw new Error(error.message);
      }
      setEncryptionConfig(nextConfig);
      notifyOtherTabsOfEncryptionChange();
      return true;
    } catch (error) {
      setEncryptionError(error.message);
      throw error;
    } finally {
      setEncryptionBusy(false);
    }
  };
  const resetAccountPassword = async (newPassword, recoveryKey) => {
    if (newPassword.length < 12) return { ok: false, error: 'Use an account password with at least 12 characters.' };
    setEncryptionBusy(true);
    setEncryptionError('');
    try {
      let nextConfig = null;
      let recoveredDataKey = null;
      if (encryptionConfig) {
        recoveredDataKey = await unlockJournalWithRecoveryKey(encryptionConfig, recoveryKey);
        const changedConfig = await changeJournalPassphrase(encryptionConfig, recoveredDataKey, newPassword);
        nextConfig = { ...changedConfig, unlockMethod: 'account-password' };
      }
      const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
      if (passwordError) throw new Error(passwordError.message);
      if (nextConfig) {
        const storageError = await upsertJournalRows([createEncryptionConfigRow(nextConfig, user.id)]);
        if (storageError) throw new Error(`Your account password changed, but the journal key update needs to be retried with your recovery key: ${storageError.message}`);
        setEncryptionConfig(nextConfig);
        setEncryptionKey(recoveredDataKey);
      }
      return { ok: true };
    } catch (error) {
      setEncryptionError(error.message);
      return { ok: false, error: error.message };
    } finally {
      setEncryptionBusy(false);
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
    return saveEntries(upsertJournalEntry(entries, normalized));
  };
  const deleteEntry = async (id) => {
    const previousEntries = entries;
    const nextEntries = removeJournalEntry(entries, id);
    if (!isSupabaseConfigured || !user) {
      return saveEntries(nextEntries);
    }
    const prepared = await saveEntries(nextEntries);
    if (!prepared) return false;
    const { error } = await supabase.from('journal_entries').delete().eq('id', id);
    if (!error) {
      setEncryptedRows((rows) => rows.filter((row) => row.id !== String(id)));
      setDataError('');
      return true;
    }
    await saveEntries(previousEntries);
    setDataError(error.message);
    return false;
  };
  const setPrimaryEntry = async (id) => {
    const target = entries.find((entry) => entry.id === id);
    if (!target || !isCheckIn(target)) return false;
    return saveEntries(entries.map((entry) => isCheckIn(entry) && entry.dateKey === target.dateKey ? { ...entry, primary: entry.id === id } : entry));
  };
  const setBookmarkedEntry = async (id, bookmarked) => saveEntries(entries.map((entry) => entry.id === id ? { ...entry, bookmarked } : entry));
  const importLocalEntries = async () => {
    if (!user || localEntries.length === 0) return false;
    const existingIds = new Set(entries.map((entry) => entry.id));
    const entriesToImport = localEntries.filter((entry) => !existingIds.has(entry.id));
    if (entriesToImport.length === 0) {
      localStorage.removeItem(localEntriesKey);
      setLocalEntries([]);
      setImportMessage('Those local entries are already in this account.');
      return true;
    }
    const imported = await saveEntries([...entriesToImport, ...entries]);
    if (!imported) return false;
    localStorage.removeItem(localEntriesKey);
    setLocalEntries([]);
    setImportMessage(`${entriesToImport.length} local entr${entriesToImport.length === 1 ? 'y' : 'ies'} imported.`);
    return true;
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
    const handleEncryptionChange = (event) => {
      if (event.key === encryptionRevisionKey) window.location.reload();
    };
    window.addEventListener('storage', handleEncryptionChange);
    return () => window.removeEventListener('storage', handleEncryptionChange);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
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
    supabase
      .from('journal_entries')
      .select('*')
      .order('created', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setDataError(error.message);
          setAuthEncryptionCredential('');
        }
        else {
          const rows = data || [];
          const configRow = rows.find(isEncryptionConfigRow);
          const config = configRow ? parseEncryptionConfig(configRow.note) : null;
          if (configRow) {
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
        }
        setDataLoading(false);
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
        const username = normalizeUsername(user.user_metadata?.username || user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`);
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert({ user_id: user.id, username })
          .select('username, role')
          .single();
        if (!active) return;
        if (createError) setDataError(createError.message);
        else setProfile(createdProfile);
      });
    return () => {
      active = false;
    };
  }, [user]);

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
      moreActions={<ReminderBell reminder={reminder} setReminder={updateReminder} variant="menu" />}
    />
  ) : null;

  return (
    <div className={`app theme-${siteTheme} ${theme === 'dark' ? 'dark' : ''} ${reduceMotion ? 'reduced-motion' : ''} ${showingAuth ? 'auth-active' : ''} font-${fontStyle}`} style={{ '--font-scale': fontScale }}>
      <ThemeAtmosphere siteTheme={siteTheme} dark={theme === 'dark'} />
      <header className="topbar">
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
      </header>
      <main className="app-container">
        {authLoading && <section className="screen app-screen"><div className="panel auth-panel"><p>Loading your account...</p></div></section>}
        {showingAuth && <AuthScreen mode={authMode} setMode={setAuthMode} siteTheme={siteTheme} setSiteTheme={updateSiteTheme} theme={theme} setTheme={updateTheme} onAuthenticated={(credential) => { setAuthEncryptionCredential(credential); setAutomaticSetupAttemptedFor(null); }} />}
        {canUseApp && passwordRecovery && (!accountDataReady
          ? <section className="screen app-screen"><div className="panel auth-panel"><p>{dataLoading ? 'Preparing secure password recovery...' : dataError || 'Your encrypted journal settings could not be loaded safely.'}</p></div></section>
          : <PasswordUpdateScreen requiresRecoveryKey={Boolean(encryptionConfig)} onUpdate={resetAccountPassword} onDone={() => setPasswordRecovery(false)} />)}
        {canUseApp && !passwordRecovery && (locked ? <LockScreen pin={pin} onUnlock={() => setLocked(false)} onRecover={(password) => recoverLocalLock('pin', password)} /> : <>
        {isSupabaseConfigured && <AccountStatus localEntries={localEntries} onImport={importLocalEntries} message={importMessage} error={dataError} loading={dataLoading} />}
        {!accountDataReady ? (
          <section className="screen app-screen"><div className="panel auth-panel"><p>{dataLoading ? 'Preparing your private journal...' : dataError || 'Your journal could not be loaded safely.'}</p></div></section>
        ) : pendingRecoveryKey ? (
          <RecoveryKeyNotice recoveryKey={pendingRecoveryKey} onStored={() => setPendingRecoveryKey('')} />
        ) : encryptedJournalLocked ? (
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
          <Route path="/admin" element={profile?.role === 'admin' ? <AdminPanel nav={null} /> : <Navigate to="/" replace />} />
          <Route path="/settings" element={<Settings nav={null} user={user} profile={profile} entries={entries} saveEntries={saveEntries} replaceJournalEntries={replaceJournalEntries} checkJournalReplaceAvailable={checkJournalReplaceAvailable} fontScale={fontScale} setFontScale={updateFontScale} fontStyle={fontStyle} setFontStyle={updateFontStyle} siteTheme={siteTheme} setSiteTheme={updateSiteTheme} theme={theme} setTheme={updateTheme} reduceMotion={reduceMotion} setReduceMotion={updateMotion} pin={pin} setPin={updatePin} recoverPin={(password) => recoverLocalLock('pin', password)} onOpen={openApp} journalLockCode={journalLockCode} setJournalLockCode={updateJournalLock} journalUnlocked={journalUnlocked} setJournalUnlocked={setJournalUnlocked} reminder={reminder} setReminder={updateReminder} journalEncryption={{ enabled: Boolean(encryptionConfig), unlocked: Boolean(encryptionKey), busy: encryptionBusy, error: encryptionError, enable: enableJournalEncryption, lock: lockEncryptedJournal, changePassphrase: updateEncryptionPassphrase }} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        )}
        </>)}
      </main>
      <footer className="footer">
        <div className="footer-brand">
          <img src={logoUrl} alt="" />
          <div>
            <strong>Mood Journal</strong>
            <span>A quiet place to notice what is here.</span>
          </div>
        </div>
        <nav className="footer-links" aria-label="Journaling resources">
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
      </footer>
    </div>
  );
}

export default App;
