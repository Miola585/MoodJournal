import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { getJournalStars } from './NightSkyGame';
import { confirmJournalNavigation } from '../../hooks/useJournalDraft';
import { viewPaths } from '../../data/journalData';
import '../../styles/personalNightSky.css';

export function PersonalNightSky({ entries, moods, groupEntriesByDate, getPrimaryEntry }) {
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState(null);
  const stars = getJournalStars(entries, moods, groupEntriesByDate, getPrimaryEntry);
  const selected = stars.find((star) => star.dateKey === selectedDay);
  const open = (path) => { if (confirmJournalNavigation()) navigate(path); };

  return <section className="personal-night-sky" aria-labelledby="personal-sky-title">
    <svg className="personal-sky-background" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {Array.from({ length: 70 }, (_, index) => <circle key={index} cx={(index * 173 + 31) % 1200} cy={(index * 113 + 71) % 730} r={index % 3 === 0 ? 1.2 : .7} fill="currentColor" />)}
      <path d="M0 740Q230 645 480 740T1200 700V800H0Z" fill="#181e32" />
      <path d="M0 780Q280 710 610 775T1200 755V800H0Z" fill="#111726" />
    </svg>
    <nav className="personal-sky-nav" aria-label="Night Sky navigation">
      <button type="button" onClick={() => open('/explore')}><ArrowLeft size={18} aria-hidden="true" />Little breaks</button>
      <span>{stars.length} saved {stars.length === 1 ? 'day' : 'days'}</span>
    </nav>
    <header className="personal-sky-heading"><h1 id="personal-sky-title">Personal Night Sky</h1><p>Your days, gathered as stars.</p></header>
    <div className="personal-sky-field" aria-label="Saved journal days">
      {stars.length === 0 ? <div className="personal-sky-empty">
        <Sparkles size={56} aria-hidden="true" /><h2>Your first star is waiting</h2>
        <button type="button" onClick={() => open(viewPaths.write)}>Start writing<ArrowRight size={18} aria-hidden="true" /></button>
      </div> : stars.map((star, index) => {
        const angle = index * 2.39996;
        const radius = 34 * Math.sqrt((index + .5) / stars.length);
        const label = `${star.dateKey}: ${star.mood.key}, intensity ${star.intensity} of 10, ${star.shape.points}-point star`;
        return <button key={star.id} type="button" className="personal-sky-star" aria-label={label} aria-pressed={selectedDay === star.dateKey}
          onClick={() => setSelectedDay(star.dateKey)} style={{ left: `${50 + Math.cos(angle) * radius}%`, top: `${50 + Math.sin(angle) * radius}%`, '--star-color': star.starColor }}>
          <svg className="galaxy-star" viewBox="0 0 100 100" aria-hidden="true"><polygon className="galaxy-star-glow" points={star.shape.polygon} /><polygon className="galaxy-star-core" points={star.shape.polygon} /></svg>
        </button>;
      })}
    </div>
    <div className="personal-sky-recap" aria-live="polite">
      {selected ? <><div><time dateTime={selected.dateKey}>{new Date(`${selected.dateKey}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</time><strong>{selected.mood.key}</strong></div><button type="button" onClick={() => open(selected.entryId ? `${viewPaths.entries}?entry=${encodeURIComponent(selected.entryId)}` : viewPaths.entries)}>Open journal<ArrowRight size={18} aria-hidden="true" /></button></> : <p>{stars.length ? 'A little light for each day you kept.' : 'There is room for every kind of day.'}</p>}
    </div>
  </section>;
}
