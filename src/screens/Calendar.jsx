import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { moods } from '../data/journalData';
import { buildCalendarDays, formatDateKey, getPrimaryEntry, groupEntriesByDate, isCheckIn, todayKey } from '../utils/journalUtils';
import { EntryCard } from '../components/journal/EntryCard';
import { PageHeader } from '../components/layout/PageHeader';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatFriendlyDate = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
};

export function Calendar({ nav, entries, onPrimary, onBookmark }) {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const currentTodayKey = todayKey();
  const grouped = useMemo(() => groupEntriesByDate(entries), [entries]);
  const days = useMemo(() => {
    const monthDays = buildCalendarDays(year, month);
    const trailingDays = (7 - (monthDays.length % 7)) % 7;
    return [...monthDays, ...Array(trailingDays).fill(null)];
  }, [year, month]);
  const selectedEntries = grouped[selectedDate] || [];
  const monthEntryCount = days.reduce((total, day) => {
    if (!day) return total;
    const key = formatDateKey(new Date(year, month, day));
    return total + (grouped[key]?.length || 0);
  }, 0);
  const moveMonth = (change) => {
    const nextMonth = new Date(year, month + change, 1);
    setMonthDate(nextMonth);
    setSelectedDate(formatDateKey(nextMonth));
  };
  const returnToToday = () => {
    const today = new Date();
    setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(currentTodayKey);
  };
  const monthLabel = monthDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  return (
    <section className="screen app-screen calendar-screen">
      <PageHeader title="Calendar" subtitle="Review your mood history by day." />
      {nav}
      <div className="calendar-board">
        <div className="calendar-toolbar">
          <button aria-label="Previous month" className="calendar-nav-button" onClick={() => moveMonth(-1)} type="button">
            <ChevronLeft aria-hidden="true" size={22} />
          </button>
          <div className="calendar-month-heading">
            <h2>{monthLabel}</h2>
            <span>{monthEntryCount} saved {monthEntryCount === 1 ? 'entry' : 'entries'}</span>
          </div>
          <div className="calendar-toolbar-actions">
            <button className="calendar-today-button" onClick={returnToToday} type="button">
              <CalendarDays aria-hidden="true" size={17} />
              Today
            </button>
            <button aria-label="Next month" className="calendar-nav-button" onClick={() => moveMonth(1)} type="button">
              <ChevronRight aria-hidden="true" size={22} />
            </button>
          </div>
        </div>
        <div className="month-grid">
          {weekDays.map((day) => <strong className="weekday" key={day}>{day}</strong>)}
          {days.map((day, index) => {
            const key = day ? formatDateKey(new Date(year, month, day)) : '';
            const dayEntries = key ? grouped[key] || [] : [];
            const mainEntry = getPrimaryEntry(dayEntries);
            const firstMood = mainEntry && isCheckIn(mainEntry) ? moods.find((mood) => mood.key === mainEntry.mood) : null;
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
            const dayLabel = day
              ? `${formatFriendlyDate(key)}${isToday ? ', today' : ''}${hasEntries ? `, ${dayEntries.length} saved ${dayEntries.length === 1 ? 'entry' : 'entries'}` : ', no saved entries'}`
              : 'Empty calendar day';
            return (
              <button aria-label={dayLabel} aria-pressed={isSelected} className={cellClass} disabled={!day} key={key || `blank-${index}`} onClick={() => setSelectedDate(key)} style={firstMood ? { '--day-mood': firstMood.color } : undefined} type="button">
                {day && <span className="calendar-day-number">{day}</span>}
                {isToday && <span className="calendar-today-label">Today</span>}
                {firstMood && (
                  <span className="calendar-entry-markers" aria-hidden="true">
                    <b>{firstMood.emoji}</b>
                    <span>
                      {dayEntries.slice(0, 3).map((entry) => <small key={entry.id || entry.created} />)}
                    </span>
                  </span>
                )}
                {dayEntries.length > 1 && <em aria-hidden="true">{dayEntries.length}</em>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="calendar-detail">
        <div className="calendar-detail-heading">
          <div>
            <span>Selected day</span>
            <h2>{formatFriendlyDate(selectedDate)}</h2>
          </div>
          {selectedEntries.length > 0 && (
            <p className="calendar-detail-count">
              <CalendarDays aria-hidden="true" size={16} />
              {selectedEntries.length} saved {selectedEntries.length === 1 ? 'entry' : 'entries'}
            </p>
          )}
        </div>
        {selectedEntries.length === 0 ? (
          <div className="calendar-detail-empty">
            <CalendarDays aria-hidden="true" size={34} />
            <div>
              <p>No entry saved for this day.</p>
              <span>Check-ins and free writes will appear here when saved.</span>
            </div>
          </div>
        ) : selectedEntries.map((entry) => <EntryCard compact entry={entry} key={entry.id} onPrimary={() => onPrimary(entry.id)} onBookmark={(bookmarked) => onBookmark(entry.id, bookmarked)} />)}
      </div>
    </section>
  );
}
