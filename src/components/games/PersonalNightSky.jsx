import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { buildMonthlySkies, skyBookPath, skyDayPath, validSkyMonth } from '../../utils/monthlyNightSky';
import { useLocalToday } from '../../hooks/useLocalToday';
import { MonthlySkyField, SkyBackground } from './MonthlySkyField';
import { confirmJournalNavigation } from '../../hooks/useJournalDraft';
import { viewPaths } from '../../data/journalData';
import '../../styles/personalNightSky.css';

export function PersonalNightSky({ entries, moods }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const today = useLocalToday();
  const [selectedDay, setSelectedDay] = useState(null);
  const sky = useMemo(() => buildMonthlySkies(entries, moods, today), [entries, moods, today]);
  const month = validSkyMonth(params.get('month'), today) ? params.get('month') : today.slice(0, 7);
  const stars = sky.months.find((item) => item.month === month)?.stars || [];
  const months = [...new Set([month, ...sky.months.map((item) => item.month)])].sort().reverse();
  const selected = stars.find((star) => star.dateKey === selectedDay);
  const open = (path) => { if (confirmJournalNavigation()) navigate(path); };
  const monthLabel = (value) => new Date(`${value}-01T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const dayLabel = (value) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  const fromBook = location.state?.skyReturn === skyBookPath(month);

  return <section className="personal-night-sky" aria-labelledby="personal-sky-title">
    <SkyBackground />
    <nav className="personal-sky-nav" aria-label="Night Sky navigation">
      <button type="button" onClick={() => open(fromBook ? skyBookPath(month) : '/explore')}><ArrowLeft size={18} aria-hidden="true" />{fromBook ? 'Back to monthly book' : 'Little breaks'}</button>
      <span>{stars.length} saved {stars.length === 1 ? 'day' : 'days'}</span>
    </nav>
    <header className="personal-sky-heading"><h1 id="personal-sky-title">Personal Night Sky</h1><p>{month === today.slice(0, 7) ? 'Still growing. Your days, gathered as stars.' : 'Your days, gathered as stars.'}</p>
      <label className="personal-sky-month">Month<select aria-label="Month" value={month} onChange={(event) => { setSelectedDay(null); setParams(event.target.value === today.slice(0, 7) ? {} : { month: event.target.value }); }}>{months.map((value) => <option key={value} value={value}>{monthLabel(value)}</option>)}</select></label>
    </header>
    {sky.invalidEntries && <p role="alert">Some journal entries have unreadable dates or details. Their stars cannot be shown.</p>}
    <MonthlySkyField stars={stars} selectedDay={selectedDay} onSelect={setSelectedDay} empty={<>
        <Sparkles size={56} aria-hidden="true" /><h2>Your first star is waiting</h2>
        <p>No saved journal days in {monthLabel(month)}.</p>
        <button type="button" onClick={() => open(viewPaths.write)}>Write today<ArrowRight size={18} aria-hidden="true" /></button>
      </>} />
    <div className="personal-sky-recap" aria-live="polite">
      {selected ? <><div><time dateTime={selected.dateKey}>{dayLabel(selected.dateKey)}</time><strong>{selected.label}</strong><small>{selected.entryCount} {selected.entryCount === 1 ? 'entry' : 'entries'}{selected.intensity == null ? '' : ` / intensity ${selected.intensity}`}</small></div><div className="personal-sky-actions"><button type="button" onClick={() => open(selected.entryId ? `${viewPaths.entries}?entry=${encodeURIComponent(selected.entryId)}` : viewPaths.entries)}>Open journal<ArrowRight size={18} aria-hidden="true" /></button><button type="button" onClick={() => open(skyDayPath(selected.dateKey))}>Open book day<ArrowRight size={18} aria-hidden="true" /></button></div></> : <p>{stars.length ? 'A little light for each day you kept.' : 'There is room for every kind of day.'}</p>}
    </div>
    <div className="personal-sky-bottom"><details><summary>Days in this sky ({stars.length})</summary><ul>{stars.map((star) => <li key={star.id}><button type="button" aria-pressed={selectedDay === star.dateKey} onClick={() => setSelectedDay(star.dateKey)}>{dayLabel(star.dateKey)}<span>{star.label}</span></button></li>)}</ul></details><button type="button" onClick={() => open(skyBookPath(month))}>Open monthly book<ArrowRight size={18} aria-hidden="true" /></button></div>
  </section>;
}
