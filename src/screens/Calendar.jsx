import { useMemo, useState } from 'react';
import { moods } from '../data/journalData';
import { buildCalendarDays, formatDateKey, getPrimaryEntry, groupEntriesByDate, todayKey } from '../utils/journalUtils';
import { EntryCard } from '../components/journal/EntryCard';

export function Calendar({ nav, entries, onPrimary }) {
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
