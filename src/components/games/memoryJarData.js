import { savedDate } from '../../utils/journalLibrary.js';

export const MEMORY_KEY = 'gameMemoryJar';
export const JAR_CAPACITY = 24;
export const marbleColors = ['#dcae4b', '#cb7587', '#62a9a5', '#9580c1', '#d68b61', '#93aa6b', '#b66c95', '#719dc5'];

export function readMemoryRecords(value) {
  if (!Array.isArray(value)) throw new Error('Saved memories could not be read. Nothing was replaced.');
  return value;
}

// View metadata never replaces the original records, including incomplete legacy items.
export function memoryViews(records) {
  return records.map((record, index) => {
    const dateKey = savedDate(record);
    const text = typeof record?.text === 'string' ? record.text : '';
    const identity = typeof record?.id === 'string' ? record.id : `legacy-${index}`;
    let hash = 0;
    for (const char of identity) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return { record, key: `${identity}:${index}`, dateKey, text, index, color: marbleColors[hash % marbleColors.length] };
  });
}

export function monthlyJars(records, today) {
  const groups = new Map([[today.slice(0, 7), []]]);
  for (const memory of memoryViews(records)) {
    const month = memory.dateKey?.slice(0, 7) || 'undated';
    if (!groups.has(month)) groups.set(month, []);
    groups.get(month).push(memory);
  }
  return [...groups].sort(([a], [b]) => a === 'undated' ? 1 : b === 'undated' ? -1 : b.localeCompare(a)).map(([month, memories]) => ({
    month,
    memories: memories.sort((a, b) => (a.dateKey || '').localeCompare(b.dateKey || '') || (Date.parse(a.record?.createdAt) || 0) - (Date.parse(b.record?.createdAt) || 0) || a.index - b.index),
    jars: Math.max(1, Math.ceil(memories.length / JAR_CAPACITY))
  }));
}

export function resolveJar(groups, params, today) {
  const group = groups.find((item) => item.month === params.get('month')) || groups.find((item) => item.month === today.slice(0, 7));
  const requested = Number(params.get('jar'));
  const jar = Number.isInteger(requested) && requested >= 1 && requested <= group.jars ? requested : group.jars;
  return { ...group, jar, visible: group.memories.slice((jar - 1) * JAR_CAPACITY, jar * JAR_CAPACITY) };
}

export function duplicateMemory(records, text, dateKey) {
  return memoryViews(records).some((item) => item.dateKey === dateKey && item.text.trim().toLowerCase() === text.trim().toLowerCase());
}

export function removeMemoryRecord(records, target) {
  const fingerprint = JSON.stringify(target.record);
  const index = JSON.stringify(records[target.index]) === fingerprint ? target.index : records.findIndex((record) => JSON.stringify(record) === fingerprint);
  if (index < 0) throw new Error('This memory changed in another tab. Reload the jar before removing it.');
  return records.filter((_, current) => current !== index);
}

export function memoryDateLabel(dateKey) {
  return dateKey ? new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Date unavailable';
}

export function monthLabel(month) {
  return month === 'undated' ? 'Undated memories' : new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function restingMarbles(count, offset = 0) {
  return Array.from({ length: count }, (_, index) => {
    const slot = (index + offset) % count;
    return { x: 100 + slot % 4 * 40, y: 375 - Math.floor(slot / 4) * 38, angle: 0 };
  });
}
