import { useEffect, useMemo, useState } from 'react';

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
  { image: emotionWheelUrl, title: 'Emotion Exploration', text: 'Use a wider feeling vocabulary to identify what is happening inside you.' },
  { image: journalUrl, title: 'Journals and Notes', text: 'Write what happened, what you felt, and what you need without judgment.' },
  { image: yogaUrl, title: 'Mindfulness Activity', text: 'Try small body-based activities that can help steady or lift your mood.' }
];

const resourceLinks = [
  { href: 'https://youtu.be/j7rKKpwdXNE?si=hZhSu72GBqKiXU2b', title: 'Stretch and Relief', tag: 'Stress Relief', className: 'calm', text: '10-minute YouTube yoga stretches to help relieve stress and loosen tension.' },
  { href: 'https://www.youtube.com/live/dnBAU8Co6PA?si=J-u4VaLRCmOt_Npu', title: 'Music Playlist', tag: 'Calm / Focus', className: 'focus', text: 'Soothing instrumental tracks to calm your mind.' },
  { href: 'https://positivepsychology.com/emotion-regulation/', title: 'Emotional Regulation', tag: 'Learn', className: 'learn', text: 'Clear tips to stay balanced, spot triggers, and respond to challenges in healthier ways.' }
];

const appViews = ['checkin', 'activities', 'entries', 'calendar', 'summary', 'about', 'newsletter'];
const navLabels = {
  checkin: 'Check-In',
  activities: 'Activities',
  entries: 'Entries',
  calendar: 'Calendar',
  summary: 'Summary',
  about: 'About',
  newsletter: 'Newsletter'
};
const todayKey = () => new Date().toISOString().slice(0, 10);
const createEntry = () => ({
  id: crypto.randomUUID(),
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
const readStorage = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

function App() {
  const [view, setView] = useState('home');
  const [entries, setEntries] = useState(() => readStorage('journalEntriesV2', []));
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem('reduceMotion') === 'true');
  const [fontScale, setFontScale] = useState(() => Number(localStorage.getItem('fontScale') || 1));
  const [fontStyle, setFontStyle] = useState(() => localStorage.getItem('fontStyle') || 'friendly');
  const [pin, setPin] = useState(() => localStorage.getItem('journalPin') || '');
  const [locked, setLocked] = useState(() => Boolean(localStorage.getItem('journalPin')));
  const [reminder, setReminder] = useState(() => readStorage('journalReminder', { enabled: false, time: '19:00' }));

  const saveEntries = (nextEntries) => {
    setEntries(nextEntries);
    localStorage.setItem('journalEntriesV2', JSON.stringify(nextEntries));
  };
  const saveEntry = (entry) => {
    const mood = moods.find((item) => item.key === entry.mood);
    const sameDayEntries = entries.filter((item) => item.dateKey === entry.dateKey && item.id !== entry.id);
    const normalized = {
      ...entry,
      primary: entry.primary || sameDayEntries.length === 0,
      moodScore: mood?.score || null,
      updated: new Date().toISOString()
    };
    const exists = entries.some((item) => item.id === normalized.id);
    const nextEntries = exists ? entries.map((item) => item.id === normalized.id ? normalized : item) : [normalized, ...entries];
    saveEntries(normalized.primary ? nextEntries.map((item) => item.dateKey === normalized.dateKey ? { ...item, primary: item.id === normalized.id } : item) : nextEntries);
    setView('activities');
  };
  const deleteEntry = (id) => saveEntries(entries.filter((entry) => entry.id !== id));
  const setPrimaryEntry = (id) => {
    const target = entries.find((entry) => entry.id === id);
    if (!target) return;
    saveEntries(entries.map((entry) => entry.dateKey === target.dateKey ? { ...entry, primary: entry.id === id } : entry));
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
  const updateReminder = (nextReminder) => {
    setReminder(nextReminder);
    localStorage.setItem('journalReminder', JSON.stringify(nextReminder));
  };

  useEffect(() => {
    if (!reminder.enabled || !('Notification' in window) || Notification.permission !== 'granted') return undefined;
    const now = new Date();
    const [hours, minutes] = reminder.time.split(':').map(Number);
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const timeout = setTimeout(() => {
      new Notification('Mood Journal', { body: 'Take a minute to check in with yourself.' });
    }, next.getTime() - now.getTime());
    return () => clearTimeout(timeout);
  }, [reminder]);

  return (
    <div className={`app ${theme === 'dark' ? 'dark' : ''} ${reduceMotion ? 'reduced-motion' : ''} font-${fontStyle}`} style={{ '--font-scale': fontScale }}>
      <header className="topbar">
        <button className="brand" onClick={() => setView('home')} type="button">
          <img src={logoUrl} alt="" />
          <span>Mood Journal</span>
        </button>
        <div className="header-actions">
          <button className={view === 'home' ? 'header-link active' : 'header-link'} onClick={() => setView('home')} type="button">Home</button>
          <button className={view === 'settings' ? 'header-link active' : 'header-link'} onClick={() => openApp('settings')} type="button">Settings</button>
          <button className={theme === 'dark' ? 'toggle active' : 'toggle'} aria-label="Toggle dark mode" onClick={updateTheme} type="button"><span /></button>
          <button className={reduceMotion ? 'toggle motion active' : 'toggle motion'} aria-label="Toggle reduced motion" onClick={updateMotion} type="button"><span /></button>
        </div>
      </header>
      <main>
        <AppNav activeView={view} views={appViews} onOpen={openApp} />
        {locked ? <LockScreen pin={pin} onUnlock={() => setLocked(false)} /> : <>
        {view === 'home' && <Home entries={entries} onOpen={openApp} />}
        {view === 'checkin' && <CheckIn onSave={saveEntry} />}
        {view === 'activities' && <Activities entries={entries} />}
        {view === 'entries' && <Entries entries={entries} onSave={saveEntry} onDelete={deleteEntry} onPrimary={setPrimaryEntry} />}
        {view === 'calendar' && <Calendar entries={entries} onPrimary={setPrimaryEntry} />}
        {view === 'summary' && <Summary entries={entries} />}
        {view === 'about' && <About />}
        {view === 'newsletter' && <Newsletter />}
        {view === 'settings' && <Settings entries={entries} saveEntries={saveEntries} fontScale={fontScale} setFontScale={updateFontScale} fontStyle={fontStyle} setFontStyle={updateFontStyle} pin={pin} setPin={updatePin} reminder={reminder} setReminder={updateReminder} />}
        </>}
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

function Home({ entries, onOpen }) {
  const todayEntries = entries.filter((entry) => entry.dateKey === todayKey());
  const mainToday = getPrimaryEntry(todayEntries);
  const mood = mainToday ? moods.find((item) => item.key === mainToday.mood) : null;
  const streak = calculateStreak(entries);
  return (
    <div className="home-page">
      <section className="home-hero" id="home">
        <img className="home-logo" src={logoUrl} alt="Mood Journal logo" />
        <div>
          <h1>Daily Mood Check-In</h1>
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
      <MiniGames />
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

function MiniGames() {
  const matchingCards = useMemo(() => {
    const pairs = ['Calm', 'Happy', 'Tired', 'Grateful'];
    return pairs.flatMap((mood) => [1, 2].map((copy) => ({ id: `${mood}-${copy}`, mood })))
      .sort(() => Math.random() - 0.5);
  }, []);
  const huntItems = ['Find something soft', 'Notice one calming color', 'Name a sound nearby', 'Find something that makes you smile'];
  const [selectedCards, setSelectedCards] = useState([]);
  const [matchedMoods, setMatchedMoods] = useState([]);
  const [huntDone, setHuntDone] = useState([]);
  const [bubbleRunning, setBubbleRunning] = useState(false);

  const chooseCard = (card) => {
    if (selectedCards.includes(card.id) || matchedMoods.includes(card.mood) || selectedCards.length === 2) return;
    const nextSelection = [...selectedCards, card.id];
    setSelectedCards(nextSelection);
    if (nextSelection.length === 2) {
      const firstCard = matchingCards.find((item) => item.id === nextSelection[0]);
      if (firstCard?.mood === card.mood) {
        setMatchedMoods((current) => [...current, card.mood]);
        setSelectedCards([]);
      } else {
        setTimeout(() => setSelectedCards([]), 700);
      }
    }
  };

  const toggleHuntItem = (item) => {
    setHuntDone((current) => (
      current.includes(item) ? current.filter((doneItem) => doneItem !== item) : [...current, item]
    ));
  };

  return (
    <section className="minigames-section" id="minigames">
      <h2>Mini Games</h2>
      <div className="minigame-grid">
        <article className="minigame-card">
          <h3>Matching Mood Cards</h3>
          <p>Flip two cards and match the feeling words.</p>
          <div className="match-grid">
            {matchingCards.map((card) => {
              const visible = selectedCards.includes(card.id) || matchedMoods.includes(card.mood);
              return (
                <button className={visible ? 'match-card visible' : 'match-card'} key={card.id} onClick={() => chooseCard(card)} type="button">
                  {visible ? card.mood : '?'}
                </button>
              );
            })}
          </div>
        </article>
        <article className="minigame-card">
          <h3>Scavenger Hunt</h3>
          <p>Use your space to ground yourself for a minute.</p>
          <div className="hunt-list">
            {huntItems.map((item) => (
              <label key={item}>
                <input checked={huntDone.includes(item)} onChange={() => toggleHuntItem(item)} type="checkbox" />
                {item}
              </label>
            ))}
          </div>
        </article>
        <article className="minigame-card breathing-game">
          <h3>Breathing Bubble</h3>
          <p>Follow the bubble as it grows and settles.</p>
          <div className={bubbleRunning ? 'breathing-bubble active' : 'breathing-bubble'} />
          <button onClick={() => setBubbleRunning(!bubbleRunning)} type="button">{bubbleRunning ? 'Pause' : 'Start'}</button>
        </article>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="screen app-screen">
      <h1>About the App</h1>
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

function Newsletter() {
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

function CheckIn({ onSave }) {
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

function Entries({ entries, onSave, onDelete, onPrimary }) {
  const [query, setQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const filtered = entries.filter((entry) => {
    const text = `${entry.note} ${entry.mood} ${entry.specificFeeling} ${(entry.tags || []).join(' ')} ${(entry.factors || []).join(' ')}`.toLowerCase();
    const matchesKeyword = text.includes(query.toLowerCase());
    const matchesMood = !moodFilter || entry.mood === moodFilter;
    const matchesTag = !tagFilter || (entry.tags || []).some((tag) => tag.toLowerCase().includes(tagFilter.toLowerCase()));
    const matchesDate = !dateFilter || entry.dateKey === dateFilter;
    return matchesKeyword && matchesMood && matchesTag && matchesDate;
  });
  if (editing) return <EditEntry entry={editing} onCancel={() => setEditing(null)} onSave={(entry) => { onSave(entry); setEditing(null); }} />;
  return (
    <section className="screen app-screen">
      <h1>Journal Entries</h1>
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
  return (
    <article className="entry-card">
      <div>
        <strong>{mood?.emoji} {entry.mood} {entry.primary ? <span className="primary-marker">Main</span> : null}</strong>
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
        {onPrimary && !entry.primary && <button onClick={onPrimary} type="button">Set as main</button>}
      </div>}
    </article>
  );
}

function Calendar({ entries, onPrimary }) {
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

function Summary({ entries }) {
  const last7 = entries.filter((entry) => Date.now() - new Date(entry.created).getTime() < 7 * 24 * 60 * 60 * 1000);
  const moodCounts = countBy(last7, 'mood');
  const factorCounts = countMany(last7, 'factors');
  const avgIntensity = last7.length ? (last7.reduce((sum, entry) => sum + Number(entry.intensity || 0), 0) / last7.length).toFixed(1) : '-';
  const chartEntries = entries.slice().sort((a, b) => new Date(a.created) - new Date(b.created)).slice(-14);
  const patterns = getPatternNotes(entries);
  return (
    <section className="screen app-screen">
      <h1>Weekly Summary</h1>
      <div className="stats-grid">
        <Stat label="Entries this week" value={last7.length} />
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

function Activities({ entries }) {
  const recentMood = entries[0]?.mood;
  const list = activities[recentMood] || activities.default;
  return (
    <section className="screen app-screen">
      <h1>Activities</h1>
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

function Settings({ entries, saveEntries, fontScale, setFontScale, fontStyle, setFontStyle, pin, setPin, reminder, setReminder }) {
  const [pinDraft, setPinDraft] = useState(pin);
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
      <h1>Settings</h1>
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
      </div>
      <div className="panel settings-list">
        <button onClick={exportData} type="button">Export data</button>
        <label className="file-button">Import data<input accept="application/json" onChange={importData} type="file" /></label>
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
        <label>Reminder time
          <input onChange={(event) => setReminder({ ...reminder, time: event.target.value })} type="time" value={reminder.time} />
        </label>
        <div className="settings-list">
          <button onClick={async () => {
            if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
            setReminder({ ...reminder, enabled: !reminder.enabled });
          }} type="button">{reminder.enabled ? 'Turn reminders off' : 'Turn reminders on'}</button>
        </div>
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
const groupEntriesByDate = (entries) => entries.reduce((acc, entry) => {
  acc[entry.dateKey] = acc[entry.dateKey] || [];
  acc[entry.dateKey].push(entry);
  return acc;
}, {});
const getPrimaryEntry = (entries) => entries.find((entry) => entry.primary) || entries[0] || null;
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
