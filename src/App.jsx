import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { appViews, createEntry, localEntriesKey, logoUrl, moods, viewPaths } from './data/journalData';
import { entryToRow, getPrimaryEntry, groupEntriesByDate, isCheckIn, isMissingEntryTypeError, normalizeReminder, normalizeUsername, readStorage, rowToEntry, todayKey, viewFromPath } from './utils/journalUtils';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import { AppNav } from './components/layout/AppNav';
import { ThemeAtmosphere } from './components/layout/ThemeAtmosphere';
import { JournalPrivacyGate, LockScreen } from './components/layout/JournalLocks';
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
import { Entries } from './screens/Entries';
import { Calendar } from './screens/Calendar';
import { Summary } from './screens/Summary';
import { Activities } from './screens/Activities';
import { Settings } from './screens/Settings';

const Games = lazy(() => import('./components/games/Games').then((module) => ({ default: module.Games })));

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const view = viewFromPath(location.pathname, viewPaths);
  const [authMode, setAuthMode] = useState('signin');
  const [entries, setEntries] = useState(() => isSupabaseConfigured ? [] : readStorage(localEntriesKey, []));
  const [localEntries] = useState(() => readStorage(localEntriesKey, []));
  const [session, setSession] = useState(null);
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
  const saveEntries = async (nextEntries) => {
    setEntries(nextEntries);
    if (!isSupabaseConfigured || !user) {
      localStorage.setItem(localEntriesKey, JSON.stringify(nextEntries));
      return;
    }
    const rows = nextEntries.map((entry) => entryToRow(entry, user.id));
    const { error } = await supabase.from('journal_entries').upsert(rows);
    if (!error) {
      setDataError('');
      return;
    }
    if (isMissingEntryTypeError(error)) {
      const fallbackRows = rows.map(({ entry_type, ...row }) => row);
      const { error: fallbackError } = await supabase.from('journal_entries').upsert(fallbackRows);
      if (fallbackError) {
        setDataError(fallbackError.message);
        return;
      }
      setDataError('Saved without entry type because Supabase is missing the entry_type column. Run docs/supabase-schema.sql in Supabase SQL Editor to fully enable Check-In, Free Write, and Game entry separation.');
      return;
    }
    setDataError(error.message);
  };
  const saveEntry = async (entry, nextView = 'activities') => {
    const mood = moods.find((item) => item.key === entry.mood);
    const entryType = entry.type || 'checkin';
    const existingSameDayCheckIn = entryType === 'checkin' ? entries.find((item) => isCheckIn(item) && item.dateKey === entry.dateKey) : null;
    const effectiveEntry = existingSameDayCheckIn ? {
      ...entry,
      id: existingSameDayCheckIn.id,
      created: existingSameDayCheckIn.created,
      primary: true
    } : entry;
    const sameDayCheckIns = entries.filter((item) => isCheckIn(item) && item.dateKey === effectiveEntry.dateKey && item.id !== effectiveEntry.id);
    const normalized = {
      ...effectiveEntry,
      type: entryType,
      primary: entryType === 'checkin' && (entry.primary || sameDayCheckIns.length === 0),
      moodScore: mood?.score || null,
      updated: new Date().toISOString()
    };
    const exists = entries.some((item) => item.id === normalized.id);
    const nextEntries = exists
      ? entries.map((item) => item.id === normalized.id ? normalized : item).filter((item) => !(isCheckIn(item) && item.dateKey === normalized.dateKey && item.id !== normalized.id))
      : [normalized, ...entries];
    await saveEntries(normalized.primary ? nextEntries.map((item) => isCheckIn(item) && item.dateKey === normalized.dateKey ? { ...item, primary: item.id === normalized.id } : item) : nextEntries);
    navigate(viewPaths[nextView] || viewPaths.activities);
  };
  const deleteEntry = async (id) => {
    setEntries(entries.filter((entry) => entry.id !== id));
    if (!isSupabaseConfigured || !user) {
      localStorage.setItem(localEntriesKey, JSON.stringify(entries.filter((entry) => entry.id !== id)));
      return;
    }
    const { error } = await supabase.from('journal_entries').delete().eq('id', id);
    if (error) setDataError(error.message);
  };
  const setPrimaryEntry = async (id) => {
    const target = entries.find((entry) => entry.id === id);
    if (!target || !isCheckIn(target)) return;
    await saveEntries(entries.map((entry) => isCheckIn(entry) && entry.dateKey === target.dateKey ? { ...entry, primary: entry.id === id } : entry));
  };
  const importLocalEntries = async () => {
    if (!user || localEntries.length === 0) return;
    const existingIds = new Set(entries.map((entry) => entry.id));
    const entriesToImport = localEntries.filter((entry) => !existingIds.has(entry.id));
    if (entriesToImport.length === 0) {
      setImportMessage('Those local entries are already in this account.');
      return;
    }
    await saveEntries([...entriesToImport, ...entries]);
    setImportMessage(`${entriesToImport.length} local entr${entriesToImport.length === 1 ? 'y' : 'ies'} imported.`);
  };
  const openApp = (nextView = 'checkin') => {
    navigate(viewPaths[nextView] || viewPaths.checkin);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
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
  const updateReminder = (nextReminder) => {
    const normalizedReminder = normalizeReminder(nextReminder);
    setReminder(normalizedReminder);
    localStorage.setItem('journalReminder', JSON.stringify(normalizedReminder));
  };

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
      setProfile(null);
      return;
    }
    let active = true;
    setDataLoading(true);
    setDataError('');
    supabase
      .from('journal_entries')
      .select('*')
      .order('created', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setDataError(error.message);
        else setEntries((data || []).map(rowToEntry));
        setDataLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

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
  const appNav = canUseApp && !locked && !passwordRecovery ? <AppNav activeView={view} views={visibleViews} onOpen={openApp} variant="top" includeSettings /> : null;

  return (
    <div className={`app theme-${siteTheme} ${theme === 'dark' ? 'dark' : ''} ${reduceMotion ? 'reduced-motion' : ''} font-${fontStyle}`} style={{ '--font-scale': fontScale }}>
      <ThemeAtmosphere />
      <header className="topbar">
        <button className="brand" onClick={() => openApp('home')} type="button">
          <img src={logoUrl} alt="" />
          <span>Mood Journal</span>
        </button>
        {appNav}
        <div className="header-actions">
          {!canUseApp && isSupabaseConfigured ? <>
            <button className={authMode === 'signin' ? 'header-link active' : 'header-link'} onClick={() => setAuthMode('signin')} type="button">Log In</button>
            <button className={authMode === 'signup' ? 'header-link active' : 'header-link'} onClick={() => setAuthMode('signup')} type="button">Sign Up</button>
          </> : <>
            <button className={view === 'home' ? 'header-link active' : 'header-link'} onClick={() => openApp('home')} type="button">Home</button>
          </>}
          <button className={theme === 'dark' ? 'toggle active' : 'toggle'} aria-label="Toggle dark mode" onClick={updateTheme} type="button"><span /></button>
          <button className={reduceMotion ? 'toggle motion active' : 'toggle motion'} aria-label="Toggle reduced motion" onClick={updateMotion} type="button"><span /></button>
          <ReminderBell reminder={reminder} setReminder={updateReminder} />
          {user && <ProfileMenu user={user} profile={profile} openApp={openApp} />}
        </div>
      </header>
      <main>
        {authLoading && <section className="screen app-screen"><div className="panel auth-panel"><p>Loading your account...</p></div></section>}
        {!authLoading && isSupabaseConfigured && !user && <AuthScreen mode={authMode} setMode={setAuthMode} />}
        {canUseApp && passwordRecovery && <PasswordUpdateScreen onDone={() => setPasswordRecovery(false)} />}
        {canUseApp && !passwordRecovery && (locked ? <LockScreen pin={pin} onUnlock={() => setLocked(false)} /> : <>
        {isSupabaseConfigured && <AccountStatus localEntries={localEntries} onImport={importLocalEntries} message={importMessage} error={dataError} loading={dataLoading} />}
        <Suspense fallback={<section className="screen app-screen"><div className="panel auth-panel"><p>Loading page...</p></div></section>}>
        <Routes>
          <Route path="/" element={<Home entries={entries} onOpen={openApp} onSave={saveEntry} />} />
          <Route path="/checkin" element={<CheckIn nav={null} onSave={saveEntry} />} />
          <Route path="/activities" element={<Activities nav={null} entries={entries} />} />
          <Route path="/games" element={<JournalPrivacyGate locked={journalIsHidden} onUnlock={setJournalUnlocked} code={journalLockCode}><Games nav={null} entries={entries} onSave={(entry) => saveEntry(entry, 'games')} moods={moods} createEntry={createEntry} todayKey={todayKey} getPrimaryEntry={getPrimaryEntry} groupEntriesByDate={groupEntriesByDate} /></JournalPrivacyGate>} />
          <Route path="/games/:gameId" element={<JournalPrivacyGate locked={journalIsHidden} onUnlock={setJournalUnlocked} code={journalLockCode}><Games nav={null} entries={entries} onSave={(entry) => saveEntry(entry, 'games')} moods={moods} createEntry={createEntry} todayKey={todayKey} getPrimaryEntry={getPrimaryEntry} groupEntriesByDate={groupEntriesByDate} /></JournalPrivacyGate>} />
          <Route path="/entries" element={<JournalPrivacyGate locked={journalIsHidden} onUnlock={setJournalUnlocked} code={journalLockCode}><Entries nav={null} entries={entries} onCreate={() => openApp('checkin')} onSave={saveEntry} onDelete={deleteEntry} onPrimary={setPrimaryEntry} /></JournalPrivacyGate>} />
          <Route path="/calendar" element={<JournalPrivacyGate locked={journalIsHidden} onUnlock={setJournalUnlocked} code={journalLockCode}><Calendar nav={null} entries={entries} onPrimary={setPrimaryEntry} /></JournalPrivacyGate>} />
          <Route path="/summary" element={<JournalPrivacyGate locked={journalIsHidden} onUnlock={setJournalUnlocked} code={journalLockCode}><Summary nav={null} entries={entries} /></JournalPrivacyGate>} />
          <Route path="/about" element={<About nav={null} />} />
          <Route path="/newsletter" element={<Newsletter nav={null} />} />
          <Route path="/admin" element={profile?.role === 'admin' ? <AdminPanel nav={null} /> : <Navigate to="/" replace />} />
          <Route path="/settings" element={<Settings nav={null} user={user} profile={profile} entries={entries} saveEntries={saveEntries} fontScale={fontScale} setFontScale={updateFontScale} fontStyle={fontStyle} setFontStyle={updateFontStyle} siteTheme={siteTheme} setSiteTheme={updateSiteTheme} pin={pin} setPin={updatePin} journalLockCode={journalLockCode} setJournalLockCode={updateJournalLock} journalUnlocked={journalUnlocked} setJournalUnlocked={setJournalUnlocked} reminder={reminder} setReminder={updateReminder} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        </>)}
      </main>
      <footer className="footer">
        <a href="https://positivepsychology.com/benefits-of-journaling/" target="_blank" rel="noreferrer">Learn More</a>
        <a href="https://www.choosingtherapy.com/journaling-for-mental-health/" target="_blank" rel="noreferrer">About Journaling</a>
      </footer>
    </div>
  );
}

export default App;
