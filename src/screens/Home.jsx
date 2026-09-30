import { useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, Flower2, Gamepad2, Heart, Play, Sparkles } from 'lucide-react';
import { moods } from '../data/journalData';
import { getPrimaryEntry, isCheckIn, todayKey } from '../utils/journalUtils';
import { MemoryJarSvg } from '../components/games/MemoryJarSvg';
import { getJournalRhythm, getRecentJournalEntries } from '../utils/dashboardUtils';

const gardenSproutUrl = new URL('../../img/1111x_PixelPlants/MoodGarden_Selected/00_Shared_Growth_Stages/growth-04-buds.png', import.meta.url).href;
const gardenFlowerUrl = new URL('../../img/1111x_PixelPlants/MoodGarden_Selected/03_High_Intensity/high-04-daisy-cluster.png', import.meta.url).href;

const formatEntryDate = (entry) => new Date(entry.created).toLocaleDateString(undefined, {
  month: 'short',
  day: 'numeric'
});

const greetingFor = (date) => {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export function Home({ entries, onOpen, onOpenGame, profile }) {
  const [showBreathing, setShowBreathing] = useState(false);
  const now = new Date();
  const todayEntries = entries.filter((entry) => entry.dateKey === todayKey());
  const mainToday = getPrimaryEntry(todayEntries.filter(isCheckIn));
  const todayMood = moods.find((item) => item.key === mainToday?.mood);
  const recentEntries = getRecentJournalEntries(entries, 3);
  const journalRhythm = getJournalRhythm(entries, now);
  const displayName = profile?.username ? `, ${profile.username}` : '';
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="home-page">
      <header className="home-dashboard-heading">
        <span className="page-header-eyebrow">{dateLabel}</span>
        <h1>{greetingFor(now)}{displayName}</h1>
        <p>A gentle place to notice what today feels like.</p>
      </header>

      <section className="home-today-panel ui-card ui-card-primary" style={{ '--today-mood': todayMood?.color || 'var(--interactive-accent)' }}>
        <div className="home-today-mark" aria-hidden="true">{todayMood?.emoji || <Heart size={24} />}</div>
        <div className="home-today-copy">
          <span className="home-today-kicker">Today</span>
          <h2>{mainToday ? `${mainToday.mood} is here today` : 'How are you feeling right now?'}</h2>
          <p>{mainToday?.note?.trim() || (mainToday ? 'Your check-in is saved. You can add another thought whenever you need to.' : 'One honest note is enough to begin.')}</p>
        </div>
        <button className="primary-button" onClick={() => onOpen('checkin')} type="button">
          {mainToday ? 'Add another mood moment' : 'Start today\'s check-in'}
          <ArrowRight aria-hidden="true" size={18} />
        </button>
      </section>

      <div className="home-dashboard-grid">
        <section className="home-dashboard-section home-space-section" aria-labelledby="your-space-title">
          <div className="home-section-heading">
            <div>
              <span className="page-header-eyebrow">Your space</span>
              <h2 id="your-space-title">Return to something you are growing</h2>
            </div>
            <button className="ghost-button" onClick={() => onOpen('games')} type="button">All games <ArrowRight aria-hidden="true" size={16} /></button>
          </div>
          <div className="home-space-grid">
            <button className="home-space-card ui-card ui-card-interactive" onClick={() => onOpenGame('garden')} type="button">
              <span className="home-space-card-copy">
                <span className="home-space-icon"><Flower2 aria-hidden="true" size={24} /></span>
                <span><strong>Mood Garden</strong><small>See how your check-ins shape a quiet place.</small></span>
              </span>
              <span className="home-space-preview home-garden-preview" aria-hidden="true">
                <span className="garden-preview-sun" />
                <img className="garden-preview-sprout" src={gardenSproutUrl} alt="" />
                <img className="garden-preview-flower" src={gardenFlowerUrl} alt="" />
              </span>
              <span className="home-space-open">Visit garden <ArrowRight aria-hidden="true" size={16} /></span>
            </button>
            <button className="home-space-card ui-card ui-card-interactive" onClick={() => onOpenGame('memory')} type="button">
              <span className="home-space-card-copy">
                <span className="home-space-icon"><Sparkles aria-hidden="true" size={24} /></span>
                <span><strong>Memory Jar</strong><small>Revisit the small moments you kept.</small></span>
              </span>
              <span className="home-space-preview memory-preview" aria-hidden="true">
                <span className="mini-memory-jar">
                  <MemoryJarSvg />
                  <i /><i /><i /><i /><i /><i />
                </span>
                <Sparkles className="memory-preview-sparkle" size={18} />
              </span>
              <span className="home-space-open">Open jar <ArrowRight aria-hidden="true" size={16} /></span>
            </button>
          </div>
        </section>

        <aside className="home-rhythm-card ui-card ui-card-secondary">
          <span className="home-rhythm-icon"><CalendarDays aria-hidden="true" size={22} /></span>
          <span className="page-header-eyebrow">Journal rhythm</span>
          <strong>{journalRhythm}</strong>
          <p>{journalRhythm === 1 ? 'day you checked in this week' : 'days you checked in this week'}</p>
          <div className="home-week-dots" aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => <span className={index < journalRhythm ? 'filled' : ''} key={index} />)}
          </div>
        </aside>
      </div>

      <div className="home-lower-grid">
        <section className="home-recent-section" aria-labelledby="recent-entries-title">
          <div className="home-section-heading">
            <div>
              <span className="page-header-eyebrow">Recent entries</span>
              <h2 id="recent-entries-title">A few pages from your journal</h2>
            </div>
            <button className="ghost-button" onClick={() => onOpen('entries')} type="button">Open journal <ArrowRight aria-hidden="true" size={16} /></button>
          </div>
          <div className="home-recent-list">
            {recentEntries.length === 0 && (
              <div className="home-empty-note ui-card ui-card-secondary">
                <BookOpen aria-hidden="true" size={22} />
                <p>Your recent pages will settle here after your first check-in or free write.</p>
              </div>
            )}
            {recentEntries.map((entry) => {
              const mood = moods.find((item) => item.key === entry.mood);
              return (
                <button className="home-recent-entry" key={entry.id} onClick={() => onOpen('entries')} style={{ '--entry-mood': mood?.color || 'var(--interactive-accent)' }} type="button">
                  <span className="home-recent-emoji" aria-hidden="true">{mood?.emoji || <BookOpen size={18} />}</span>
                  <span className="home-recent-copy">
                    <strong>{entry.specificFeeling || entry.mood || 'Journal page'}</strong>
                    <small>{entry.note?.trim() || 'No writing on this page.'}</small>
                  </span>
                  <time dateTime={entry.created}>{formatEntryDate(entry)}</time>
                </button>
              );
            })}
          </div>
        </section>

        <section className="home-small-section ui-card ui-card-secondary" aria-labelledby="something-small-title">
          <span className="page-header-eyebrow">Something small</span>
          <h2 id="something-small-title">Take a two-minute pause</h2>
          <p>Choose a grounding activity, or open the breathing guide when you want a quieter moment.</p>
          <div className="home-small-actions">
            <button className="secondary-button" onClick={() => onOpen('activities')} type="button"><Gamepad2 aria-hidden="true" size={17} />Quick activities</button>
            <button className="ghost-button" onClick={() => setShowBreathing((current) => !current)} aria-expanded={showBreathing} type="button"><Play aria-hidden="true" size={17} />{showBreathing ? 'Close breathing guide' : 'Breathing guide'}</button>
          </div>
          {showBreathing && (
            <div className="home-breathing-disclosure">
              <iframe
                title="Breathing and mindfulness video"
                src="https://www.youtube.com/embed/eZBa63NZbbE?si=1-lljpa63qeL2DnA"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
