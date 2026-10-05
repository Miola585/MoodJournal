export const scavengerSets = [
  ['Find something soft', 'Notice one calming color', 'Name a sound nearby', 'Find something that makes you smile'],
  ['Find something round', 'Notice one shadow', 'Name one steady object', 'Find something that feels cool'],
  ['Find something that reminds you of outside', 'Notice one texture', 'Name one faraway sound', 'Find one thing you can tidy'],
  ['Find something blue or green', 'Notice one source of light', 'Name one scent', 'Find something you are grateful for']
];

export const matchPairs = [
  { id: 'anxious', feeling: 'Anxious', support: 'Take one slow breath' },
  { id: 'tired', feeling: 'Tired', support: 'Choose one small task' },
  { id: 'sad', feeling: 'Sad', support: 'Text someone safe' },
  { id: 'angry', feeling: 'Angry', support: 'Step away for one minute' },
  { id: 'overwhelmed', feeling: 'Overwhelmed', support: 'Pick the next tiny step' },
  { id: 'lonely', feeling: 'Lonely', support: 'Reach out gently' },
  { id: 'grateful', feeling: 'Grateful', support: 'Name one good thing' },
  { id: 'numb', feeling: 'Numb', support: 'Notice five things nearby' }
];

export const matchThemes = matchPairs.map((pair) => ({
  id: pair.id,
  label: pair.feeling,
  pieces: [pair.support]
}));

export const rotatingGames = ['match', 'constellation', 'garden', 'memory', 'orbit'];

export const gameLabels = {
  match: 'Emotional Match',
  constellation: 'Daily Constellation',
  garden: 'Mood Garden',
  memory: 'Memory Jar',
  orbit: 'Mood Orbit',
  night: 'Night Sky Reflection'
};

export const constellationStars = [
  { id: 1, x: 12, y: 34, size: 15, glow: 14, opacity: 0.72 },
  { id: 2, x: 30, y: 29, size: 18, glow: 16, opacity: 0.82 },
  { id: 3, x: 52, y: 37, size: 14, glow: 13, opacity: 0.68 },
  { id: 4, x: 76, y: 31, size: 21, glow: 20, opacity: 0.94 },
  { id: 5, x: 91, y: 40, size: 16, glow: 15, opacity: 0.76 },
  { id: 6, x: 20, y: 43, size: 19, glow: 18, opacity: 0.86 },
  { id: 7, x: 39, y: 46, size: 15, glow: 14, opacity: 0.7 },
  { id: 8, x: 62, y: 43, size: 17, glow: 15, opacity: 0.78 },
  { id: 9, x: 82, y: 48, size: 22, glow: 21, opacity: 0.96 },
  { id: 10, x: 8, y: 55, size: 15, glow: 14, opacity: 0.72 },
  { id: 11, x: 27, y: 52, size: 18, glow: 17, opacity: 0.84 },
  { id: 12, x: 47, y: 58, size: 16, glow: 15, opacity: 0.74 },
  { id: 13, x: 69, y: 54, size: 20, glow: 19, opacity: 0.88 },
  { id: 14, x: 92, y: 59, size: 15, glow: 14, opacity: 0.7 },
  { id: 15, x: 16, y: 65, size: 20, glow: 18, opacity: 0.88 },
  { id: 16, x: 34, y: 63, size: 16, glow: 15, opacity: 0.74 },
  { id: 17, x: 57, y: 68, size: 19, glow: 18, opacity: 0.86 },
  { id: 18, x: 78, y: 65, size: 22, glow: 21, opacity: 0.96 },
  { id: 19, x: 6, y: 75, size: 16, glow: 15, opacity: 0.76 },
  { id: 20, x: 24, y: 77, size: 18, glow: 17, opacity: 0.82 },
  { id: 21, x: 44, y: 73, size: 15, glow: 14, opacity: 0.7 },
  { id: 22, x: 63, y: 79, size: 17, glow: 16, opacity: 0.8 },
  { id: 23, x: 85, y: 76, size: 15, glow: 14, opacity: 0.72 },
  { id: 24, x: 14, y: 83, size: 19, glow: 18, opacity: 0.86 },
  { id: 25, x: 51, y: 84, size: 16, glow: 15, opacity: 0.76 },
  { id: 26, x: 74, y: 83, size: 21, glow: 20, opacity: 0.92 }
];

export const orbitRings = ['close', 'between', 'far'];

export const orbitRingLabels = {
  close: 'Close',
  between: 'In between',
  far: 'Further away'
};

export const planetSeeds = [
  { name: 'Emotion', type: 'emotion', orbit: 'close', angle: -20, size: 78, color: '#f0a7a0' },
  { name: 'Thought', type: 'thought', orbit: 'between', angle: 70, size: 74, color: '#98dce0' },
  { name: 'Goal', type: 'goal', orbit: 'far', angle: 270, size: 72, color: '#f3c969' },
  { name: 'Habit', type: 'habit', orbit: 'far', angle: 330, size: 70, color: '#b9d49b' },
  { name: 'Relationship', type: 'relationship', orbit: 'far', angle: 210, size: 84, color: '#b7b0ff' },
  { name: 'Body', type: 'body', orbit: 'between', angle: 150, size: 68, color: '#e8b8c7' }
];

export const normalizeStoredOrbit = (stored) => {
  const savedPlanets = Array.isArray(stored) ? stored : Array.isArray(stored?.planets) ? stored.planets : [];
  return planetSeeds.map((seed) => {
    const saved = savedPlanets.find((planet) => planet?.name === seed.name);
    const orbit = saved?.orbit === 'near' || saved?.orbit === 'middle' ? 'between' : saved?.orbit;
    return {
      ...seed,
      orbit: orbitRings.includes(orbit) ? orbit : seed.orbit,
      angle: typeof saved?.angle === 'number' && Number.isFinite(saved.angle) ? saved.angle : seed.angle
    };
  });
};

const gameDataMarker = '::game-data::';
const blackbodyStops = ['#ff5f3a', '#ff8f45', '#ffd166', '#fff4c1', '#f4fbff', '#b8d8ff'];

export const formatGameNote = (title, note, payload = null) => {
  const visibleNote = `${title}: ${note}`;
  return payload ? `${visibleNote}\n${gameDataMarker}${JSON.stringify(payload)}` : visibleNote;
};

export const stripGameData = (note = '') => note.split(`\n${gameDataMarker}`)[0];

export const parseGamePayload = (entry) => {
  const note = entry?.note || '';
  const markerIndex = note.indexOf(gameDataMarker);
  if (markerIndex === -1) return null;
  try {
    return JSON.parse(note.slice(markerIndex + gameDataMarker.length));
  } catch {
    return null;
  }
};

export const getMoodColor = (moods, moodKey) => moods.find((mood) => mood.key === moodKey)?.color || '#fff7c7';

const getMemoryText = (entry) => parseGamePayload(entry)?.text || stripGameData(entry.note).replace('Memory Jar: ', '').trim();

export const detectMemoryCategory = (text) => {
  const lower = text.toLowerCase();
  if (/friend|bestie|roommate|classmate/.test(lower)) return 'friendship';
  if (/family|mom|dad|sister|brother|parent|cousin/.test(lower)) return 'family';
  if (/school|class|exam|study|grade|campus|professor/.test(lower)) return 'school';
  if (/peace|calm|quiet|rest|breathe|walk|sunset/.test(lower)) return 'peaceful';
  if (/finished|passed|won|proud|achieved|completed|progress/.test(lower)) return 'achievement';
  if (/art|music|write|draw|create|idea|song/.test(lower)) return 'creative';
  return 'general';
};

export const detectMemoryRarity = ({ text, intensity = 5, tags = [] }) => {
  const lower = text.toLowerCase();
  const hasGratitude = /grateful|thankful|blessed|proud|love|joy/.test(lower);
  if (Number(intensity) >= 9 || (hasGratitude && tags.includes('positive-moment'))) return 'legendary';
  if (Number(intensity) >= 7 || hasGratitude) return 'rare';
  return 'common';
};

export const buildMemoryView = (entry, moods) => {
  const payload = parseGamePayload(entry) || {};
  const created = payload.created || entry.created;
  const date = new Date(created);
  const text = payload.text || getMemoryText(entry);
  const category = payload.category || detectMemoryCategory(text);
  const rarity = payload.rarity || detectMemoryRarity({ text, intensity: entry.intensity, tags: entry.tags || [] });
  return {
    id: entry.id,
    text,
    mood: payload.mood || entry.mood,
    intensity: payload.intensity || entry.intensity || 5,
    category,
    rarity,
    created,
    day: date.getDate(),
    monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    monthLabel: date.toLocaleString(undefined, { month: 'long', year: 'numeric' }),
    color: getMoodColor(moods, payload.mood || entry.mood)
  };
};

export const groupMemoriesByMonth = (memories) => Object.values(memories.reduce((acc, memory) => {
  acc[memory.monthKey] = acc[memory.monthKey] || { monthKey: memory.monthKey, label: memory.monthLabel, memories: [] };
  acc[memory.monthKey].memories.push(memory);
  return acc;
}, {}));

export const buildConnections = (selectedStars) => selectedStars.slice(1).map((starId, index) => [selectedStars[index], starId]);

export const detectConstellationArchetype = (stars, connections) => {
  if (stars.length <= 3 && connections.length >= 2) return 'triangle';
  if (stars.length >= 6) return 'cluster';
  const xSpread = Math.max(...stars.map((star) => star.x), 0) - Math.min(...stars.map((star) => star.x), 0);
  const ySpread = Math.max(...stars.map((star) => star.y), 0) - Math.min(...stars.map((star) => star.y), 0);
  if (xSpread > 48 || ySpread > 48) return 'chain';
  return 'constellation';
};

export const getOrbitPrompt = (planet) => {
  const questions = {
    Emotion: 'How present do your emotions feel today?',
    Thought: 'How much space are your thoughts taking up?',
    Body: 'How connected do you feel to your body?',
    Relationship: 'Where do your relationships sit today?',
    Goal: 'How present do your goals feel right now?',
    Habit: 'How close do your everyday habits feel?'
  };
  return questions[planet?.name] || 'Choose a planet to explore its place in your day.';
};

const hexToRgb = (hex) => {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
};

const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;

const blendHex = (firstHex, secondHex, weight = 0.5) => {
  const first = hexToRgb(firstHex);
  const second = hexToRgb(secondHex);
  return rgbToHex({
    r: first.r * (1 - weight) + second.r * weight,
    g: first.g * (1 - weight) + second.g * weight,
    b: first.b * (1 - weight) + second.b * weight
  });
};

export const getStarColor = (mood, intensity) => {
  const normalized = Math.max(0, Math.min(1, (Number(intensity || 5) - 1) / 9));
  const index = Math.min(blackbodyStops.length - 1, Math.floor(normalized * blackbodyStops.length));
  return blendHex(blackbodyStops[index], mood?.color || '#fff7c7', 0.28);
};

const galaxyStarPolygons = Object.fromEntries([4, 5, 6].map((points) => {
  const innerRadius = points === 4 ? 13 : points === 5 ? 22 : 27;
  const polygon = Array.from({ length: points * 2 }, (_, index) => {
    const angle = index * Math.PI / points - Math.PI / 2;
    const radius = index % 2 === 0 ? 47 : innerRadius;
    return `${(50 + Math.cos(angle) * radius).toFixed(2)},${(50 + Math.sin(angle) * radius).toFixed(2)}`;
  }).join(' ');
  return [points, polygon];
}));

export const getGalaxyStarShape = (intensity) => {
  const value = Math.max(1, Math.min(10, Number(intensity) || 5));
  const points = value <= 3 ? 4 : value <= 7 ? 5 : 6;
  return { points, polygon: galaxyStarPolygons[points] };
};
