import { useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { moods } from '../data/journalData';
import { buildCalendarDays, formatDateKey, getPrimaryEntry, groupEntriesByDate, isCheckIn, isJournalDateAllowed, todayKey } from '../utils/journalUtils';
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

export function Calendar({ nav, entries, onPrimary, onBookmark, onCheckIn, onOpenEntry }) {
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
      {nav}
      <PageHeader eyebrow="Your month" title={monthLabel} subtitle={monthEntryCount > 0 ? `${monthEntryCount} saved ${monthEntryCount === 1 ? 'entry' : 'entries'}` : undefined} actions={(
        <div className="calendar-toolbar-actions" role="group" aria-label="Choose calendar month">
          <button aria-label="Previous month" title="Previous month" className="calendar-nav-button" onClick={() => moveMonth(-1)} type="button">
            <ChevronLeft aria-hidden="true" size={22} />
          </button>
          <button className="calendar-today-button" onClick={returnToToday} title="Return to today" type="button">
            <CalendarDays aria-hidden="true" size={17} />
            Today
          </button>
          <button aria-label="Next month" title="Next month" className="calendar-nav-button" onClick={() => moveMonth(1)} type="button">
            <ChevronRight aria-hidden="true" size={22} />
          </button>
        </div>
      )} />
      <div className="calendar-layout">
      <div className="calendar-board">
        <div className="month-grid" role="group" aria-label={monthLabel}>
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
              <button aria-label={dayLabel} aria-pressed={isSelected} aria-current={isToday ? 'date' : undefined} className={cellClass} disabled={!day} key={key || `blank-${index}`} onClick={() => setSelectedDate(key)} style={firstMood ? { '--day-mood': firstMood.color } : undefined} type="button">
                {day && <span className="calendar-day-number">{day}</span>}
                {isToday && <span className="calendar-today-label">Today</span>}
                {hasEntries && (
                  <span className="calendar-entry-markers" aria-hidden="true">
                    {firstMood && <b>{firstMood.emoji}</b>}
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
      <div className="calendar-detail" role="region" aria-labelledby="calendar-selected-date">
        <div className="calendar-detail-heading">
          <div>
            <span>Selected day</span>
            <h2 id="calendar-selected-date"><time dateTime={selectedDate}>{formatFriendlyDate(selectedDate)}</time></h2>
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
              <p>Nothing here yet</p>
              {isJournalDateAllowed(selectedDate) ? <button className="primary" onClick={() => onCheckIn(selectedDate)} type="button">Check in for this day <ArrowRight aria-hidden="true" size={16} /></button> : <span>This day has not arrived yet.</span>}
            </div>
          </div>
        ) : selectedEntries.map((entry) => <div className="calendar-page-preview" key={entry.id}><EntryCard compact entry={entry} onPrimary={() => onPrimary(entry.id)} onBookmark={(bookmarked) => onBookmark(entry.id, bookmarked)} /><button className="ghost-button" onClick={() => onOpenEntry(entry.id)} type="button">Open in journal <ArrowRight aria-hidden="true" size={16} /></button></div>)}
      </div>
      </div>
    </section>
  );
}
