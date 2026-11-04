export const mainDestinations = [
  { view: 'home', label: 'Today', section: 'today', icon: 'CalendarDays' },
  { view: 'write', label: 'My journal', section: 'journal', icon: 'BookOpen' },
  { view: 'explore', label: 'Little breaks', section: 'explore', icon: 'Sparkles' }
];

export const sectionTabs = {
  journal: [
    { view: 'write', label: 'Write' }, { view: 'entries', label: 'Entries' },
    { view: 'library', label: 'Library' },
    { view: 'calendar', label: 'Calendar' }, { view: 'summary', label: 'Weekly reflection' }
  ],
  explore: [
    { view: 'explore', label: 'All activities' },
    { view: 'activities', tool: 'breathing', label: 'Breathe' },
    { view: 'activities', tool: 'senses', label: 'Five senses' },
    { view: 'activities', tool: 'scavenger', label: 'Scavenger hunt' },
    { view: 'moodColors', label: 'Mood Colors' },
    { view: 'stickers', label: 'Sticker collection' }
  ]
};

export function sectionForView(view) {
  if (['write', 'entries', 'library', 'calendar', 'summary'].includes(view)) return 'journal';
  if (['explore', 'stickers', 'moodColors', 'games', 'activities', 'gameArchive'].includes(view)) return 'explore';
  if (['home', 'checkin'].includes(view)) return 'today';
  return null;
}
