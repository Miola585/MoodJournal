import { todayKey } from '../utils/journalUtils';

export const logoUrl = new URL('../../img/JJ.png', import.meta.url).href;
export const emotionWheelUrl = new URL('../../img/Emotion-Wheel.png', import.meta.url).href;
export const journalUrl = new URL('../../img/Journal.png', import.meta.url).href;
export const yogaUrl = new URL('../../img/Yoga.png', import.meta.url).href;
export const sunshineUrl = new URL('../../img/sunshine.png', import.meta.url).href;
export const moods = [
  { key: 'Happy', emoji: '😊', color: '#ffd166', feelings: ['Joyful', 'Proud', 'Playful', 'Hopeful', 'Loved'], score: 8 },
  { key: 'Content', emoji: '🙂', color: '#f4a261', feelings: ['Settled', 'Comfortable', 'Balanced', 'Safe', 'Present'], score: 7 },
  { key: 'Excited', emoji: '🤩', color: '#ff9f1c', feelings: ['Eager', 'Inspired', 'Energized', 'Curious', 'Motivated'], score: 8 },
  { key: 'Calm', emoji: '😌', color: '#8ecae6', feelings: ['Peaceful', 'Relaxed', 'Grounded', 'Clear', 'Relieved'], score: 7 },
  { key: 'Anxious', emoji: '😰', color: '#f28482', feelings: ['Worried', 'Nervous', 'Unsure', 'Restless', 'Scared'], score: 4 },
  { key: 'Sad', emoji: '😢', color: '#90a4ae', feelings: ['Disappointed', 'Hurt', 'Grieving', 'Discouraged', 'Heavy'], score: 3 },
  { key: 'Angry', emoji: '😡', color: '#ff6b6b', feelings: ['Frustrated', 'Irritated', 'Resentful', 'Betrayed', 'Defensive'], score: 4 },
  { key: 'Lonely', emoji: '😔', color: '#bdb2ff', feelings: ['Left out', 'Disconnected', 'Unseen', 'Homesick', 'Isolated'], score: 3 },
  { key: 'Grateful', emoji: '🙏', color: '#b7c7a3', feelings: ['Thankful', 'Appreciative', 'Touched', 'Lucky', 'Supported'], score: 8 },
  { key: 'Tired', emoji: '😴', color: '#a8dadc', feelings: ['Drained', 'Sleepy', 'Burned out', 'Foggy', 'Low energy'], score: 4 },
  { key: 'Overwhelmed', emoji: '😵', color: '#ffb4a2', feelings: ['Stressed', 'Pressured', 'Scattered', 'Stuck', 'Flooded'], score: 3 },
  { key: 'Panic', emoji: '😱', color: '#ff8fa3', feelings: ['Terrified', 'Shaky', 'Trapped', 'Racing', 'Unsafe'], score: 2 },
  { key: 'Numb', emoji: '😶', color: '#cfd8dc', feelings: ['Blank', 'Detached', 'Flat', 'Distant', 'Frozen'], score: 3 }
];
export const factors = ['Sleep', 'School', 'Work', 'Friends', 'Family', 'Body', 'Food', 'Money', 'Social media', 'Weather', 'Health', 'Identity'];
export const prompts = [
  'What happened right before this feeling showed up?',
  'Where do you feel this mood in your body?',
  'What do you need most right now?',
  'What is one kind thing you can tell yourself?',
  'What helped you get through a similar feeling before?'
];
export const guidedPrompts = {
  Reflect: prompts,
  Gratitude: ['What is one small thing that went okay today?', 'Who or what helped you recently?', 'What is something you want to remember from today?'],
  Grounding: ['Name five things you can see right now.', 'What sounds, colors, or textures are around you?', 'What feels steady or safe in this moment?'],
  Growth: ['What did this mood teach you?', 'What would you try differently next time?', 'What is one small win from today?'],
  Support: ['Who could you talk to if this feeling gets heavier?', 'What would you say to a friend feeling this way?', 'What support do you need right now?']
};
export const activities = {
  Anxious: [
    { title: 'Box breathing', minutes: 2, detail: 'Breathe in 4, hold 4, out 4, hold 4. Repeat slowly.', steps: ['Sit somewhere steady', 'Relax your shoulders', 'Complete 4 rounds'] },
    { title: '5-4-3-2-1 grounding', minutes: 3, detail: 'Name things you can see, touch, hear, smell, and taste.', steps: ['Name 5 things you see', 'Name 4 things you feel', 'Name 3 things you hear'] },
    { title: 'Tiny next step', minutes: 5, detail: 'Write the smallest action that would make the next 10 minutes easier.', steps: ['Write one worry', 'Write one next action', 'Do only that action'] }
  ],
  Sad: [
    { title: 'Comfort reset', minutes: 5, detail: 'Get water, sit somewhere soft, and play one comforting song.', steps: ['Drink water', 'Put on a calm song', 'Write one thing you need'] },
    { title: 'Low-pressure text', minutes: 4, detail: 'Send a simple check-in to someone safe.', steps: ['Pick one person', 'Send “Can I talk for a minute?”', 'Put your phone down while waiting'] },
    { title: 'Light movement', minutes: 6, detail: 'Walk around your room or stretch slowly.', steps: ['Stand up', 'Stretch arms and neck', 'Walk for 3 minutes'] }
  ],
  Angry: [
    { title: 'Cool-down pause', minutes: 4, detail: 'Step away before replying or deciding.', steps: ['Put the phone down', 'Take 6 slow breaths', 'Write what boundary you need'] },
    { title: 'Energy release', minutes: 8, detail: 'Do safe movement to release tension.', steps: ['Walk quickly', 'Shake out your hands', 'Drink water'] },
    { title: 'Unsent message', minutes: 7, detail: 'Write what you want to say without sending it.', steps: ['Write freely', 'Underline the real need', 'Choose one calm sentence'] }
  ],
  Overwhelmed: [
    { title: 'One-task sprint', minutes: 10, detail: 'Pick one task that can move forward today.', steps: ['Write three tasks', 'Circle the smallest one', 'Work for 10 minutes'] },
    { title: 'Clear one surface', minutes: 5, detail: 'Reset a small physical area to reduce visual stress.', steps: ['Pick one desk or chair', 'Remove trash', 'Put three items away'] },
    { title: 'Phone break', minutes: 5, detail: 'Give your brain a short break from scrolling.', steps: ['Set phone face down', 'Look across the room', 'Take slow breaths'] }
  ],
  Panic: [
    { title: 'Feet on the floor', minutes: 3, detail: 'Press your feet down and describe the ground under you.', steps: ['Sit down', 'Press both feet down', 'Name where you are'] },
    { title: 'Cold water reset', minutes: 2, detail: 'Splash cold water on your face or hold a cold cup.', steps: ['Get cold water', 'Notice the temperature', 'Breathe slowly'] },
    { title: 'Safety sentence', minutes: 2, detail: 'Repeat one true sentence about this moment.', steps: ['Name the date', 'Name your location', 'Say “This feeling will pass”'] }
  ],
  Tired: [
    { title: 'Rest your eyes', minutes: 5, detail: 'Close your eyes and let your body settle.', steps: ['Dim your screen', 'Close your eyes', 'Relax your jaw'] },
    { title: 'Gentle stretch', minutes: 6, detail: 'Stretch neck, shoulders, wrists, and back.', steps: ['Roll shoulders', 'Stretch wrists', 'Breathe out slowly'] },
    { title: 'Energy check', minutes: 4, detail: 'Choose what can wait until later.', steps: ['List one must-do', 'List one can-wait', 'Lower one expectation'] }
  ],
  default: [
    { title: '10-minute walk', minutes: 10, detail: 'Walk outside or around your space without multitasking.', steps: ['Put on shoes', 'Walk for 10 minutes', 'Notice three things'] },
    { title: 'Gratitude snapshot', minutes: 4, detail: 'Write three small things that went okay today.', steps: ['Write one person', 'Write one place', 'Write one small win'] },
    { title: 'Warm drink pause', minutes: 7, detail: 'Make tea, cocoa, or water and drink it slowly.', steps: ['Make a drink', 'Sit down', 'Take five slow sips'] }
  ]
};
export const featureCards = [
  { image: emotionWheelUrl, title: 'Emotion Exploration', text: 'Use a wider feeling vocabulary to identify what is happening.' },
  { image: journalUrl, title: 'Journals and Notes', text: 'Write what happened, what you felt, and what you need without judgment.' },
  { image: yogaUrl, title: 'Mindfulness Activity', text: 'Try small body-based activities that can help steady or lift your mood.' }
];
export const resourceLinks = [
  { href: 'https://youtu.be/j7rKKpwdXNE?si=hZhSu72GBqKiXU2b', title: 'Stretch and Relief', tag: 'Stress Relief', className: 'calm', text: '10-minute YouTube yoga stretches to help relieve stress and loosen tension.' },
  { href: 'https://www.youtube.com/live/dnBAU8Co6PA?si=J-u4VaLRCmOt_Npu', title: 'Music Playlist', tag: 'Calm / Focus', className: 'focus', text: 'Soothing instrumental tracks to calm your mind.' },
  { href: 'https://positivepsychology.com/emotion-regulation/', title: 'Emotional Regulation', tag: 'Learn', className: 'learn', text: 'Clear tips to stay balanced, spot triggers, and respond to challenges in healthier ways.' }
];
export const appViews = ['checkin', 'activities', 'games', 'entries', 'calendar', 'summary', 'about', 'newsletter'];
export const viewPaths = {
  home: '/',
  checkin: '/checkin',
  activities: '/activities',
  games: '/games',
  entries: '/entries',
  calendar: '/calendar',
  summary: '/summary',
  about: '/about',
  newsletter: '/newsletter',
  admin: '/admin',
  settings: '/settings'
};
export const navLabels = {
  checkin: 'Check-In',
  activities: 'Activities',
  games: 'Games',
  entries: 'Entries',
  calendar: 'Calendar',
  summary: 'Summary',
  about: 'About',
  newsletter: 'Newsletter',
  admin: 'Admin'
};
export const localEntriesKey = 'journalEntriesV2';

export const createEntry = () => ({
  id: crypto.randomUUID(),
  type: 'checkin',
  created: new Date().toISOString(),
  dateKey: todayKey(),
  mood: '',
  specificFeeling: '',
  intensity: 5,
  factors: [],
  tags: [],
  note: '',
  copingStep: '',
  meals: '',
  water: '',
  sleep: '',
  primary: false
});

export const createFreeWriteEntry = () => ({
  ...createEntry(),
  type: 'journal',
  mood: 'Content',
  specificFeeling: 'Present',
  intensity: 5,
  tags: ['free-write']
});
