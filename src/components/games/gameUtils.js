const cafeJarUrl = new URL('../../../img/Cafe.svg', import.meta.url).href;
const gardenJarUrl = new URL('../../../img/Garden.svg', import.meta.url).href;
const nightJarUrl = new URL('../../../img/Night Sky.svg', import.meta.url).href;
const oceanJarUrl = new URL('../../../img/Ocean.svg', import.meta.url).href;
const sunsetJarUrl = new URL('../../../img/Sunset.svg', import.meta.url).href;

export const scavengerSets = [
  ['Find something soft', 'Notice one calming color', 'Name a sound nearby', 'Find something that makes you smile'],
  ['Find something round', 'Notice one shadow', 'Name one steady object', 'Find something that feels cool'],
  ['Find something that reminds you of outside', 'Notice one texture', 'Name one faraway sound', 'Find one thing you can tidy'],
  ['Find something blue or green', 'Notice one source of light', 'Name one scent', 'Find something you are grateful for']
];

export const matchThemes = [
  { id: 'anxious', label: '😰 Anxious', pieces: ['🫁 Box breathing', '🧡 I can slow down', '🌊 Wave'] },
  { id: 'sad', label: '😢 Sad', pieces: ['💬 Text someone safe', '🤲 I deserve care', '🧣 Blanket'] },
  { id: 'angry', label: '😡 Angry', pieces: ['🚪 Step away', '🧭 I can choose my response', '🔥 Flame'] },
  { id: 'tired', label: '😴 Tired', pieces: ['🌙 Rest eyes', '🛌 Rest is productive', '⭐ Moon'] }
];

export const rotatingGames = ['match', 'constellation', 'garden', 'memory', 'orbit'];

export const gameLabels = {
  match: 'Emotional Match',
  constellation: 'Daily Constellation',
  garden: 'Mood Garden',
  memory: 'Memory Jar',
  orbit: 'Orbit Simulator',
  night: 'Night Sky Reflection'
};

export const jarAssets = [cafeJarUrl, sunsetJarUrl, nightJarUrl, gardenJarUrl, oceanJarUrl];

export const constellationStars = [
  { id: 1, x: 18, y: 22 },
  { id: 2, x: 48, y: 18 },
  { id: 3, x: 78, y: 30 },
  { id: 4, x: 30, y: 48 },
  { id: 5, x: 62, y: 54 },
  { id: 6, x: 86, y: 66 },
  { id: 7, x: 16, y: 76 },
  { id: 8, x: 46, y: 82 },
  { id: 9, x: 72, y: 78 }
];

export const orbitRings = ['near', 'middle', 'far'];

export const planetSeeds = [
  { name: 'Emotion', type: 'emotion', orbit: 'near', velocity: 3, size: 82, color: '#f28482' },
  { name: 'Thought', type: 'thought', orbit: 'middle', velocity: 2, size: 76, color: '#8ecae6' },
  { name: 'Goal', type: 'goal', orbit: 'far', velocity: 1, size: 72, color: '#ffd166' },
  { name: 'Fear', type: 'fear', orbit: 'near', velocity: 3, size: 68, color: '#bdb2ff' },
  { name: 'Relationship', type: 'relationship', orbit: 'middle', velocity: 2, size: 88, color: '#b7c7a3' },
  { name: 'Habit', type: 'habit', orbit: 'far', velocity: 1, size: 70, color: '#f4a261' }
];

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

export const getOrbitStability = (planets) => {
  const counts = orbitRings.map((orbit) => planets.filter((planet) => planet.orbit === orbit).length);
  const spreadPenalty = Math.max(...counts) - Math.min(...counts);
  return Math.max(35, 100 - spreadPenalty * 18);
};

export const getOrbitPrompt = (planet) => `What is making ${planet.name.toLowerCase()} feel closest to you today?`;

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
