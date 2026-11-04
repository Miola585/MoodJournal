import { buildMonthlyLibrary } from './journalLibrary.js';
import { getPrimaryEntry, isCheckIn } from './journalUtils.js';
import { getGalaxyStarShape, getStarColor } from '../components/games/gameUtils.js';

export const SKY_SPREAD = 'night-sky';
export const skyBookPath = (month) => `/journal/library?month=${month}&view=${SKY_SPREAD}`;
export const skyDayPath = (date) => `/journal/library?month=${date.slice(0, 7)}&day=${date}`;
export const validSkyMonth = (month, today) => /^\d{4}-(0[1-9]|1[0-2])$/u.test(month || '') && month <= today.slice(0, 7);

// A fixed, permuted calendar grid keeps nearby targets apart as the month grows.
export function skyPosition(dateKey) {
  const day = Number(dateKey.slice(-2)) - 1;
  const slot = (day * 13 + 8) % 35;
  return { x: 10 + (slot % 5) * 20 + ((day % 3) - 1) * 1.1,
    wideX: slot % 5 === 2 ? 50 + (day % 2 ? 5 : -5) : 10 + (slot % 5) * 20 + ((day % 5) - 2) * 1.5,
    y: 7 + Math.floor(slot / 5) * 14 + ((day % 4) - 1.5) * .8 };
}

export function buildMonthlySkies(entries, moods, today) {
  const library = buildMonthlyLibrary(entries, [], today);
  const months = library.months.filter(({ month }) => validSkyMonth(month, today)).map((volume) => ({
    month: volume.month,
    stars: volume.days.filter(({ dateKey }) => dateKey <= today).map(({ dateKey, entries: dayEntries }) => {
      const ordered = [...dayEntries].sort((a, b) => String(a.created || '').localeCompare(String(b.created || '')) || String(a.id).localeCompare(String(b.id)));
      const entry = getPrimaryEntry(ordered);
      const checkIn = isCheckIn(entry);
      const mood = checkIn ? moods.find((value) => value.key === entry.mood) : null;
      const intensity = checkIn && entry.intensity != null && Number.isFinite(Number(entry.intensity)) ? Number(entry.intensity) : null;
      const label = checkIn ? ({ Happy: 'Bright', Sad: 'Low' }[entry.mood] || entry.mood || 'Check-in') : 'Free write';
      const shape = getGalaxyStarShape(intensity ?? 5);
      return { id: dateKey, dateKey, entryId: entry.id, entryCount: dayEntries.length, label, intensity, shape,
        starColor: mood ? getStarColor(mood, intensity ?? 5) : '#f5f1df', ...skyPosition(dateKey) };
    })
  }));
  return { months, invalidEntries: library.invalidEntries };
}
