export const libraryEntries = [
  { id: 'book-first', type: 'journal', specificFeeling: 'The long way home', note: 'The light was different today.\nI took the quieter street.', noteDoc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'The light was different today.', marks: [{ type: 'bold' }] }] }, { type: 'paragraph', content: [{ type: 'text', text: 'I took the quieter street.' }] }] }, created: '2026-10-03T12:00:00.000Z', dateKey: '2026-10-03', mood: '', factors: [], tags: ['free-write'], stickyNotes: [{ uid: 1, text: 'Remember the little things.', x: .5, y: .5 }], stickers: [{ id: 'placement', stickerId: 'cafe-pumpkin', x: 50, y: 50, size: 20, rotation: 0, layer: 0, region: 'writing' }] },
  { id: 'book-second', type: 'checkin', specificFeeling: 'A little steadier', note: 'A quiet afternoon with a friend.', created: '2026-10-03T16:00:00.000Z', dateKey: '2026-10-03', mood: 'calm', intensity: 7, factors: ['People'], tags: [], copingStep: 'Rest' },
  { id: 'book-next', type: 'journal', specificFeeling: 'An open window', note: 'Some space to begin again.', created: '2026-10-17T12:00:00.000Z', dateKey: '2026-10-17', mood: '', factors: [], tags: [] }
];
export const libraryData = {
  gameConstellations: [{ id: 'book-sky', name: 'The way back', dateKey: '2026-10-03', createdAt: '2026-10-03T12:00:00.000Z', stars: [1, 2, 3], starPositions: [{ id: 1, x: 14, y: 20 }, { id: 2, x: 48, y: 75 }, { id: 3, x: 86, y: 24 }], connections: [[1, 2], [2, 3]], aspectRatio: 1.5 }],
  gameMemoryJar: [{ id: 'book-memory', text: 'A conversation that lasted longer than planned.', createdAt: '2026-10-03T18:00:00.000Z' }],
  'groundingNoteV1:senses:2026-09-12': 'The sound of rain at the window.',
  'groundingNoteV1:breathing:2026-10-03': 'My shoulders felt softer.',
  'activityNotes:2026-10-03': { 'A slow walk': 'I noticed the leaves.' },
  'moodOrbit:2026-10-03': { version: 3, history: [{ id: 'orbit-1', dateKey: '2026-10-03', createdAt: '2026-10-03T15:00:00.000Z', planets: [{ name: 'Emotion', orbit: 'close', angle: 45 }, { name: 'Thought', orbit: 'far', angle: 200 }], reflection: 'Some thoughts can wait.' }] },
  gameMoodColorsV1: [{ version: 1, id: 'colors-1', dateKey: '2026-10-03', createdAt: '2026-10-03T15:00:00.000Z', updatedAt: '2026-10-03T15:00:00.000Z', tiles: Array.from({ length: 35 }, (_, i) => ['calm', 'hopeful', 'joyful', null, 'tender'][i % 5]), note: 'A little color from today.' }],
  'gameSmallWondersV1:2026-10-17': { stage: 'complete', finds: ['light', 'texture', 'curve'], place: 'outside', target: 3, cursor: 3 }
};
export function seedLibrary({ entries = libraryEntries, data = libraryData, theme = 'night', mode = 'light' } = {}) {
  localStorage.setItem('journalEntriesV2', JSON.stringify(entries));
  localStorage.setItem('siteTheme', theme);
  localStorage.setItem('theme', mode);
  for (const [key, value] of Object.entries(data)) localStorage.setItem(`moodJournalPrivateV1:local-browser:${encodeURIComponent(key)}`, JSON.stringify(value));
}
