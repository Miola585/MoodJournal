import { constellationStars, normalizeStoredOrbit } from './gameUtils.js';

export function normalizeConstellations(value) {
  if (!Array.isArray(value)) throw new Error('Saved constellations could not be read. Nothing was replaced.');
  return value;
}

export function orbitSnapshots(saved, dateKey) {
  if (!saved) return [];
  if (saved.version === 3 && !Array.isArray(saved.history)) throw new Error('Saved orbit history could not be read. Nothing was replaced.');
  if (Array.isArray(saved.history)) return saved.history;
  if (!Array.isArray(saved) && !Array.isArray(saved.planets)) throw new Error('A saved orbit could not be read. Nothing was replaced.');
  return [{ id: `legacy-orbit:${dateKey}`, dateKey, createdAt: `${dateKey}T12:00:00`, legacy: true, planets: normalizeStoredOrbit(saved), reflection: saved.reflection || '' }];
}

export function appendOrbitSnapshot(saved, snapshot) {
  const history = orbitSnapshots(saved, snapshot.dateKey);
  return { version: 3, planets: snapshot.planets, reflection: snapshot.reflection, history: [...history, snapshot] };
}

export async function loadGameArchive(privateStorage, game) {
  let records;
  if (game === 'orbit') {
    records = [];
    for (const key of privateStorage.listKeys('moodOrbit:')) {
      const dateKey = key.slice('moodOrbit:'.length);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
      records.push(...orbitSnapshots(await privateStorage.read(key, null), dateKey));
    }
  } else {
    records = await privateStorage.read(game === 'constellation' ? 'gameConstellations' : 'gameMemoryJar', []);
    if (!Array.isArray(records)) throw new Error('Saved game history could not be read. Nothing was replaced.');
  }
  return records.map((item, index) => ({
    ...item,
    id: item.id || `legacy-${game}-${index}`,
    title: game === 'constellation' ? item.name || 'Untitled constellation' : game === 'orbit' ? 'Mood Orbit' : item.text || 'Memory',
    stars: game === 'constellation' ? (item.starPositions || item.stars || []).map((star) => typeof star === 'object' ? star : constellationStars.find((value) => value.id === star)).filter(Boolean) : item.stars,
  })).sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
}
