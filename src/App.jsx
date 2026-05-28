import { useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from './supabaseClient';

const logoUrl = new URL('../img/JJ.png', import.meta.url).href;
const emotionWheelUrl = new URL('../img/Emotion-Wheel.png', import.meta.url).href;
const journalUrl = new URL('../img/Journal.png', import.meta.url).href;
const yogaUrl = new URL('../img/Yoga.png', import.meta.url).href;
const sunshineUrl = new URL('../img/sunshine.png', import.meta.url).href;

const moods = [
  { key: 'Happy', emoji: '😊', color: '#ffd166', feelings: ['Joyful', 'Proud', 'Playful', 'Hopeful', 'Loved'], score: 8 },
  { key: 'Content', emoji: '🙂', color: '#f4a261', feelings: ['Settled', 'Comfortable', 'Balanced', 'Safe', 'Present'], score: 7 },
  { key: 'Excited', emoji: '🤩', color: '#ff9f1c', feelings: ['Eager', 'Inspired', 'Energized', 'Curious', 'Motivated'], score: 8 },
  { key: 'Calm', emoji: '😌', color: '#8ecae6', feelings: ['Peaceful', 'Relaxed', 'Grounded', 'Clear', 'Relieved'], score: 7 },
  { key: 'Anxious', emoji: '😰', color: '#f28482', feelings: ['Worried', 'Nervous', 'Unsure', 'Restless', 'Scared'], score: 4 },
  { key: 'Sad', emoji: '😢', color: '#90a4ae', feelings: ['Disappointed', 'Hurt', 'Grieving', 'Discouraged', 'Heavy'], score: 3 },
  { key: 'Angry', emoji: '😡', color: '#ff6b6b', feelings: ['Frustrated', 'Irritated', 'Resentful', 'Betrayed', 'Defensive'], score: 4 },
  { key: 'Lonely', emoji: '😔', color: '#bdb2ff', feelings: ['Left out', 'Disconnected', 'Unseen', 'Homesick', 'Isolated'], score: 3 },
  { key: 'Grateful', emoji: '🙏', color: '#b7c7a3', feelings: ['Thankful', 'Appreciative', 'Touched', 'Lucky', 'Supported'], score: 8 },
  { key: 'Tired', emoji: '😴', color: '#a8dadc', feelings: ['Drained', 'Sleepy', 'Burned out', 'Foggy', 'Low energy'], score: 4 },
  { key: 'Overwhelmed', emoji: '😵', color: '#ffb4a2', feelings: ['Stressed', 'Pressured', 'Scattered', 'Stuck', 'Flooded'], score: 3 },
  { key: 'Panic', emoji: '😱', color: '#ff8fa3', feelings: ['Terrified', 'Shaky', 'Trapped', 'Racing', 'Unsafe'], score: 2 },
  { key: 'Numb', emoji: '😶', color: '#cfd8dc', feelings: ['Blank', 'Detached', 'Flat', 'Distant', 'Frozen'], score: 3 }
];

const factors = ['Sleep', 'School', 'Work', 'Friends', 'Family', 'Body', 'Food', 'Money', 'Social media', 'Weather', 'Health', 'Identity'];
const prompts = [
  'What happened right before this feeling showed up?',
  'Where do you feel this mood in your body?',
  'What do you need most right now?',
  'What is one kind thing you can tell yourself?',
  'What helped you get through a similar feeling before?'
];
const guidedPrompts = {
  Reflect: prompts,
  Gratitude: ['What is one small thing that went okay today?', 'Who or what helped you recently?', 'What is something you want to remember from today?'],
  Grounding: ['Name five things you can see right now.', 'What sounds, colors, or textures are around you?', 'What feels steady or safe in this moment?'],
  Growth: ['What did this mood teach you?', 'What would you try differently next time?', 'What is one small win from today?'],
  Support: ['Who could you talk to if this feeling gets heavier?', 'What would you say to a friend feeling this way?', 'What support do you need right now?']
};
const activities = {
  Anxious: [
    { title: 'Box breathing', minutes: 2, detail: 'Breathe in 4, hold 4, out 4, hold 4. Repeat slowly.', steps: ['Sit somewhere steady', 'Relax your shoulders', 'Complete 4 rounds'] },
    { title: '5-4-3-2-1 grounding', minutes: 3, detail: 'Name things you can see, touch, hear, smell, and taste.', steps: ['Name 5 things you see', 'Name 4 things you feel', 'Name 3 things you hear'] },
    { title: 'Tiny next step', minutes: 5, detail: 'Write the smallest action that would make the next 10 minutes easier.', steps: ['Write one worry', 'Write one next action', 'Do only that action'] }
  ],
  Sad: [
    { title: 'Comfort reset', minutes: 5, detail: 'Get water, sit somewhere soft, and play one comforting song.', steps: ['Drink water', 'Put on a calm song', 'Write one thing you need'] },
    { title: 'Low-pressure text', minutes: 4, detail: 'Send a simple check-in to someone safe.', steps: ['Pick one person', 'Send “Can I talk for a minute?”', 'Put your phone down while waiting'] },
    { title: 'Light movement', minutes: 6, detail: 'Walk around your room or stretch slowly.', steps: ['Stand up', 'Stretch arms and neck', 'Walk for 3 minutes'] }
  ],
  Angry: [
    { title: 'Cool-down pause', minutes: 4, detail: 'Step away before replying or deciding.', steps: ['Put the phone down', 'Take 6 slow breaths', 'Write what boundary you need'] },
    { title: 'Energy release', minutes: 8, detail: 'Do safe movement to release tension.', steps: ['Walk quickly', 'Shake out your hands', 'Drink water'] },
    { title: 'Unsent message', minutes: 7, detail: 'Write what you want to say without sending it.', steps: ['Write freely', 'Underline the real need', 'Choose one calm sentence'] }
  ],
  Overwhelmed: [
    { title: 'One-task sprint', minutes: 10, detail: 'Pick one task that can move forward today.', steps: ['Write three tasks', 'Circle the smallest one', 'Work for 10 minutes'] },
    { title: 'Clear one surface', minutes: 5, detail: 'Reset a small physical area to reduce visual stress.', steps: ['Pick one desk or chair', 'Remove trash', 'Put three items away'] },
    { title: 'Phone break', minutes: 5, detail: 'Give your brain a short break from scrolling.', steps: ['Set phone face down', 'Look across the room', 'Take slow breaths'] }
  ],
  Panic: [
    { title: 'Feet on the floor', minutes: 3, detail: 'Press your feet down and describe the ground under you.', steps: ['Sit down', 'Press both feet down', 'Name where you are'] },
    { title: 'Cold water reset', minutes: 2, detail: 'Splash cold water on your face or hold a cold cup.', steps: ['Get cold water', 'Notice the temperature', 'Breathe slowly'] },
    { title: 'Safety sentence', minutes: 2, detail: 'Repeat one true sentence about this moment.', steps: ['Name the date', 'Name your location', 'Say “This feeling will pass”'] }
  ],
  Tired: [
    { title: 'Rest your eyes', minutes: 5, detail: 'Close your eyes and let your body settle.', steps: ['Dim your screen', 'Close your eyes', 'Relax your jaw'] },
    { title: 'Gentle stretch', minutes: 6, detail: 'Stretch neck, shoulders, wrists, and back.', steps: ['Roll shoulders', 'Stretch wrists', 'Breathe out slowly'] },
    { title: 'Energy check', minutes: 4, detail: 'Choose what can wait until later.', steps: ['List one must-do', 'List one can-wait', 'Lower one expectation'] }
  ],
  default: [
    { title: '10-minute walk', minutes: 10, detail: 'Walk outside or around your space without multitasking.', steps: ['Put on shoes', 'Walk for 10 minutes', 'Notice three things'] },
    { title: 'Gratitude snapshot', minutes: 4, detail: 'Write three small things that went okay today.', steps: ['Write one person', 'Write one place', 'Write one small win'] },
    { title: 'Warm drink pause', minutes: 7, detail: 'Make tea, cocoa, or water and drink it slowly.', steps: ['Make a drink', 'Sit down', 'Take five slow sips'] }
  ]
};

const featureCards = [
  { image: emotionWheelUrl, title: 'Emotion Exploration', text: 'Use a wider feeling vocabulary to identify what is happening.' },
  { image: journalUrl, title: 'Journals and Notes', text: 'Write what happened, what you felt, and what you need without judgment.' },
  { image: yogaUrl, title: 'Mindfulness Activity', text: 'Try small body-based activities that can help steady or lift your mood.' }
];

const resourceLinks = [
  { href: 'https://youtu.be/j7rKKpwdXNE?si=hZhSu72GBqKiXU2b', title: 'Stretch and Relief', tag: 'Stress Relief', className: 'calm', text: '10-minute YouTube yoga stretches to help relieve stress and loosen tension.' },
  { href: 'https://www.youtube.com/live/dnBAU8Co6PA?si=J-u4VaLRCmOt_Npu', title: 'Music Playlist', tag: 'Calm / Focus', className: 'focus', text: 'Soothing instrumental tracks to calm your mind.' },
  { href: 'https://positivepsychology.com/emotion-regulation/', title: 'Emotional Regulation', tag: 'Learn', className: 'learn', text: 'Clear tips to stay balanced, spot triggers, and respond to challenges in healthier ways.' }
];
const scavengerSets = [
  ['Find something soft', 'Notice one calming color', 'Name a sound nearby', 'Find something that makes you smile'],
  ['Find something round', 'Notice one shadow', 'Name one steady object', 'Find something that feels cool'],
  ['Find something that reminds you of outside', 'Notice one texture', 'Name one faraway sound', 'Find one thing you can tidy'],
  ['Find something blue or green', 'Notice one source of light', 'Name one scent', 'Find something you are grateful for']
];
const matchThemes = [
  { id: 'anxious', label: 'Anxious', pieces: ['Box breathing', 'I can slow down', 'Wave'] },
  { id: 'sad', label: 'Sad', pieces: ['Text someone safe', 'I deserve care', 'Blanket'] },
  { id: 'angry', label: 'Angry', pieces: ['Step away', 'I can choose my response', 'Flame'] },
  { id: 'tired', label: 'Tired', pieces: ['Rest eyes', 'Rest is productive', 'Moon'] }
];
const rotatingGames = ['match', 'constellation', 'garden', 'memory', 'orbit', 'night'];
const gameLabels = {
  match: 'Emotional Match',
  constellation: 'Daily Constellation',
  garden: 'Mood Garden',
  memory: 'Memory Jar',
  orbit: 'Orbit Simulator',
  night: 'Night Sky Reflection'
};

const appViews = ['checkin', 'activities', 'games', 'entries', 'calendar', 'summary', 'about', 'newsletter'];
const navLabels = {
  checkin: 'Check-In',
  activities: 'Activities',
  games: 'Games',
  entries: 'Entries',
  calendar: 'Calendar',
  summary: 'Summary',
  about: 'About',
  newsletter: 'Newsletter',
  admin: 'Admin'
};
const todayKey = () => new Date().toISOString().slice(0, 10);
const createEntry = () => ({
  id: crypto.randomUUID(),
  type: 'checkin',
  created: new Date().toISOString(),
  dateKey: todayKey(),
  mood: '',
  specificFeeling: '',
  intensity: 5,
  factors: [],
  tags: [],
  note: '',
  copingStep: '',
  meals: '',
  water: '',
  sleep: '',
  primary: false
});
const createFreeWriteEntry = () => ({
  ...createEntry(),
  type: 'journal',
  mood: 'Content',
  specificFeeling: 'Present',
  intensity: 5,
  tags: ['free-write']
});
const localEntriesKey = 'journalEntriesV2';
const normalizeUsername = (value) => value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
const readStorage = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

function App() {
  const [view, setView] = useState('home');
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
    const sameDayCheckIns = entries.filter((item) => isCheckIn(item) && item.dateKey === entry.dateKey && item.id !== entry.id);
    const normalized = {
      ...entry,
      type: entryType,
      primary: entryType === 'checkin' && (entry.primary || sameDayCheckIns.length === 0),
      moodScore: mood?.score || null,
      updated: new Date().toISOString()
    };
    const exists = entries.some((item) => item.id === normalized.id);
    const nextEntries = exists ? entries.map((item) => item.id === normalized.id ? normalized : item) : [normalized, ...entries];
    await saveEntries(normalized.primary ? nextEntries.map((item) => isCheckIn(item) && item.dateKey === normalized.dateKey ? { ...item, primary: item.id === normalized.id } : item) : nextEntries);
    setView(nextView);
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
    setView(nextView);
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
  const sectionNav = canUseApp && !locked && !passwordRecovery ? <AppNav activeView={view} views={visibleViews} onOpen={openApp} /> : null;

  return (
    <div className={`app theme-${siteTheme} ${theme === 'dark' ? 'dark' : ''} ${reduceMotion ? 'reduced-motion' : ''} font-${fontStyle}`} style={{ '--font-scale': fontScale }}>
      <ThemeAtmosphere />
      <header className="topbar">
        <button className="brand" onClick={() => setView('home')} type="button">
          <img src={logoUrl} alt="" />
          <span>Mood Journal</span>
        </button>
        <div className="header-actions">
          {!canUseApp && isSupabaseConfigured ? <>
            <button className={authMode === 'signin' ? 'header-link active' : 'header-link'} onClick={() => setAuthMode('signin')} type="button">Log In</button>
            <button className={authMode === 'signup' ? 'header-link active' : 'header-link'} onClick={() => setAuthMode('signup')} type="button">Sign Up</button>
          </> : <>
            <button className={view === 'home' ? 'header-link active' : 'header-link'} onClick={() => setView('home')} type="button">Home</button>
            <button className={view === 'settings' ? 'header-link active' : 'header-link'} onClick={() => openApp('settings')} type="button">Profile</button>
          </>}
          {user && <button className="header-link" onClick={() => supabase.auth.signOut()} type="button">Sign out</button>}
          <button className={theme === 'dark' ? 'toggle active' : 'toggle'} aria-label="Toggle dark mode" onClick={updateTheme} type="button"><span /></button>
          <button className={reduceMotion ? 'toggle motion active' : 'toggle motion'} aria-label="Toggle reduced motion" onClick={updateMotion} type="button"><span /></button>
          <ReminderBell reminder={reminder} setReminder={updateReminder} />
        </div>
      </header>
      <main>
        {authLoading && <section className="screen app-screen"><div className="panel auth-panel"><p>Loading your account...</p></div></section>}
        {!authLoading && isSupabaseConfigured && !user && <AuthScreen mode={authMode} setMode={setAuthMode} />}
        {canUseApp && passwordRecovery && <PasswordUpdateScreen onDone={() => setPasswordRecovery(false)} />}
        {canUseApp && !passwordRecovery && (locked ? <LockScreen pin={pin} onUnlock={() => setLocked(false)} /> : <>
        {isSupabaseConfigured && <AccountStatus localEntries={localEntries} onImport={importLocalEntries} message={importMessage} error={dataError} loading={dataLoading} />}
        {view === 'home' && <Home nav={sectionNav} entries={entries} onOpen={openApp} />}
        {view === 'checkin' && <CheckIn nav={sectionNav} onSave={saveEntry} />}
        {view === 'activities' && <Activities nav={sectionNav} entries={entries} />}
        {view === 'games' && <JournalPrivacyGate locked={journalIsHidden} onUnlock={setJournalUnlocked} code={journalLockCode}><Games nav={sectionNav} entries={entries} onSave={(entry) => saveEntry(entry, 'games')} /></JournalPrivacyGate>}
        {view === 'entries' && <JournalPrivacyGate locked={journalIsHidden} onUnlock={setJournalUnlocked} code={journalLockCode}><Entries nav={sectionNav} entries={entries} onCreate={() => openApp('checkin')} onSave={saveEntry} onDelete={deleteEntry} onPrimary={setPrimaryEntry} /></JournalPrivacyGate>}
        {view === 'calendar' && <JournalPrivacyGate locked={journalIsHidden} onUnlock={setJournalUnlocked} code={journalLockCode}><Calendar nav={sectionNav} entries={entries} onPrimary={setPrimaryEntry} /></JournalPrivacyGate>}
        {view === 'summary' && <JournalPrivacyGate locked={journalIsHidden} onUnlock={setJournalUnlocked} code={journalLockCode}><Summary nav={sectionNav} entries={entries} /></JournalPrivacyGate>}
        {view === 'about' && <About nav={sectionNav} />}
        {view === 'newsletter' && <Newsletter nav={sectionNav} />}
        {view === 'admin' && profile?.role === 'admin' && <AdminPanel nav={sectionNav} />}
        {view === 'settings' && <Settings nav={sectionNav} user={user} profile={profile} entries={entries} saveEntries={saveEntries} fontScale={fontScale} setFontScale={updateFontScale} fontStyle={fontStyle} setFontStyle={updateFontStyle} siteTheme={siteTheme} setSiteTheme={updateSiteTheme} pin={pin} setPin={updatePin} journalLockCode={journalLockCode} setJournalLockCode={updateJournalLock} journalUnlocked={journalUnlocked} setJournalUnlocked={setJournalUnlocked} reminder={reminder} setReminder={updateReminder} />}
        </>)}
      </main>
      <footer className="footer">
        <a href="https://positivepsychology.com/benefits-of-journaling/" target="_blank" rel="noreferrer">Learn More</a>
        <a href="https://www.choosingtherapy.com/journaling-for-mental-health/" target="_blank" rel="noreferrer">About Journaling</a>
      </footer>
    </div>
  );
}

function AppNav({ activeView, views, onOpen }) {
  return (
    <nav className="body-tabs" aria-label="App sections">
      {views.map((item) => (
        <button className={activeView === item ? 'active' : ''} key={item} onClick={() => onOpen(item)} type="button">
          {navLabels[item] || item}
        </button>
      ))}
    </nav>
  );
}

function ThemeAtmosphere() {
  return (
    <div className="theme-atmosphere" aria-hidden="true">
      <span className="atmosphere-layer layer-one" />
      <span className="atmosphere-layer layer-two" />
      <span className="atmosphere-layer layer-three" />
      <span className="atmosphere-particles" />
    </div>
  );
}

function JournalPrivacyGate({ locked, code, onUnlock, children }) {
  const [attempt, setAttempt] = useState('');
  const [error, setError] = useState('');
  const submit = (event) => {
    event.preventDefault();
    if (attempt === code) {
      setError('');
      onUnlock(true);
      return;
    }
    setError('That passphrase or PIN did not match.');
  };
  if (!locked) return children;
  return (
    <section className="screen app-screen">
      <div className="privacy-lock-panel">
        <div className="privacy-blur" aria-hidden="true">
          <article />
          <article />
          <article />
        </div>
        <form className="panel lock-form privacy-unlock" onSubmit={submit}>
          <h1>Journal Locked</h1>
          <p>Your journal entries are hidden on this device. Enter your journal passphrase or PIN to reveal them.</p>
          <label>Passphrase or PIN
            <input autoComplete="current-password" onChange={(event) => setAttempt(event.target.value)} type="password" value={attempt} />
          </label>
          <button className="primary" type="submit">Reveal journal</button>
          {error && <p className="form-error">{error}</p>}
        </form>
      </div>
    </section>
  );
}

function AuthScreen({ mode, setMode }) {
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    const email = form.email.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setError('Please enter an email address like email@example.com.');
      setSubmitting(false);
      return;
    }
    if (mode === 'reset') {
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      setSubmitting(false);
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setMessage('Password reset email sent. Check your inbox and follow the link.');
      return;
    }
    const username = normalizeUsername(form.username);
    if (mode === 'signup' && username.length < 3) {
      setError('Username must be at least 3 characters and use letters, numbers, or underscores.');
      setSubmitting(false);
      return;
    }
    if (mode === 'signup') {
      const { data: existingProfile, error: usernameError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();
      if (usernameError) {
        setError(usernameError.message);
        setSubmitting(false);
        return;
      }
      if (existingProfile) {
        setError('That username is already taken.');
        setSubmitting(false);
        return;
      }
    }
    const credentials = { email, password: form.password };
    const { error: authError } = mode === 'signin'
      ? await supabase.auth.signInWithPassword(credentials)
      : await supabase.auth.signUp({ ...credentials, options: { data: { username } } });
    setSubmitting(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    if (mode === 'signup') setMessage('Account created. If email verification is enabled in Supabase, check your inbox before signing in.');
  };

  if (!isSupabaseConfigured) {
    return (
      <section className="screen app-screen">
        <div className="panel auth-panel">
          <h1>Connect Supabase</h1>
          <p>Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel and your local `.env` file to turn on multi-user accounts.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="screen app-screen">
      <div className="panel auth-panel">
        <h1>{mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Password Recovery'}</h1>
        <p>{mode === 'reset' ? 'Enter your account email and Supabase will send a reset link.' : 'Use an account to keep your journal entries private and available across devices.'}</p>
        <form className="auth-form" onSubmit={submit}>
          <label>Email
            <input autoComplete="email" onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="email@example.com" required type="email" value={form.email} />
          </label>
          {mode === 'signup' && <label>Username
            <input autoComplete="username" onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="letters, numbers, underscores" required value={form.username} />
          </label>}
          {mode !== 'reset' && <label>Password
            <input autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength="6" onChange={(event) => setForm({ ...form, password: event.target.value })} required type="password" value={form.password} />
          </label>}
          <button className="primary" disabled={submitting} type="submit">{submitting ? 'Please wait...' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset email'}</button>
        </form>
        {error && <p className="form-error">{error}</p>}
        {message && <p className="success-message">{message}</p>}
        {mode === 'signin' && <p className="auth-note">If your project has email verification on, confirm your email before signing in.</p>}
        <button className="text-button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} type="button">
          {mode === 'signin' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
        </button>
        {mode === 'signin' && <button className="text-button" onClick={() => setMode('reset')} type="button">Forgot password?</button>}
      </div>
    </section>
  );
}

function PasswordUpdateScreen({ onDone }) {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage('Password updated. You can continue to the app.');
  };
  return (
    <section className="screen app-screen">
      <div className="panel auth-panel">
        <h1>Reset Password</h1>
        <p>Enter a new password for your account.</p>
        <form className="auth-form" onSubmit={submit}>
          <label>New password
            <input autoComplete="new-password" minLength="6" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          </label>
          <button className="primary" disabled={submitting} type="submit">{submitting ? 'Updating...' : 'Update password'}</button>
        </form>
        {error && <p className="form-error">{error}</p>}
        {message && <p className="success-message">{message}</p>}
        {message && <button onClick={onDone} type="button">Continue</button>}
      </div>
    </section>
  );
}

function AccountStatus({ localEntries, onImport, message, error, loading }) {
  const hasLocalEntries = localEntries.length > 0;
  if (!hasLocalEntries && !message && !error && !loading) return null;
  return (
    <section className="account-status">
      <div>
        <strong>{loading ? 'Syncing journal entries...' : 'Account notice'}</strong>
      </div>
      {hasLocalEntries && <button onClick={onImport} type="button">Import local entries</button>}
      {message && <span className="success-message">{message}</span>}
      {error && <span className="form-error">{error}</span>}
    </section>
  );
}

function AdminPanel({ nav }) {
  const [stats, setStats] = useState({ users: null, entries: null });
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const loadStats = async () => {
      const { count: userCount, error: userError } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      if (!active) return;
      if (userError) {
        setError(userError.message);
        return;
      }
      setStats({ users: userCount, entries: 'Private by RLS' });
    };
    loadStats();
    return () => {
      active = false;
    };
  }, []);
  return (
    <section className="screen app-screen">
      <h1>Admin</h1>
      {nav}
      <div className="dashboard-grid">
        <article className="dashboard-card">
          <span>Total profiles</span>
          <strong>{stats.users ?? '--'}</strong>
        </article>
        <article className="dashboard-card">
          <span>Journal entries</span>
          <strong>{stats.entries ?? '--'}</strong>
          <p>Admins do not get a normal UI to browse private entries.</p>
        </article>
        <article className="dashboard-card">
          <span>Status</span>
          <p>{error || 'Admin read checks are working.'}</p>
        </article>
      </div>
    </section>
  );
}

function Home({ nav, entries, onOpen }) {
  const todayEntries = entries.filter((entry) => entry.dateKey === todayKey());
  const todayCheckIns = todayEntries.filter(isCheckIn);
  const mainToday = getPrimaryEntry(todayCheckIns);
  const mood = mainToday ? moods.find((item) => item.key === mainToday.mood) : null;
  const streak = calculateStreak(entries.filter(isCheckIn));
  return (
    <div className="home-page">
      <section className="home-hero" id="home">
        <img className="home-logo" src={logoUrl} alt="Mood Journal logo" />
        <div>
          <h1>Daily Mood Check-In</h1>
          {nav}
          <h3>Every Mood Tells a Story!</h3>
        </div>
      </section>
      <section className="dashboard-grid">
        <article className="dashboard-card">
          <span>Today's mood</span>
          <strong>{mainToday ? `${mood?.emoji || ''} ${mainToday.mood}` : 'Not checked in yet'}</strong>
          <button className="primary" onClick={() => onOpen('checkin')} type="button">Quick Check-In</button>
        </article>
        <article className="dashboard-card">
          <span>Current streak</span>
          <strong>{streak} day{streak === 1 ? '' : 's'}</strong>
          <p>{streak > 0 ? 'You have been showing up for yourself.' : 'Start with one small check-in today.'}</p>
        </article>
        <article className="dashboard-card">
          <span>Entries today</span>
          <strong>{todayEntries.length}</strong>
          <button onClick={() => onOpen('entries')} type="button">Review Entries</button>
        </article>
      </section>
      <section className="about-section video-only" id="about">
        <div className="video-container">
          <iframe
            title="Breathing and mindfulness video"
            src="https://www.youtube.com/embed/eZBa63NZbbE?si=1-lljpa63qeL2DnA"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <p>A private space to name your feelings, notice what affects them, and choose one small next step. No pressure. The goal is to understand your mood with more kindness and less judgment.</p>
      </section>
    </div>
  );
}

function ReminderBell({ reminder, setReminder }) {
  const [open, setOpen] = useState(false);
  const updateFirstTime = (time) => setReminder({ ...reminder, time, times: [time, ...(reminder.times || []).slice(1)] });
  return (
    <section className="reminder-widget">
      <button className={reminder.enabled ? 'bell-button active' : 'bell-button'} onClick={() => setOpen(!open)} type="button" aria-label="Reminder settings">{'\uD83D\uDD14'}</button>
      {open && <div className="reminder-menu">
        <label>Daily reminder
          <input onChange={(event) => updateFirstTime(event.target.value)} type="time" value={reminder.times?.[0] || reminder.time || '19:00'} />
        </label>
        <button onClick={async () => {
          if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
          setReminder({ ...reminder, enabled: !reminder.enabled });
        }} type="button">{reminder.enabled ? 'Turn off' : 'Turn on'}</button>
      </div>}
    </section>
  );
}

function Games({ nav, entries, onSave }) {
  const gameEntries = entries.filter((entry) => (entry.tags || []).includes('game'));
  return (
    <section className="screen app-screen games-screen">
      <h1>Games</h1>
      {nav}
      <MiniGames entries={entries} onSave={onSave} />
      <NightSkyGalaxy entries={entries} />
      <div className="collection-grid">
        <ConstellationGallery entries={gameEntries} />
        <MemoryJarCollection entries={gameEntries} />
      </div>
    </section>
  );
}

function NightSkyGalaxy({ entries }) {
  const grouped = groupEntriesByDate(entries);
  const stars = Object.entries(grouped).map(([dateKey, dayEntries], index) => {
    const entry = getPrimaryEntry(dayEntries);
    const mood = moods.find((item) => item.key === entry?.mood) || moods[0];
    const intensity = Number(entry?.intensity || mood.score || 5);
    return {
      id: dateKey,
      dateKey,
      mood,
      intensity,
      starColor: getStarColor(mood, intensity),
      x: 8 + ((index * 23) % 84),
      y: 10 + ((index * 37) % 78)
    };
  });
  return (
    <section className="galaxy-section">
      <div>
        <h2>Personal Night Sky</h2>
        <p>Each journal day becomes a star. Brighter stars reflect stronger entries.</p>
      </div>
      <div className="galaxy-map">
        {stars.length === 0 && <p>Add journal entries to begin your sky.</p>}
        {stars.map((star) => (
          <span
            className="galaxy-star"
            key={star.id}
            style={{ '--star-x': `${star.x}%`, '--star-y': `${star.y}%`, '--star-size': `${10 + star.intensity * 2}px`, '--star-color': star.starColor }}
            title={`${star.dateKey}: ${star.mood.key}`}
          />
        ))}
      </div>
    </section>
  );
}

function ConstellationGallery({ entries }) {
  const constellations = entries.filter((entry) => (entry.tags || []).includes('constellation'));
  return (
    <section className="collection-card">
      <h2>Saved Constellations</h2>
      {constellations.length === 0 ? <p>No constellations saved yet.</p> : constellations.slice(0, 4).map((entry) => (
        <article className="saved-constellation" key={entry.id}>
          <div className="mini-sky">{Array.from({ length: 6 }, (_, index) => <span key={index} />)}</div>
          <p>{entry.note}</p>
        </article>
      ))}
    </section>
  );
}

function MemoryJarCollection({ entries }) {
  const memories = entries.filter((entry) => (entry.tags || []).includes('memory-jar') || (entry.tags || []).includes('positive-moment'));
  return (
    <section className="collection-card">
      <h2>Memory Jar</h2>
      <div className="large-memory-jar">
        {memories.length === 0 ? <span>Add a positive memory from the featured game.</span> : memories.slice(0, 6).map((entry) => <span key={entry.id} style={{ '--memory-color': getMoodColor(entry.mood) }}>{entry.note.replace('Memory Jar: ', '')}</span>)}
      </div>
    </section>
  );
}

function MiniGames({ entries, onSave }) {
  const dayNumber = Math.floor(new Date(todayKey()).getTime() / 86400000);
  const huntItems = scavengerSets[dayNumber % scavengerSets.length];
  const featuredGame = rotatingGames[dayNumber % rotatingGames.length];
  const todayEntries = entries.filter((entry) => entry.dateKey === todayKey());
  const mainToday = getPrimaryEntry(todayEntries);
  const mood = moods.find((item) => item.key === mainToday?.mood) || moods[0];
  const [huntDone, setHuntDone] = useState([]);
  const [bubbleRunning, setBubbleRunning] = useState(false);
  const saveGameEntry = (title, note, tags = []) => onSave({
    ...createEntry(),
    type: 'game',
    mood: mood.key,
    specificFeeling: mood.feelings[0],
    intensity: mainToday?.intensity || mood.score || 5,
    note: `${title}: ${note}`,
    tags: ['game', ...tags],
    copingStep: 'Reflect on what changed after this activity.'
  });
  const toggleHuntItem = (item) => {
    setHuntDone((current) => (
      current.includes(item) ? current.filter((doneItem) => doneItem !== item) : [...current, item]
    ));
  };

  return (
    <section className="minigames-section" id="minigames">
      <h2>Mini Games</h2>
      <p className="recommendation-note">Breathing and scavenger hunt stay available every day. The featured game changes daily.</p>
      <div className="minigame-grid daily-games">
        <article className="minigame-card breathing-game">
          <h3>Breathing Bubble</h3>
          <p>Follow the bubble as it grows and settles.</p>
          <div className={bubbleRunning ? 'breathing-bubble active' : 'breathing-bubble'} />
          <button onClick={() => setBubbleRunning(!bubbleRunning)} type="button">{bubbleRunning ? 'Pause' : 'Start'}</button>
        </article>
        <article className="minigame-card">
          <h3>Daily Scavenger Hunt</h3>
          <p>Use your space to ground yourself for a minute.</p>
          <div className="hunt-list">
            {huntItems.map((item) => (
              <label key={item}>
                <input checked={huntDone.includes(item)} onChange={() => toggleHuntItem(item)} type="checkbox" />
                {item}
              </label>
            ))}
          </div>
          <button disabled={huntDone.length === 0} onClick={() => setHuntDone([])} type="button">Clear finds</button>
        </article>
      </div>
      <section className="featured-game-section">
        <div>
          <h2>Featured Today: {gameLabels[featuredGame]}</h2>
          <p>One rotating reflection game keeps the page focused.</p>
        </div>
        <FeaturedGame game={featuredGame} mood={mood} mainToday={mainToday} entries={entries} onSave={saveGameEntry} />
      </section>
    </section>
  );
}

function FeaturedGame({ game, mood, mainToday, entries, onSave }) {
  const games = {
    match: <EmotionalMatchGame onSave={onSave} />,
    constellation: <ConstellationGame mood={mood} onSave={onSave} />,
    garden: <MoodGardenGame mood={mood} onSave={onSave} />,
    memory: <MemoryJarGame entries={entries} onSave={onSave} />,
    orbit: <OrbitGame onSave={onSave} />,
    night: <NightSkyGame mood={mood} mainToday={mainToday} onSave={onSave} />
  };
  return games[game] || games.match;
}

function EmotionalMatchGame({ onSave }) {
  const cards = useMemo(() => matchThemes.flatMap((theme) => [
    { id: `${theme.id}-emotion`, theme: theme.id, label: theme.label },
    { id: `${theme.id}-strategy`, theme: theme.id, label: theme.pieces[0] },
    { id: `${theme.id}-affirmation`, theme: theme.id, label: theme.pieces[1] },
    { id: `${theme.id}-symbol`, theme: theme.id, label: theme.pieces[2] }
  ]).sort(() => Math.random() - 0.5), []);
  const [selected, setSelected] = useState([]);
  const [matched, setMatched] = useState([]);
  const chooseCard = (card) => {
    if (selected.includes(card.id) || matched.includes(card.id) || selected.length === 2) return;
    const nextSelected = [...selected, card.id];
    setSelected(nextSelected);
    if (nextSelected.length === 2) {
      const first = cards.find((item) => item.id === nextSelected[0]);
      if (first?.theme === card.theme) {
        setMatched((current) => [...current, ...nextSelected]);
        setSelected([]);
      } else {
        setTimeout(() => setSelected([]), 700);
      }
    }
  };
  return (
    <article className="minigame-card">
      <h3>Featured: Emotional Match</h3>
      <p>Match a feeling with a strategy, affirmation, or symbol from the same mood family.</p>
      <div className="match-grid">
        {cards.map((card) => {
          const visible = selected.includes(card.id) || matched.includes(card.id);
          return <button className={visible ? 'match-card visible' : 'match-card'} key={card.id} onClick={() => chooseCard(card)} type="button">{visible ? card.label : '?'}</button>;
        })}
      </div>
      <button disabled={matched.length < cards.length} onClick={() => onSave('Emotional Match', 'Completed the emotional matching game.', ['emotional-match'])} type="button">Save win</button>
    </article>
  );
}

function ConstellationGame({ mood, onSave }) {
  const [selectedStars, setSelectedStars] = useState([]);
  const [name, setName] = useState('');
  const stars = Array.from({ length: 9 }, (_, index) => index + 1);
  const toggleStar = (star) => setSelectedStars((current) => current.includes(star) ? current.filter((item) => item !== star) : [...current, star]);
  return (
    <article className="minigame-card">
      <h3>Featured: Daily Constellation</h3>
      <p>Tap stars, name the shape, and save it to today's journal.</p>
      <div className="star-map">
        {stars.map((star) => <button className={selectedStars.includes(star) ? 'star selected' : 'star'} key={star} onClick={() => toggleStar(star)} type="button" aria-label={`Star ${star}`} />)}
      </div>
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Constellation name" />
      <button disabled={!name.trim() || selectedStars.length === 0} onClick={() => onSave('Daily Constellation', `${name.trim()} for ${mood.key}. Stars: ${selectedStars.join(', ')}`, ['constellation'])} type="button">Save constellation</button>
    </article>
  );
}

function MoodGardenGame({ mood, onSave }) {
  const growth = Math.max(2, Math.min(8, mood.score || 5));
  return (
    <article className="minigame-card">
      <h3>Featured: Mood Garden</h3>
      <p>Your current mood grows a small garden preview.</p>
      <div className="garden-preview" style={{ '--garden-color': mood.color }}>
        {Array.from({ length: growth }, (_, index) => <span key={index} />)}
      </div>
      <button onClick={() => onSave('Mood Garden', `${mood.key} grew ${growth} garden pieces today.`, ['mood-garden'])} type="button">Save garden</button>
    </article>
  );
}

function MemoryJarGame({ entries, onSave }) {
  const [memory, setMemory] = useState('');
  const [message, setMessage] = useState('');
  const memoryText = memory.trim();
  const previousMemories = entries.filter((entry) => (entry.tags || []).includes('memory-jar')).slice(0, 3);
  const duplicateToday = memoryText && entries.some((entry) => (
    entry.dateKey === todayKey()
    && (entry.tags || []).includes('memory-jar')
    && entry.note.replace('Memory Jar: ', '').trim().toLowerCase() === memoryText.toLowerCase()
  ));
  const saveMemory = async () => {
    if (!memoryText || duplicateToday) return;
    await onSave('Memory Jar', memoryText, ['memory-jar', 'positive-moment']);
    setMemory('');
    setMessage('Memory saved to your jar.');
  };
  return (
    <article className="minigame-card">
      <h3>Featured: Memory Jar</h3>
      <p>Add one small positive moment to revisit later.</p>
      <div className="memory-jar">
        {memory ? <span>{memory}</span> : previousMemories.length > 0 ? previousMemories.map((entry) => <span key={entry.id} style={{ '--memory-color': getMoodColor(entry.mood) }}>{entry.note.replace('Memory Jar: ', '')}</span>) : <span>Write a memory below</span>}
      </div>
      <textarea value={memory} onChange={(event) => { setMemory(event.target.value); setMessage(''); }} placeholder="A tiny good thing from today..." />
      {duplicateToday && <p className="form-error">That memory is already in today's jar.</p>}
      {message && <p className="success-message">{message}</p>}
      <button disabled={!memoryText || duplicateToday} onClick={saveMemory} type="button">Save memory</button>
    </article>
  );
}

function OrbitGame({ onSave }) {
  const [planets, setPlanets] = useState({ emotion: 'near', goal: 'middle', thought: 'far' });
  const updatePlanet = (planet) => setPlanets((current) => ({ ...current, [planet]: current[planet] === 'near' ? 'middle' : current[planet] === 'middle' ? 'far' : 'near' }));
  return (
    <article className="minigame-card">
      <h3>Featured: Orbit Simulator</h3>
      <p>Click planets until emotion, goal, and thought feel balanced.</p>
      <div className="orbit-map">
        {Object.entries(planets).map(([planet, orbit]) => <button className={`planet ${orbit}`} key={planet} onClick={() => updatePlanet(planet)} type="button">{planet}</button>)}
      </div>
      <button onClick={() => onSave('Orbit Simulator', Object.entries(planets).map(([planet, orbit]) => `${planet}: ${orbit}`).join(', '), ['orbit-simulator'])} type="button">Save orbit</button>
    </article>
  );
}

function NightSkyGame({ mood, mainToday, onSave }) {
  const brightness = Math.max(2, Math.min(10, Number(mainToday?.intensity || mood.score || 5)));
  const starColor = getStarColor(mood, brightness);
  return (
    <article className="minigame-card">
      <h3>Featured: Night Sky Reflection</h3>
      <p>Add today's star to your personal emotional galaxy.</p>
      <div className="night-sky">
        <span style={{ '--star-brightness': brightness / 10, '--star-color': starColor }} />
      </div>
      <button onClick={() => onSave('Night Sky Reflection', `${mood.key} star brightness: ${brightness}/10.`, ['night-sky'])} type="button">Save star</button>
    </article>
  );
}

function About({ nav }) {
  return (
    <section className="screen app-screen">
      <h1>About the App</h1>
      {nav}
      <div className="feature-cards">
        {featureCards.map((card) => (
          <article className="feature-card" key={card.title}>
            <img src={card.image} alt="" />
            <h3>{card.title}</h3>
            <p>{card.text}</p>
          </article>
        ))}
      </div>
      <Links />
    </section>
  );
}

function Newsletter({ nav }) {
  const [people, setPeople] = useState([
    { name: 'Jamie', school: 'Morgan State' },
    { name: 'Amy', school: 'Bowie' },
    { name: 'Teresa', school: 'UMBC' }
  ]);
  const [form, setForm] = useState({ name: '', email: '', school: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const submit = (event) => {
    event.preventDefault();
    if (form.name.trim().length < 2 || !form.email.includes('@') || form.school.trim().length < 2) {
      setError('Please enter a name, school, and valid email.');
      return;
    }
    setPeople([...people, { name: form.name.trim(), school: form.school.trim() }]);
    setMessage(`You're all set ${form.name.trim()}!`);
    setForm({ name: '', email: '', school: '' });
    setError('');
  };

  return (
    <section className="newsletter-section app-screen" id="rsvp">
      <h1>Stay Connected</h1>
      {nav}
      <div className="newsletter-grid">
        <p>Stay connected with upcoming wellness activities, journaling prompts, and mindfulness tips. Join our community to receive gentle reminders and supportive resources.</p>
        <div className="participants">
          {people.map((person, index) => <p key={`${person.name}-${index}`}>🌻 {person.name} from {person.school} has checked in!</p>)}
          <p>🔔 {people.length} people have checked in!</p>
        </div>
      </div>
      <form className="newsletter-form" onSubmit={submit}>
        <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Email<input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>School<input value={form.school} onChange={(event) => setForm({ ...form, school: event.target.value })} /></label>
        <button className="primary" type="submit">Stay Updated!</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      {message && <div className="success-box"><p>{message}<br />You'll receive updates with wellness tips and journaling prompts.</p><img src={sunshineUrl} alt="A cartoony image of the sun" /></div>}
    </section>
  );
}

function LockScreen({ pin, onUnlock }) {
  const [attempt, setAttempt] = useState('');
  const [error, setError] = useState('');
  const submit = (event) => {
    event.preventDefault();
    if (attempt === pin) {
      setError('');
      onUnlock();
    } else {
      setError('Incorrect PIN.');
    }
  };
  return (
    <section className="lock-screen">
      <h1>Journal Locked</h1>
      <form className="panel lock-form" onSubmit={submit}>
        <label>Enter PIN
          <input inputMode="numeric" onChange={(event) => setAttempt(event.target.value)} type="password" value={attempt} />
        </label>
        <button className="primary" type="submit">Unlock</button>
        {error && <p className="form-error">{error}</p>}
      </form>
    </section>
  );
}

function Links() {
  return (
    <section className="links-section" id="links">
      <h2>Links</h2>
      <div className="links-row">
        {resourceLinks.map((link) => (
          <a className="resource-link" href={link.href} key={link.href} target="_blank" rel="noreferrer">
            <article className={`resource-card ${link.className}`}>
              <h3>{link.title}</h3>
              <span className="tag">{link.tag}</span>
              <p>{link.text}</p>
            </article>
          </a>
        ))}
      </div>
    </section>
  );
}

function CheckIn({ nav, onSave }) {
  const [entry, setEntry] = useState(createEntry);
  const [promptType, setPromptType] = useState('Reflect');
  const mood = moods.find((item) => item.key === entry.mood);
  const setField = (field, value) => setEntry((current) => ({ ...current, [field]: value }));
  const toggleList = (field, value) => {
    setEntry((current) => ({
      ...current,
      [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value]
    }));
  };
  const submit = (event) => {
    event.preventDefault();
    if (!entry.mood || !entry.note.trim()) return;
    onSave(entry);
    setEntry(createEntry());
  };

  return (
    <section className="screen app-screen">
      <div className="tool-heading">
        <h1>Daily Mood Check-In</h1>
        {nav}
        <p>Name what you feel, notice what shaped it, and choose one small next step.</p>
      </div>
      <p className="support-note">This journal can help you notice patterns, but it is not a crisis service. If you might hurt yourself or someone else, call or text 988 in the U.S. now.</p>
      <form className="flow" onSubmit={submit}>
        <div className="mood-grid">
          {moods.map((item) => (
            <button className={entry.mood === item.key ? 'mood selected' : 'mood'} key={item.key} onClick={() => setField('mood', item.key)} style={{ '--mood': item.color }} type="button">
              <span>{item.emoji}</span>
              {item.key}
            </button>
          ))}
        </div>
        <div className="panel two-col">
          <label>Specific feeling
            <select value={entry.specificFeeling} onChange={(event) => setField('specificFeeling', event.target.value)}>
              <option value="">Choose one</option>
              {(mood?.feelings || []).map((feeling) => <option key={feeling}>{feeling}</option>)}
            </select>
          </label>
          <label>Intensity: {entry.intensity}/10
            <input min="1" max="10" type="range" value={entry.intensity} onChange={(event) => setField('intensity', Number(event.target.value))} />
          </label>
        </div>
        <ChipGroup label="What might be affecting your mood?" values={factors} selected={entry.factors} onToggle={(value) => toggleList('factors', value)} />
        <div className="panel three-col">
          <label>Meals
            <select value={entry.meals} onChange={(event) => setField('meals', event.target.value)}>
              <option value="">--</option><option>Light</option><option>Regular</option><option>Heavy</option><option>Skipped</option>
            </select>
          </label>
          <label>Water
            <select value={entry.water} onChange={(event) => setField('water', event.target.value)}>
              <option value="">--</option><option>0-1 cups</option><option>2-3 cups</option><option>4+ cups</option>
            </select>
          </label>
          <label>Sleep
            <select value={entry.sleep} onChange={(event) => setField('sleep', event.target.value)}>
              <option value="">--</option><option>0-4 hrs</option><option>5-6 hrs</option><option>7-8 hrs</option><option>9+ hrs</option>
            </select>
          </label>
        </div>
        <div className="panel">
          <label>Guided journaling mode
            <select value={promptType} onChange={(event) => setPromptType(event.target.value)}>
              {Object.keys(guidedPrompts).map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label>Journal prompt
            <textarea value={entry.note} onChange={(event) => setField('note', event.target.value)} placeholder={guidedPrompts[promptType][entry.intensity % guidedPrompts[promptType].length]} />
          </label>
        </div>
        <div className="panel two-col">
          <label>Tags
            <input value={entry.tags.join(', ')} onChange={(event) => setField('tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))} placeholder="school, family, anxiety" />
          </label>
          <label>One small next step
            <input value={entry.copingStep} onChange={(event) => setField('copingStep', event.target.value)} placeholder="Drink water, text a friend, take a walk" />
          </label>
        </div>
        <button className="primary" type="submit">Save Check-In</button>
      </form>
    </section>
  );
}

function ChipGroup({ label, values, selected, onToggle }) {
  return (
    <div className="panel">
      <p className="field-label">{label}</p>
      <div className="chips">
        {values.map((value) => (
          <button className={selected.includes(value) ? 'chip selected' : 'chip'} key={value} onClick={() => onToggle(value)} type="button">{value}</button>
        ))}
      </div>
    </div>
  );
}

function Entries({ nav, entries, onCreate, onSave, onDelete, onPrimary }) {
  const [query, setQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [creatingFreeWrite, setCreatingFreeWrite] = useState(false);
  const journalEntries = entries.filter(isVisibleJournalEntry);
  const filtered = journalEntries.filter((entry) => {
    const text = `${entry.note} ${entry.mood} ${entry.specificFeeling} ${(entry.tags || []).join(' ')} ${(entry.factors || []).join(' ')}`.toLowerCase();
    const matchesKeyword = text.includes(query.toLowerCase());
    const matchesMood = !moodFilter || entry.mood === moodFilter;
    const matchesTag = !tagFilter || (entry.tags || []).some((tag) => tag.toLowerCase().includes(tagFilter.toLowerCase()));
    const matchesDate = !dateFilter || entry.dateKey === dateFilter;
    return matchesKeyword && matchesMood && matchesTag && matchesDate;
  });
  if (editing) return <EditEntry entry={editing} onCancel={() => setEditing(null)} onSave={(entry) => { onSave(entry); setEditing(null); }} />;
  if (creatingFreeWrite) return <FreeWriteEntry nav={nav} onCancel={() => setCreatingFreeWrite(false)} onSave={(entry) => { onSave(entry, 'entries'); setCreatingFreeWrite(false); }} />;
  return (
    <section className="screen app-screen">
      <h1>Journal Entries</h1>
      {nav}
      <div className="entry-actions">
        <button className="primary" onClick={() => setCreatingFreeWrite(true)} type="button">Create Free Write</button>
        <button onClick={onCreate} type="button">Create Check-In</button>
        <button onClick={() => setEditing(null)} type="button">View Previous Entries</button>
      </div>
      <div className="toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Keyword search" />
        <select value={moodFilter} onChange={(event) => setMoodFilter(event.target.value)}>
          <option value="">All moods</option>
          {moods.map((mood) => <option key={mood.key}>{mood.key}</option>)}
        </select>
        <input value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} placeholder="Tag search" />
        <input value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} type="date" />
      </div>
      <div className="entry-list">
        {filtered.length === 0 && <p>No matching entries yet.</p>}
        {filtered.map((entry) => <EntryCard entry={entry} key={entry.id} onEdit={() => setEditing(entry)} onDelete={() => onDelete(entry.id)} onPrimary={() => onPrimary(entry.id)} />)}
      </div>
    </section>
  );
}

function FreeWriteEntry({ nav, onSave, onCancel }) {
  const [draft, setDraft] = useState(createFreeWriteEntry());
  const setField = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  return (
    <section className="screen app-screen">
      <h1>Free Write</h1>
      {nav}
      <form className="flow" onSubmit={(event) => {
        event.preventDefault();
        onSave({ ...draft, tags: Array.from(new Set([...(draft.tags || []), 'free-write'])) });
      }}>
        <div className="panel two-col">
          <label>Entry title or feeling
            <input value={draft.specificFeeling} onChange={(event) => setField('specificFeeling', event.target.value)} placeholder="What would you call this entry?" />
          </label>
          <label>Mood label
            <select value={draft.mood} onChange={(event) => setField('mood', event.target.value)}>
              {moods.map((mood) => <option key={mood.key}>{mood.key}</option>)}
            </select>
          </label>
        </div>
        <div className="panel">
          <label>Journal
            <textarea value={draft.note} onChange={(event) => setField('note', event.target.value)} placeholder="Write freely. This will stay separate from your check-in summaries." />
          </label>
        </div>
        <div className="panel two-col">
          <label>Tags
            <input value={(draft.tags || []).join(', ')} onChange={(event) => setField('tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))} placeholder="memory, school, idea" />
          </label>
          <label>Optional next step
            <input value={draft.copingStep || ''} onChange={(event) => setField('copingStep', event.target.value)} placeholder="One thing you may want to do next" />
          </label>
        </div>
        <div className="actions">
          <button className="primary" type="submit">Save Free Write</button>
          <button onClick={onCancel} type="button">Cancel</button>
        </div>
      </form>
    </section>
  );
}

function EditEntry({ entry, onSave, onCancel }) {
  const [draft, setDraft] = useState(entry);
  const setField = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  return (
    <section className="screen app-screen">
      <h1>Edit Entry</h1>
      <div className="panel">
        <label>Mood
          <select value={draft.mood} onChange={(event) => setField('mood', event.target.value)}>
            {moods.map((mood) => <option key={mood.key}>{mood.key}</option>)}
          </select>
        </label>
        <label>Journal
          <textarea value={draft.note} onChange={(event) => setField('note', event.target.value)} />
        </label>
        <label>Next step
          <input value={draft.copingStep || ''} onChange={(event) => setField('copingStep', event.target.value)} />
        </label>
        <label className="inline-check">
          <input checked={Boolean(draft.primary)} onChange={(event) => setField('primary', event.target.checked)} type="checkbox" />
          Make this the main entry for this day
        </label>
      </div>
      <div className="actions">
        <button className="primary" onClick={() => onSave(draft)} type="button">Save edits</button>
        <button onClick={onCancel} type="button">Cancel</button>
      </div>
    </section>
  );
}

function EntryCard({ entry, onEdit, onDelete, onPrimary }) {
  const mood = moods.find((item) => item.key === entry.mood);
  const entryLabel = isCheckIn(entry) ? 'Check-In' : 'Free Write';
  return (
    <article className="entry-card">
      <div>
        <strong>{mood?.emoji} {entry.mood} <span className="primary-marker">{entryLabel}</span>{entry.primary ? <span className="primary-marker">Main</span> : null}</strong>
        <span>{new Date(entry.created).toLocaleString()}</span>
      </div>
      <p>{entry.note}</p>
      <div className="meta">
        {entry.specificFeeling && <span>{entry.specificFeeling}</span>}
        <span>{entry.intensity}/10</span>
        {(entry.factors || []).map((factor) => <span key={factor}>{factor}</span>)}
        {(entry.tags || []).map((tag) => <span key={tag}>#{tag}</span>)}
      </div>
      {entry.copingStep && <p className="next-step">Next step: {entry.copingStep}</p>}
      {(onEdit || onDelete) && <div className="actions">
        {onEdit && <button onClick={onEdit} type="button">Edit</button>}
        {onDelete && <button onClick={onDelete} type="button">Delete</button>}
        {onPrimary && isCheckIn(entry) && !entry.primary && <button onClick={onPrimary} type="button">Set as main</button>}
      </div>}
    </article>
  );
}

function Calendar({ nav, entries, onPrimary }) {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const grouped = useMemo(() => groupEntriesByDate(entries), [entries]);
  const days = useMemo(() => buildCalendarDays(year, month), [year, month]);
  const selectedEntries = grouped[selectedDate] || [];
  const moveMonth = (change) => setMonthDate(new Date(year, month + change, 1));

  return (
    <section className="screen app-screen">
      <h1>Calendar</h1>
      {nav}
      <div className="calendar-toolbar">
        <button onClick={() => moveMonth(-1)} type="button">Prev</button>
        <h2>{monthDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <button onClick={() => moveMonth(1)} type="button">Next</button>
      </div>
      <div className="month-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <strong className="weekday" key={day}>{day}</strong>)}
        {days.map((day) => {
          const key = day ? formatDateKey(new Date(year, month, day)) : '';
          const dayEntries = key ? grouped[key] || [] : [];
          const mainEntry = getPrimaryEntry(dayEntries);
          const firstMood = mainEntry ? moods.find((mood) => mood.key === mainEntry.mood) : null;
          return (
            <button className={key === selectedDate ? 'calendar-cell selected' : 'calendar-cell'} disabled={!day} key={`${key}-${day || Math.random()}`} onClick={() => setSelectedDate(key)} type="button">
              {day && <span>{day}</span>}
              {firstMood && <b>{firstMood.emoji}</b>}
              {dayEntries.length > 1 && <em>{dayEntries.length}</em>}
            </button>
          );
        })}
      </div>
      <div className="calendar-detail">
        <h2>{selectedDate}</h2>
        {selectedEntries.length === 0 ? <p>No entry for this day yet.</p> : selectedEntries.map((entry) => <EntryCard entry={entry} key={entry.id} onPrimary={() => onPrimary(entry.id)} />)}
      </div>
    </section>
  );
}

function Summary({ nav, entries }) {
  const checkInEntries = entries.filter(isCheckIn);
  const last7 = checkInEntries.filter((entry) => Date.now() - new Date(entry.created).getTime() < 7 * 24 * 60 * 60 * 1000);
  const moodCounts = countBy(last7, 'mood');
  const factorCounts = countMany(last7, 'factors');
  const avgIntensity = last7.length ? (last7.reduce((sum, entry) => sum + Number(entry.intensity || 0), 0) / last7.length).toFixed(1) : '-';
  const chartEntries = checkInEntries.slice().sort((a, b) => new Date(a.created) - new Date(b.created)).slice(-14);
  const patterns = getPatternNotes(checkInEntries);
  return (
    <section className="screen app-screen">
      <h1>Weekly Summary</h1>
      {nav}
      <div className="stats-grid">
        <Stat label="Check-ins this week" value={last7.length} />
        <Stat label="Average intensity" value={avgIntensity === '-' ? avgIntensity : `${avgIntensity}/10`} />
        <Stat label="Most common mood" value={topLabel(moodCounts)} />
        <Stat label="Top factor" value={topLabel(factorCounts)} />
      </div>
      <div className="panel">
        <h2>Intensity over time</h2>
        <IntensityChart entries={chartEntries} />
      </div>
      <div className="panel">
        <h2>Patterns noticed</h2>
        {patterns.length === 0 ? <p>Add a few more entries to see patterns.</p> : patterns.map((pattern) => <p key={pattern}>{pattern}</p>)}
      </div>
      <div className="panel">
        <h2>Mood trends</h2>
        {Object.entries(moodCounts).map(([mood, count]) => <Bar key={mood} label={mood} value={count} max={Math.max(...Object.values(moodCounts), 1)} />)}
      </div>
      <div className="panel">
        <h2>Common factors</h2>
        {Object.entries(factorCounts).map(([factor, count]) => <Bar key={factor} label={factor} value={count} max={Math.max(...Object.values(factorCounts), 1)} />)}
      </div>
    </section>
  );
}

function Activities({ nav, entries }) {
  const recentMood = entries.find(isCheckIn)?.mood;
  const list = activities[recentMood] || activities.default;
  return (
    <section className="screen app-screen">
      <h1>Activities</h1>
      {nav}
      {recentMood && <p className="recommendation-note">Based on your latest check-in, here are a few ideas for feeling {recentMood.toLowerCase()}.</p>}
      <div className="activity-grid">
        {list.map((activity) => <ActivityCard activity={activity} key={activity.title} />)}
      </div>
    </section>
  );
}

function ActivityCard({ activity }) {
  const [done, setDone] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(activity.minutes * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || secondsLeft <= 0) return undefined;
    const timer = setInterval(() => setSecondsLeft((current) => current - 1), 1000);
    return () => clearInterval(timer);
  }, [running, secondsLeft]);

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return (
    <article className={done ? 'activity-card done' : 'activity-card'}>
      <div>
        <label className="activity-check">
          <input checked={done} onChange={(event) => setDone(event.target.checked)} type="checkbox" />
          <h2>{activity.title}</h2>
        </label>
        <span>{activity.minutes} min</span>
      </div>
      <p>{activity.detail}</p>
      <div className="timer-row">
        <strong>{minutes}:{seconds}</strong>
        <button onClick={() => setRunning(!running)} type="button">{running ? 'Pause' : 'Start'}</button>
        <button onClick={() => { setRunning(false); setSecondsLeft(activity.minutes * 60); }} type="button">Reset</button>
      </div>
    </article>
  );
}

function Settings({ nav, user, profile, entries, saveEntries, fontScale, setFontScale, fontStyle, setFontStyle, siteTheme, setSiteTheme, pin, setPin, journalLockCode, setJournalLockCode, journalUnlocked, setJournalUnlocked, reminder, setReminder }) {
  const [pinDraft, setPinDraft] = useState(pin);
  const [journalCodeDraft, setJournalCodeDraft] = useState(journalLockCode);
  const reminderTimes = reminder.times?.length ? reminder.times : [reminder.time || '19:00'];
  const updateReminderTime = (index, value) => {
    const nextTimes = reminderTimes.map((time, timeIndex) => timeIndex === index ? value : time);
    setReminder({ ...reminder, time: nextTimes[0], times: nextTimes });
  };
  const addReminderTime = () => {
    const nextTimes = [...reminderTimes, '19:00'];
    setReminder({ ...reminder, time: nextTimes[0], times: nextTimes });
  };
  const removeReminderTime = (index) => {
    const nextTimes = reminderTimes.filter((_, timeIndex) => timeIndex !== index);
    const safeTimes = nextTimes.length ? nextTimes : ['19:00'];
    setReminder({ ...reminder, time: safeTimes[0], times: safeTimes });
  };
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ journalEntriesV2: entries }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mood-journal-${todayKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const importData = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data.journalEntriesV2)) saveEntries(data.journalEntriesV2);
      } catch {
        alert('Could not import that file.');
      }
    };
    reader.readAsText(file);
  };
  return (
    <section className="screen app-screen">
      <h1>Profile & Settings</h1>
      {nav}
      <div className="panel profile-card">
        <div>
          <h2>{profile?.username || 'Your profile'}</h2>
          <p>{user?.email || 'Local browser profile'}</p>
        </div>
        {profile?.role === 'admin' && <span className="admin-badge">Admin</span>}
      </div>
      <div className="panel settings-grid font-settings">
        <label>Font size
          <input max="1.3" min="0.9" onChange={(event) => setFontScale(Number(event.target.value))} step="0.05" type="range" value={fontScale} />
        </label>
        <label>Font style
          <select onChange={(event) => setFontStyle(event.target.value)} value={fontStyle}>
            <option value="friendly">Friendly</option>
            <option value="classic">Classic</option>
            <option value="clean">Clean</option>
          </select>
        </label>
        <label>Theme
          <select onChange={(event) => setSiteTheme(event.target.value)} value={siteTheme}>
            <option value="warm">Cozy Cafe</option>
            <option value="sunrise">Sunrise & Sunset</option>
            <option value="night">Night sky</option>
            <option value="garden">Garden</option>
            <option value="ocean">Seafoam</option>
          </select>
        </label>
      </div>
      <div className="panel settings-grid">
        <label>Privacy PIN
          <input inputMode="numeric" onChange={(event) => setPinDraft(event.target.value)} placeholder="4 digits" type="password" value={pinDraft} />
        </label>
        <div className="settings-list">
          <button onClick={() => setPin(pinDraft)} type="button">{pin ? 'Update PIN' : 'Set PIN'}</button>
          {pin && <button onClick={() => { setPinDraft(''); setPin(''); }} type="button">Remove PIN</button>}
        </div>
      </div>
      <div className="panel settings-grid">
        <label>Journal lock passphrase or PIN
          <input onChange={(event) => setJournalCodeDraft(event.target.value)} placeholder="Hide entries until this is entered" type="password" value={journalCodeDraft} />
        </label>
        <div className="settings-list">
          <button onClick={() => setJournalLockCode(journalCodeDraft)} type="button">{journalLockCode ? 'Update journal lock' : 'Enable journal lock'}</button>
          {journalLockCode && <button onClick={() => { setJournalCodeDraft(''); setJournalLockCode(''); }} type="button">Remove journal lock</button>}
          {journalLockCode && <button onClick={() => setJournalUnlocked(!journalUnlocked)} type="button">{journalUnlocked ? 'Hide entries now' : 'Keep entries revealed'}</button>}
        </div>
        <p className="privacy-note">This beginner-friendly lock hides journal content in the app UI. Supabase RLS protects each user's database rows; this is not full end-to-end encryption.</p>
      </div>
      <div className="panel reminder-settings">
        <h2>Daily Reminders</h2>
        <div className="reminder-time-list">
          {reminderTimes.map((time, index) => (
            <label key={`${time}-${index}`}>Reminder {index + 1}
              <span className="reminder-time-row">
                <input onChange={(event) => updateReminderTime(index, event.target.value)} type="time" value={time} />
                {reminderTimes.length > 1 && <button onClick={() => removeReminderTime(index)} type="button">Remove</button>}
              </span>
            </label>
          ))}
        </div>
        <div className="settings-list">
          <button onClick={addReminderTime} type="button">Add reminder</button>
          <button onClick={async () => {
            if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
            setReminder({ ...reminder, enabled: !reminder.enabled });
          }} type="button">{reminder.enabled ? 'Turn reminders off' : 'Turn reminders on'}</button>
        </div>
      </div>
      <div className="panel settings-list">
        <button onClick={exportData} type="button">Export data</button>
        <label className="file-button">Import data<input accept="application/json" onChange={importData} type="file" /></label>
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}

function Bar({ label, value, max }) {
  return <div className="bar"><span>{label}</span><div><i style={{ width: `${(value / max) * 100}%` }} /></div><strong>{value}</strong></div>;
}

function IntensityChart({ entries }) {
  if (entries.length === 0) return <p>No intensity data yet.</p>;
  const points = entries.map((entry, index) => {
    const x = entries.length === 1 ? 50 : (index / (entries.length - 1)) * 100;
    const y = 100 - (Number(entry.intensity || 0) / 10) * 100;
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="chart-wrap">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Mood intensity over time">
        <polyline points={points} />
      </svg>
      <div className="chart-labels">
        {entries.map((entry) => <span key={entry.id}>{entry.intensity}</span>)}
      </div>
    </div>
  );
}

const countBy = (items, key) => items.reduce((acc, item) => {
  if (item[key]) acc[item[key]] = (acc[item[key]] || 0) + 1;
  return acc;
}, {});
const countMany = (items, key) => items.reduce((acc, item) => {
  (item[key] || []).forEach((value) => { acc[value] = (acc[value] || 0) + 1; });
  return acc;
}, {});
const topLabel = (counts) => Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
const formatDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const isCheckIn = (entry) => (entry.type || 'checkin') === 'checkin';
const isVisibleJournalEntry = (entry) => isCheckIn(entry) || entry.type === 'journal' || (entry.tags || []).includes('free-write');
const getMoodColor = (moodKey) => moods.find((mood) => mood.key === moodKey)?.color || '#fff7c7';
const blackbodyStops = ['#ff5f3a', '#ff8f45', '#ffd166', '#fff4c1', '#f4fbff', '#b8d8ff'];
const hexToRgb = (hex) => {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
};
const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
const blendHex = (firstHex, secondHex, weight = 0.5) => {
  const first = hexToRgb(firstHex);
  const second = hexToRgb(secondHex);
  return rgbToHex({
    r: first.r * (1 - weight) + second.r * weight,
    g: first.g * (1 - weight) + second.g * weight,
    b: first.b * (1 - weight) + second.b * weight
  });
};
const getStarColor = (mood, intensity) => {
  const normalized = Math.max(0, Math.min(1, (Number(intensity || 5) - 1) / 9));
  const index = Math.min(blackbodyStops.length - 1, Math.floor(normalized * blackbodyStops.length));
  return blendHex(blackbodyStops[index], mood?.color || '#fff7c7', 0.28);
};
const isMissingEntryTypeError = (error) => /entry[_-]?type|schema cache/i.test(error?.message || '');
const groupEntriesByDate = (entries) => entries.reduce((acc, entry) => {
  acc[entry.dateKey] = acc[entry.dateKey] || [];
  acc[entry.dateKey].push(entry);
  return acc;
}, {});
const getPrimaryEntry = (entries) => entries.find((entry) => isCheckIn(entry) && entry.primary) || entries.find(isCheckIn) || entries[0] || null;
const calculateStreak = (entries) => {
  const dates = new Set(entries.map((entry) => entry.dateKey));
  let streak = 0;
  const cursor = new Date();
  while (dates.has(formatDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};
const normalizeReminder = (value) => {
  const times = Array.isArray(value?.times) && value.times.length > 0 ? value.times : [value?.time || '19:00'];
  return { enabled: Boolean(value?.enabled), time: times[0], times };
};
const entryToRow = (entry, userId) => ({
  id: String(entry.id || crypto.randomUUID()),
  user_id: userId,
  entry_type: entry.type || 'checkin',
  created: entry.created,
  date_key: entry.dateKey,
  mood: entry.mood,
  specific_feeling: entry.specificFeeling || '',
  intensity: Number(entry.intensity || 5),
  factors: entry.factors || [],
  tags: entry.tags || [],
  note: entry.note || '',
  coping_step: entry.copingStep || '',
  meals: entry.meals || '',
  water: entry.water || '',
  sleep: entry.sleep || '',
  primary: Boolean(entry.primary),
  mood_score: entry.moodScore || null,
  updated_at: entry.updated || new Date().toISOString()
});
const rowToEntry = (row) => ({
  id: row.id,
  type: row.entry_type || inferEntryType(row),
  created: row.created,
  dateKey: row.date_key,
  mood: row.mood,
  specificFeeling: row.specific_feeling || '',
  intensity: row.intensity || 5,
  factors: row.factors || [],
  tags: row.tags || [],
  note: row.note || '',
  copingStep: row.coping_step || '',
  meals: row.meals || '',
  water: row.water || '',
  sleep: row.sleep || '',
  primary: Boolean(row.primary),
  moodScore: row.mood_score || null,
  updated: row.updated_at
});
const inferEntryType = (row) => {
  const tags = row.tags || [];
  if (tags.includes('game')) return 'game';
  if (tags.includes('free-write')) return 'journal';
  return 'checkin';
};
const getPatternNotes = (entries) => {
  const notes = [];
  const moodFactorCounts = {};
  entries.forEach((entry) => {
    (entry.factors || []).forEach((factor) => {
      const key = `${entry.mood}|${factor}`;
      moodFactorCounts[key] = (moodFactorCounts[key] || 0) + 1;
    });
  });
  const top = Object.entries(moodFactorCounts).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 2) {
    const [mood, factor] = top[0].split('|');
    notes.push(`${mood} appears most often when ${factor.toLowerCase()} is involved.`);
  }
  const tiredLowSleep = entries.filter((entry) => entry.mood === 'Tired' && String(entry.sleep || '').includes('0-4')).length;
  if (tiredLowSleep >= 1) notes.push('Tired appears alongside low sleep. A rest-focused activity may help.');
  const highIntensity = entries.filter((entry) => Number(entry.intensity) >= 8).length;
  if (highIntensity >= 2) notes.push('You have had several high-intensity days. Consider using grounding or support prompts.');
  return notes;
};
const buildCalendarDays = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
};

export default App;
