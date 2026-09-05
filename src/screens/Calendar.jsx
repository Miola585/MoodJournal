import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { moods } from '../data/journalData';
import { buildCalendarDays, formatDateKey, getPrimaryEntry, groupEntriesByDate, todayKey } from '../utils/journalUtils';
import { EntryCard } from '../components/journal/EntryCard';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatFriendlyDate = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
};

export function Calendar({ nav, entries, onPrimary }) {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const currentTodayKey = todayKey();
  const grouped = useMemo(() => groupEntriesByDate(entries), [entries]);
  const days = useMemo(() => buildCalendarDays(year, month), [year, month]);
  const selectedEntries = grouped[selectedDate] || [];
  const moveMonth = (change) => setMonthDate(new Date(year, month + change, 1));
  const monthLabel = monthDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  return (
    <section className="screen app-screen calendar-screen">
      <div className="calendar-heading">
        <div>
          <h1>Calendar</h1>
          <p>Review your mood history by day.</p>
        </div>
      </div>
      {nav}
      <div className="calendar-toolbar">
        <button aria-label="Previous month" className="calendar-nav-button" onClick={() => moveMonth(-1)} type="button">
          <ChevronLeft aria-hidden="true" size={22} />
        </button>
        <h2>{monthLabel}</h2>
        <button aria-label="Next month" className="calendar-nav-button" onClick={() => moveMonth(1)} type="button">
          <ChevronRight aria-hidden="true" size={22} />
        </button>
      </div>
      <div className="month-grid">
        {weekDays.map((day) => <strong className="weekday" key={day}>{day}</strong>)}
        {days.map((day, index) => {
          const key = day ? formatDateKey(new Date(year, month, day)) : '';
          const dayEntries = key ? grouped[key] || [] : [];
          const mainEntry = getPrimaryEntry(dayEntries);
          const firstMood = mainEntry ? moods.find((mood) => mood.key === mainEntry.mood) : null;
          const isSelected = key === selectedDate;
          const isToday = key === currentTodayKey;
          const hasEntries = dayEntries.length > 0;
          const cellClass = [
            'calendar-cell',
            day ? 'calendar-cell-day' : 'calendar-cell-empty',
            isSelected ? 'selected' : '',
            isToday ? 'today' : '',
            hasEntries ? 'has-entries' : ''
          ].filter(Boolean).join(' ');
          return (
            <button className={cellClass} disabled={!day} key={key || `blank-${index}`} onClick={() => setSelectedDate(key)} style={firstMood ? { '--day-mood': firstMood.color } : undefined} type="button">
              {day && <span>{day}</span>}
              {isToday && <i className="calendar-today-sticker" aria-hidden="true" />}
              {firstMood && (
                <div className="calendar-entry-markers" aria-label={`${dayEntries.length} saved ${dayEntries.length === 1 ? 'entry' : 'entries'}`}>
                  <b>{firstMood.emoji}</b>
                  <span>
                    {dayEntries.slice(0, 3).map((entry) => <small key={entry.id || entry.created} />)}
                  </span>
                </div>
              )}
              {dayEntries.length > 1 && <em>{dayEntries.length}</em>}
            </button>
          );
        })}
      </div>
      <div className="calendar-detail">
        <h2>{formatFriendlyDate(selectedDate)}</h2>
        {selectedEntries.length === 0 ? (
          <div className="calendar-detail-empty">
            <CalendarDays aria-hidden="true" size={34} />
            <div>
              <p>No entry saved for this day.</p>
              <span>Check-ins and free writes will appear here when saved.</span>
            </div>
          </div>
        ) : selectedEntries.map((entry) => <EntryCard entry={entry} key={entry.id} onPrimary={() => onPrimary(entry.id)} />)}
      </div>
    </section>
  );
}
