import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Smile } from 'lucide-react';
import { journalUrl } from '../data/journalData';
import { calendarWeekDays, formatDateKey, getPrimaryEntry, isCheckIn, todayKey } from '../utils/journalUtils';
import { DestinationArt } from '../components/layout/DestinationArt';
import { getJournalGreeting, getJournalRhythm, getRecentJournalEntries } from '../utils/dashboardUtils';

export function Home({ entries, onOpen, onOpenGame, profile, privateStorage }) {
  const [memoryCount, setMemoryCount] = useState(null);
  const [memoryError, setMemoryError] = useState('');
  useEffect(() => {
    let active = true;
    setMemoryCount(null);
    setMemoryError('');
    privateStorage?.read('gameMemoryJar', []).then((saved) => {
      if (!active) return;
      if (!Array.isArray(saved)) throw new Error('Saved memories could not be read.');
      setMemoryCount(saved.length);
    }).catch(() => { if (active) setMemoryError('Jar preview unavailable.'); });
    return () => { active = false; };
  }, [privateStorage]);
  const now = new Date();
  const mainToday = getPrimaryEntry(entries.filter((entry) => entry.dateKey === todayKey() && isCheckIn(entry)));
  const recent = getRecentJournalEntries(entries, 1)[0];
  const rhythm = getJournalRhythm(entries, now);
  const checkedDays = new Set(entries.filter(isCheckIn).map((entry) => entry.dateKey));
  return <div className="today-screen">
    <header className="today-greeting">
      <p className="app-eyebrow">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
      <h1>{getJournalGreeting(profile?.username, now)}</h1>
      <p>Make a little room for you.</p>
    </header>
    <div className="today-arrival">
      <section className="today-journal-page" aria-labelledby="today-journal-title">
        <p className="app-eyebrow">Your daily page</p>
        <h2 id="today-journal-title">You don't have to<br />have it all figured out.</h2>
        <p>A few words. A feeling. Somewhere to begin.</p>
        <button className="primary-button" onClick={() => onOpen('write')} type="button"><BookOpen size={19} aria-hidden="true" />Open your journal<ArrowRight size={17} aria-hidden="true" /></button>
        <span className="today-page-caption">A blank page, a fresh beginning</span>
      </section>
      <div className="today-arrival-aside">
    <section className="today-checkin" aria-labelledby="today-checkin-title">
      <Smile className="today-mood-mark" aria-hidden="true" size={32} />
      <div><p className="app-eyebrow">{mainToday ? 'Noted for today' : 'A moment to notice'}</p><h2 id="today-checkin-title">{mainToday ? "You made room for what's here." : 'How are you arriving?'}</h2></div>
      <button className="primary-button" onClick={() => onOpen('checkin')} type="button">{mainToday ? 'Visit check-in' : 'Check in'}<ArrowRight size={18} aria-hidden="true" /></button>
    </section>
        <button className="today-rhythm" onClick={() => onOpen('summary')} type="button" aria-label={`This week: ${rhythm} of 7 days checked in. Open weekly reflection`}>
          <span className="app-eyebrow">Your week, so far</span><span className="today-rhythm-count">{rhythm}<small> / 7 days</small></span>
          <span className="today-week-dots" aria-hidden="true">{calendarWeekDays(now).map((date) => <span key={formatDateKey(date)}><i className={checkedDays.has(formatDateKey(date)) ? 'filled' : ''} /><small>{date.toLocaleDateString(undefined, { weekday: 'narrow' })}</small></span>)}</span>
        </button>
      </div>
    </div>
    <section className="today-world" aria-labelledby="today-world-title">
      <header className="today-section-heading"><div><p className="app-eyebrow">Your little world</p><h2 id="today-world-title">Return to something you're growing.</h2></div><button className="ghost-button" onClick={() => onOpen('explore')} type="button">Explore all <ArrowRight size={16} aria-hidden="true" /></button></header>
      <div className="today-world-grid">
        <button className="today-jar" onClick={() => onOpenGame('memory')} type="button">
          <DestinationArt kind="jar" />
          <span className="today-jar-heading"><span className="app-eyebrow">Memory Jar</span><span>Open jar <ArrowRight size={16} aria-hidden="true" /></span></span>
          <span className="today-scene-space" aria-hidden="true" />
          <strong>{memoryError || (memoryCount === null ? 'Opening your jar...' : memoryCount ? `${memoryCount} ${memoryCount === 1 ? 'moment' : 'moments'} kept` : 'Your first moment is waiting')}</strong>
        </button>
        <button className="today-jar" onClick={() => onOpenGame('constellation')} type="button">
          <DestinationArt kind="sky" /><span className="app-eyebrow">A small universe</span><span className="today-scene-space" aria-hidden="true" /><strong>Daily Constellation <ArrowRight size={17} aria-hidden="true" /></strong>
        </button>
        <button className="today-jar" onClick={() => onOpen('activities', null, null, 'breathing')} type="button">
          <DestinationArt kind="breathe" /><span className="app-eyebrow">A quiet minute</span><span className="today-scene-space" aria-hidden="true" /><strong>Breathe with the day <ArrowRight size={17} aria-hidden="true" /></strong>
        </button>
      </div>
    </section>
    {recent && <div className="today-next-actions">
      <button className="today-writing" type="button" onClick={() => onOpen(recent ? 'entries' : 'write', recent?.id)}>
        <img src={journalUrl} alt="" /><span><span className="app-eyebrow">Your journal</span><strong>{recent ? (recent.title || recent.specificFeeling || recent.mood || 'Your latest page') : 'A blank page is waiting.'}</strong><span>{recent ? 'Return to your page' : 'Write something'} <ArrowRight size={16} aria-hidden="true" /></span></span>
      </button>
    </div>}
  </div>;
}
