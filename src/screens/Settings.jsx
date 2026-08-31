import { useState } from 'react';
import { todayKey } from '../utils/journalUtils';

export function Settings({ nav, user, profile, entries, saveEntries, fontScale, setFontScale, fontStyle, setFontStyle, siteTheme, setSiteTheme, pin, setPin, journalLockCode, setJournalLockCode, journalUnlocked, setJournalUnlocked, reminder, setReminder }) {
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
