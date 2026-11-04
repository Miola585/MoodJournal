import { getPrimaryEntry, isCheckIn } from './journalUtils.js';

export const REFLECTION_SPREAD = 'reflection';
export const moodLabel = (name) => ({ Happy: 'Bright', Sad: 'Low' }[name] || name);

export function buildMonthlyReflection(book, today, moods) {
  const days = book.days.filter((day) => day.dateKey <= today);
  const entries = days.flatMap((day) => day.entries);
  const checkIns = entries.filter(isCheckIn);
  const primary = days.flatMap((day) => {
    const entry = getPrimaryEntry(day.entries.filter(isCheckIn));
    return entry ? [{ ...entry, dateKey: day.dateKey }] : [];
  });
  const moodCounts = new Map(), factorCounts = new Map();
  for (const entry of primary) {
    if (entry.mood?.trim()) moodCounts.set(entry.mood, (moodCounts.get(entry.mood) || 0) + 1);
    for (const factor of new Set(entry.factors || [])) factorCounts.set(factor, (factorCounts.get(factor) || 0) + 1);
  }
  const intensity = (entry) => entry?.intensity != null && Number.isFinite(Number(entry.intensity)) && Number(entry.intensity) >= 1 && Number(entry.intensity) <= 10 ? Number(entry.intensity) : null;
  const validIntensity = primary.map(intensity).filter((value) => value !== null);
  const [year, month] = book.month.split('-').map(Number);
  const intensityData = Array.from({ length: new Date(year, month, 0).getDate() }, (_, index) => {
    const day = index + 1, dateKey = `${book.month}-${String(day).padStart(2, '0')}`;
    return { day, dateKey, intensity: intensity(primary.find((entry) => entry.dateKey === dateKey)) };
  });
  const moodData = [...moodCounts].map(([key, value]) => ({ name: moodLabel(key), value, fill: moods.find((mood) => mood.key === key)?.color || '#89939b' })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const factors = [...factorCounts].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const insights = [];
  const top = moodData.filter((value) => value.value === moodData[0]?.value);
  if (top.length && top[0].value >= 2) insights.push(`${top.map((value) => value.name).join(', ')} ${top.length === 1 ? 'appeared' : 'each appeared'} on ${top[0].value} check-in days.`);
  if (factors[0]?.value >= 2) insights.push(`${factors[0].name} was mentioned on ${factors[0].value} check-in days.`);
  if (validIntensity.length >= 2) insights.push(`Recorded intensity ranged from ${Math.min(...validIntensity)} to ${Math.max(...validIntensity)} out of 10.`);
  return { entryCount: entries.length, journalDays: days.filter((day) => day.entries.length).length,
    freeWrites: entries.length - checkIns.length, checkIns: checkIns.length, checkInDays: primary.length,
    keepsakes: days.reduce((sum, day) => sum + day.keepsakes.length, 0),
    averageIntensity: validIntensity.length ? (validIntensity.reduce((sum, value) => sum + value, 0) / validIntensity.length).toFixed(1) : null,
    intensityData, moodData, factors, insights };
}
