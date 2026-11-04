import { formatDateKey, isVisibleJournalEntry } from './journalUtils.js';
import { getJournalNotes } from './journalNotes.js';
import { constellationStars } from '../components/games/gameUtils.js';
import { orbitSnapshots } from '../components/games/gameArchiveData.js';
import { MOOD_COLORS_STORAGE_KEY, normalizeMoodColorsMap } from './moodColors.js';

export function savedDate(record, fallback) {
  for (const value of [record?.dateKey, record?.date, fallback]) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      && formatDateKey(new Date(`${value}T12:00:00`)) === value) return value;
  }
  const timestamp = record?.createdAt || record?.created;
  if (typeof timestamp !== 'string' || !Number.isFinite(Date.parse(timestamp))) return null;
  return formatDateKey(new Date(timestamp));
}

export function libraryConstellation(record) {
  if (!record || typeof record !== 'object' || (record.name != null && typeof record.name !== 'string')) throw new Error('Invalid constellation');
  const positions = record.starPositions || record.stars;
  if (!Array.isArray(positions) || !Array.isArray(record.connections)) throw new Error('Invalid constellation');
  const stars = positions.map((star) => typeof star === 'object' ? star : constellationStars.find((item) => item.id === star));
  if (stars.some((star) => !star || !['string', 'number'].includes(typeof star.id) || !Number.isFinite(star.x) || !Number.isFinite(star.y) || star.x < 0 || star.x > 100 || star.y < 0 || star.y > 100)
    || record.connections.some((line) => !Array.isArray(line) || line.length !== 2 || line.some((id) => !stars.some((star) => star.id === id)))) throw new Error('Invalid constellation geometry');
  return { ...record, stars, aspectRatio: Number.isFinite(record.aspectRatio) && record.aspectRatio > 0 ? record.aspectRatio : 1 };
}

// Each source is independent: an unreadable map must not hide readable writing.
export async function loadLibraryKeepsakes(storage, { signal } = {}) {
  const items = [];
  const unavailable = new Set();
  const check = () => { if (signal?.aborted) throw new DOMException('Library closed', 'AbortError'); };
  const add = (kind, record, source, index, fallback) => {
    if (!record || typeof record !== 'object') throw new Error('Invalid saved item');
    const dateKey = savedDate(record, fallback);
    if (!dateKey) throw new Error('Missing saved date');
    items.push({ ...record, kind, dateKey, libraryId: `${source}:${record.id || index}` });
  };
  const read = async (key, label, consume) => {
    check();
    try {
      const value = await storage.read(key, null);
      check();
      if (value !== null) consume(value);
    } catch (error) {
      if (signal?.aborted) throw error;
      unavailable.add(label);
    }
  };
  const each = (value, label, consume) => {
    if (!Array.isArray(value)) throw new Error('Invalid history');
    value.forEach((record, index) => {
      try { consume(record, index); } catch { unavailable.add(label); }
    });
  };
  await read('gameConstellations', 'Constellations', (value) => each(value, 'Constellations', (record, i) => add('constellation', libraryConstellation(record), 'constellation', i)));
  await read('gameMemoryJar', 'Memory Jar', (value) => each(value, 'Memory Jar', (record, i) => {
    if (typeof record?.text !== 'string') throw new Error('Invalid memory');
    if (record.text.trim()) add('memory', record, 'memory', i);
  }));
  await read(MOOD_COLORS_STORAGE_KEY, 'Mood Colors', (value) => {
    const maps = new Map();
    each(value, 'Mood Colors', (record) => {
      const map = normalizeMoodColorsMap(record);
      if (!map) throw new Error('Invalid map');
      if (!maps.has(map.id) || maps.get(map.id).updatedAt < map.updatedAt) maps.set(map.id, map);
    });
    maps.forEach((record) => add('colors', record, 'colors', record.id));
  });
  const groups = [
    ['activityNotes:', 'Activity notes'], ['groundingNoteV1:', 'Pause notes'],
    ['moodOrbit:', 'Mood Orbit'], ['gameSmallWondersV1:', 'Small Wonders']
  ];
  for (const [prefix, label] of groups) {
    check();
    let keys;
    try { keys = storage.listKeys(prefix); } catch { unavailable.add(label); continue; }
    for (const key of keys) {
      await read(key, label, (value) => {
        const dateKey = key.slice(-10);
        if (!savedDate({ dateKey })) throw new Error('Invalid source date');
        if (prefix === 'moodOrbit:') {
          each(orbitSnapshots(value, dateKey), label, (record, i) => {
            if (!Array.isArray(record?.planets) || record.planets.some((p) => !p || typeof p.name !== 'string' || !Number.isFinite(p.angle) || !['close', 'between', 'far'].includes(p.orbit)) || (record.reflection != null && typeof record.reflection !== 'string')) throw new Error('Invalid orbit');
            add('orbit', record, key, i, dateKey);
          });
        } else if (prefix === 'activityNotes:') {
          if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid notes');
          Object.entries(value).forEach(([title, text]) => {
            if (typeof text !== 'string') { unavailable.add(label); return; }
            if (text.trim()) add('note', { title, text, dateKey }, key, title);
          });
        } else if (prefix === 'groundingNoteV1:') {
          if (typeof value !== 'string') throw new Error('Invalid note');
          const tool = key.split(':')[1];
          const title = { breathing: 'Breathe', senses: 'Five senses', scavenger: 'Small Wonders' }[tool] || 'A quiet moment';
          if (value.trim()) add('note', { title, text: value, dateKey }, key, 0);
        } else {
          if (!value || !['setup', 'hunt', 'complete'].includes(value.stage) || !Array.isArray(value.finds) || value.finds.some((find) => !['light', 'texture', 'movement', 'detail', 'comfort', 'curve', 'color', 'pattern'].includes(find))) throw new Error('Invalid hunt');
          if (value.stage === 'complete') add('wonders', value, key, 0, dateKey);
        }
      });
    }
  }
  check();
  return { items, unavailable: [...unavailable] };
}

export function buildMonthlyLibrary(entries, keepsakes, today) {
  const days = new Map();
  let invalidEntries = false;
  const day = (dateKey) => {
    if (!days.has(dateKey)) days.set(dateKey, { dateKey, entries: [], keepsakes: [] });
    return days.get(dateKey);
  };
  for (const entry of entries) {
    try {
      if (!entry || typeof entry !== 'object') throw new Error('Invalid entry');
      if (!isVisibleJournalEntry(entry)) continue;
      if (['title', 'specificFeeling', 'note', 'copingStep', 'mood', 'meals', 'water', 'sleep'].some((key) => entry[key] != null && typeof entry[key] !== 'string')
        || ['tags', 'factors'].some((key) => entry[key] != null && (!Array.isArray(entry[key]) || entry[key].some((value) => typeof value !== 'string')))
        || (entry.stickers != null && (!Array.isArray(entry.stickers) || entry.stickers.some((value) => !value || typeof value.stickerId !== 'string')))) throw new Error('Invalid entry fields');
      const dateKey = savedDate(entry);
      if (!dateKey) throw new Error('Missing date');
      day(dateKey).entries.push(entry);
      getJournalNotes(entry).forEach((note, index) => {
        if (typeof note?.text === 'string' && note.text.trim()) day(dateKey).keepsakes.push({ kind: 'note', title: 'From your journal', text: note.text, dateKey, libraryId: `entry:${entry.id}:note:${index}` });
      });
    } catch { invalidEntries = true; }
  }
  keepsakes.forEach((item) => day(item.dateKey).keepsakes.push(item));
  const months = [...new Set([today.slice(0, 7), ...[...days.keys()].map((date) => date.slice(0, 7))])].sort().reverse().map((month) => {
    const savedDays = [...days.values()].filter((item) => item.dateKey.startsWith(`${month}-`)).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    return { month, days: savedDays, entryCount: savedDays.reduce((count, item) => count + item.entries.length, 0), keepsakeCount: savedDays.reduce((count, item) => count + item.keepsakes.length, 0) };
  });
  return { months, invalidEntries, constellations: keepsakes.filter((item) => item.kind === 'constellation').sort((a, b) => b.dateKey.localeCompare(a.dateKey)) };
}
