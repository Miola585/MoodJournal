import { calendarWeekDays, isCheckIn, isVisibleJournalEntry } from './journalUtils.js';

export function getJournalGreeting(username, now = new Date()) {
  const hour = now.getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const name = typeof username === 'string' ? username.trim() : '';
  return `Good ${timeOfDay}${name ? `, ${name}` : ''}!`;
}

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export function getJournalRhythm(entries, now = new Date()) {
  const today = startOfDay(now);
  const start = calendarWeekDays(today)[0];
  const uniqueDays = new Set(
    entries
      .filter(isCheckIn)
      .filter((entry) => {
        const created = startOfDay(entry.dateKey ? `${entry.dateKey}T12:00:00` : entry.created);
        return created >= start && created <= today;
      })
      .map((entry) => entry.dateKey)
  );
  return uniqueDays.size;
}

export function getRecentJournalEntries(entries, limit = 3) {
  return entries
    .filter(isVisibleJournalEntry)
    .slice()
    .sort((left, right) => new Date(right.created) - new Date(left.created))
    .slice(0, limit);
}
