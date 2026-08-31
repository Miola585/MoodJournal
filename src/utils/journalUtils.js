export const viewFromPath = (pathname, viewPaths) => {
  const match = Object.entries(viewPaths).find(([, path]) => path !== '/' && pathname.startsWith(path));
  return match?.[0] || 'home';
};
export const todayKey = () => new Date().toISOString().slice(0, 10);
export const normalizeUsername = (value) => value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
export const readStorage = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
export const countBy = (items, key) => items.reduce((acc, item) => {
  if (item[key]) acc[item[key]] = (acc[item[key]] || 0) + 1;
  return acc;
}, {});
export const countMany = (items, key) => items.reduce((acc, item) => {
  (item[key] || []).forEach((value) => { acc[value] = (acc[value] || 0) + 1; });
  return acc;
}, {});
export const topLabel = (counts) => Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
export const formatDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const isCheckIn = (entry) => (entry.type || 'checkin') === 'checkin';
export const isVisibleJournalEntry = (entry) => isCheckIn(entry) || entry.type === 'journal' || (entry.tags || []).includes('free-write');
export const isMissingEntryTypeError = (error) => /entry[_-]?type|schema cache/i.test(error?.message || '');
export const groupEntriesByDate = (entries) => entries.reduce((acc, entry) => {
  acc[entry.dateKey] = acc[entry.dateKey] || [];
  acc[entry.dateKey].push(entry);
  return acc;
}, {});
export const getPrimaryEntry = (entries) => entries.find((entry) => isCheckIn(entry) && entry.primary) || entries.find(isCheckIn) || entries[0] || null;
export const calculateStreak = (entries) => {
  const dates = new Set(entries.map((entry) => entry.dateKey));
  let streak = 0;
  const cursor = new Date();
  while (dates.has(formatDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};
export const normalizeReminder = (value) => {
  const times = Array.isArray(value?.times) && value.times.length > 0 ? value.times : [value?.time || '19:00'];
  return { enabled: Boolean(value?.enabled), time: times[0], times };
};
export const entryToRow = (entry, userId) => ({
  id: String(entry.id || crypto.randomUUID()),
  user_id: userId,
  entry_type: entry.type || 'checkin',
  created: entry.created,
  date_key: entry.dateKey,
  mood: entry.mood,
  specific_feeling: entry.specificFeeling || '',
  intensity: Number(entry.intensity || 5),
  factors: entry.factors || [],
  tags: entry.tags || [],
  note: entry.note || '',
  coping_step: entry.copingStep || '',
  meals: entry.meals || '',
  water: entry.water || '',
  sleep: entry.sleep || '',
  primary: Boolean(entry.primary),
  mood_score: entry.moodScore || null,
  updated_at: entry.updated || new Date().toISOString()
});
export const rowToEntry = (row) => ({
  id: row.id,
  type: row.entry_type || inferEntryType(row),
  created: row.created,
  dateKey: row.date_key,
  mood: row.mood,
  specificFeeling: row.specific_feeling || '',
  intensity: row.intensity || 5,
  factors: row.factors || [],
  tags: row.tags || [],
  note: row.note || '',
  copingStep: row.coping_step || '',
  meals: row.meals || '',
  water: row.water || '',
  sleep: row.sleep || '',
  primary: Boolean(row.primary),
  moodScore: row.mood_score || null,
  updated: row.updated_at
});
export const inferEntryType = (row) => {
  const tags = row.tags || [];
  if (tags.includes('game')) return 'game';
  if (tags.includes('free-write')) return 'journal';
  return 'checkin';
};
export const getPatternNotes = (entries) => {
  const notes = [];
  const moodFactorCounts = {};
  entries.forEach((entry) => {
    (entry.factors || []).forEach((factor) => {
      const key = `${entry.mood}|${factor}`;
      moodFactorCounts[key] = (moodFactorCounts[key] || 0) + 1;
    });
  });
  const top = Object.entries(moodFactorCounts).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 2) {
    const [mood, factor] = top[0].split('|');
    notes.push(`${mood} appears most often when ${factor.toLowerCase()} is involved.`);
  }
  const tiredLowSleep = entries.filter((entry) => entry.mood === 'Tired' && String(entry.sleep || '').includes('0-4')).length;
  if (tiredLowSleep >= 1) notes.push('Tired appears alongside low sleep. A rest-focused activity may help.');
  const highIntensity = entries.filter((entry) => Number(entry.intensity) >= 8).length;
  if (highIntensity >= 2) notes.push('You have had several high-intensity days. Consider using grounding or support prompts.');
  return notes;
};
export const buildCalendarDays = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
};
