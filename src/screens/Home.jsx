import { useState } from 'react';
import { createEntry, logoUrl, moods } from '../data/journalData';
import { calculateStreak, getPrimaryEntry, isCheckIn, todayKey } from '../utils/journalUtils';

const homeMoodKeys = ['Happy', 'Calm', 'Content', 'Sad', 'Overwhelmed'];

export function Home({ entries, onOpen, onSave }) {
  const [quickMood, setQuickMood] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const todayEntries = entries.filter((entry) => entry.dateKey === todayKey());
  const todayCheckIns = todayEntries.filter(isCheckIn);
  const mainToday = getPrimaryEntry(todayCheckIns);
  const mood = mainToday ? moods.find((item) => item.key === mainToday.mood) : null;
  const streak = calculateStreak(entries.filter(isCheckIn));
  const quickMoods = homeMoodKeys.map((key) => moods.find((item) => item.key === key)).filter(Boolean);
  const lastCheckIn = entries.find(isCheckIn);
  const lastMood = lastCheckIn ? moods.find((item) => item.key === lastCheckIn.mood) : null;
  const todayNotePreview = mainToday?.note?.trim();
  const canSave = Boolean(quickMood && quickNote.trim());
  const saveQuickCheckIn = async (event) => {
    event.preventDefault();
    if (!canSave) return;
    await onSave({
      ...createEntry(),
      mood: quickMood,
      note: quickNote.trim(),
      primary: true
    }, 'home');
    setQuickMood('');
    setQuickNote('');
  };

  return (
    <div className="home-page">
      <section className="home-hero" id="home">
        <div className="home-brand-lockup">
          <img className="home-logo" src={logoUrl} alt="Mood Journal logo" />
          <h1>Daily Mood Check-In</h1>
        </div>
        <p>Take a quiet minute. Name what is here, write one honest note, and come back whenever you need space.</p>
      </section>
      <section className="home-checkin-layout" aria-label="Check in today">
        <form className="home-checkin-card" onSubmit={saveQuickCheckIn}>
          <div className="home-card-heading">
            <span>Check in today</span>
            <h2>How are you feeling today?</h2>
          </div>
          <div className="home-mood-row" aria-label="Choose a mood">
            {quickMoods.map((item) => (
              <button
                className={quickMood === item.key ? 'home-mood-chip selected' : 'home-mood-chip'}
                aria-pressed={quickMood === item.key}
                key={item.key}
                onClick={() => setQuickMood(item.key)}
                style={{ '--mood': item.color }}
                type="button"
              >
                <span>{item.emoji}</span>
                {item.key}
              </button>
            ))}
          </div>
          <label className="home-note-label">Write a quick note
            <textarea
              onChange={(event) => setQuickNote(event.target.value)}
              placeholder="A few words about what is happening right now..."
              value={quickNote}
            />
          </label>
          <div className="home-action-row">
            <button className="primary home-save-button" disabled={!canSave} type="submit">Save Check-In</button>
            <button className="home-details-button" onClick={() => onOpen('checkin')} type="button">Add details</button>
          </div>
        </form>
        <aside className={mainToday ? 'home-today-card checked-in' : 'home-today-card'}>
          <span>Today</span>
          <strong>{mainToday ? `${mood?.emoji || ''} ${mainToday.mood}` : 'No check-in yet'}</strong>
          {todayNotePreview ? <p className="home-note-preview">"{todayNotePreview}"</p> : <p>{mainToday ? 'You already made a little room for yourself today.' : 'Today can be day one.'}</p>}
          <button onClick={() => onOpen('checkin')} type="button">{mainToday ? 'Edit details' : 'Add details'}</button>
        </aside>
      </section>
      <section className="dashboard-grid home-stats-grid" aria-label="Journal snapshot">
        <article className="dashboard-card">
          <span>Current streak</span>
          <strong>{streak} day{streak === 1 ? '' : 's'}</strong>
          <p>{streak > 0 ? 'You have been showing up for yourself.' : 'No pressure. Start small.'}</p>
        </article>
        <article className="dashboard-card">
          <span>Entries today</span>
          <strong>{todayEntries.length}</strong>
          <p>{todayEntries.length > 0 ? 'Your day has a little record now.' : 'Nothing written yet.'}</p>
        </article>
        <article className="dashboard-card">
          <span>Last mood</span>
          <strong>{lastMood ? `${lastMood.emoji || ''} ${lastCheckIn.mood}` : 'None yet'}</strong>
          <p>{lastMood ? 'Your recent pattern starts here.' : 'Your journal is ready when you are.'}</p>
        </article>
      </section>
      <section className="calm-break-card" id="about">
        <div>
          <span>Calm break</span>
          <h2>Breathing Exercise</h2>
          <p>A short reset for stress or anxious moments when you want one.</p>
        </div>
        <div className="video-container">
          <iframe
            title="Breathing and mindfulness video"
            src="https://www.youtube.com/embed/eZBa63NZbbE?si=1-lljpa63qeL2DnA"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </section>
    </div>
  );
}
