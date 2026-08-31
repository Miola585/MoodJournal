import { logoUrl, moods } from '../data/journalData';
import { calculateStreak, getPrimaryEntry, isCheckIn, todayKey } from '../utils/journalUtils';

export function Home({ nav, entries, onOpen }) {
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
