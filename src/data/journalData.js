import { todayKey } from '../utils/journalUtils.js';

export const logoUrl = new URL('../../img/JJ.png', import.meta.url).href;
export const emotionWheelUrl = new URL('../../img/Emotion-Wheel.png', import.meta.url).href;
export const journalUrl = new URL('../../img/Journal.png', import.meta.url).href;
export const yogaUrl = new URL('../../img/Yoga.png', import.meta.url).href;
export const sunshineUrl = new URL('../../img/sunshine.png', import.meta.url).href;
export const moods = [
  { key: 'Happy', emoji: '😊', color: '#f2c94c', feelings: ['Joyful', 'Proud', 'Playful', 'Hopeful', 'Loved'], score: 8 },
  { key: 'Content', emoji: '🙂', color: '#43a66b', feelings: ['Settled', 'Comfortable', 'Balanced', 'Safe', 'Present'], score: 7 },
  { key: 'Excited', emoji: '🤩', color: '#f27a24', feelings: ['Eager', 'Inspired', 'Energized', 'Curious', 'Motivated'], score: 8 },
  { key: 'Calm', emoji: '😌', color: '#2aafa1', feelings: ['Peaceful', 'Relaxed', 'Grounded', 'Clear', 'Relieved'], score: 7 },
  { key: 'Anxious', emoji: '😰', color: '#9b5de5', feelings: ['Worried', 'Nervous', 'Unsure', 'Restless', 'Scared'], score: 4 },
  { key: 'Sad', emoji: '😢', color: '#3f6fb5', feelings: ['Disappointed', 'Hurt', 'Grieving', 'Discouraged', 'Heavy'], score: 3 },
  { key: 'Angry', emoji: '😡', color: '#d63c3c', feelings: ['Frustrated', 'Irritated', 'Resentful', 'Betrayed', 'Defensive'], score: 4 },
  { key: 'Lonely', emoji: '😔', color: '#6657a8', feelings: ['Left out', 'Disconnected', 'Unseen', 'Homesick', 'Isolated'], score: 3 },
  { key: 'Grateful', emoji: '🙏', color: '#8da63f', feelings: ['Thankful', 'Appreciative', 'Touched', 'Lucky', 'Supported'], score: 8 },
  { key: 'Tired', emoji: '😴', color: '#8b7868', feelings: ['Drained', 'Sleepy', 'Burned out', 'Foggy', 'Low energy'], score: 4 },
  { key: 'Overwhelmed', emoji: '😵', color: '#d1498b', feelings: ['Stressed', 'Pressured', 'Scattered', 'Stuck', 'Flooded'], score: 3 },
  { key: 'Panic', emoji: '😱', color: '#8e294f', feelings: ['Terrified', 'Shaky', 'Trapped', 'Racing', 'Unsafe'], score: 2 },
  { key: 'Numb', emoji: '😶', color: '#89939b', feelings: ['Blank', 'Detached', 'Flat', 'Distant', 'Frozen'], score: 3 }
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

export const quickActivityGroups = [
  [
    {
      kind: 'body',
      title: 'Let your shoulders go',
      minutes: 2,
      detail: 'Your shoulders may be doing more work than they need to. Let them come down for a moment.',
      steps: ['Bring your shoulders up toward your ears', 'Breathe out and let them fall', 'Do that twice more, then loosen your jaw'],
      notePrompt: 'Did anywhere in your body soften?'
    },
    {
      kind: 'body',
      title: 'Give your hands a break',
      minutes: 2,
      detail: 'Hands hold tension too, especially after typing, scrolling, or gripping things all day.',
      steps: ['Curl your hands into loose fists', 'Open them wide and stretch your fingers', 'Slowly roll each wrist a few times'],
      notePrompt: 'How do your hands feel now?'
    },
    {
      kind: 'body',
      title: 'Look across the room',
      minutes: 3,
      detail: 'Give your eyes a break from whatever has been close in front of you.',
      steps: ['Find the farthest thing you can see', 'Stay with its shape and color for a few breaths', 'Let your eyes wander around the rest of the room'],
      notePrompt: 'What caught your eye?'
    },
    {
      kind: 'body',
      title: 'Feel the floor',
      minutes: 3,
      detail: 'When everything feels a little floaty or tense, let the floor remind you where you are.',
      steps: ['Put both feet flat on the floor', 'Let the chair or wall take some of your weight', 'Press your feet down as you take three slow breaths'],
      notePrompt: 'Do you feel any steadier?'
    }
  ],
  [
    {
      kind: 'reflection',
      title: 'Keep one good moment',
      minutes: 3,
      detail: 'Even on a rough day, there may be one small moment worth keeping.',
      steps: ['Think of something that felt okay, kind, or comforting', 'Write down what happened', 'Add the detail you do not want to forget'],
      notePrompt: 'The moment I want to keep is...'
    },
    {
      kind: 'reflection',
      title: "What's here right now?",
      minutes: 4,
      detail: 'You do not have to explain everything. Just put a few honest words around this moment.',
      steps: ['Start with: Right now, I feel...', 'Add what may have brought this on', 'Name what would help for the next ten minutes'],
      notePrompt: 'Right now...'
    },
    {
      kind: 'reflection',
      title: 'Notice the room',
      minutes: 3,
      detail: 'Come back to the space around you by noticing three ordinary things.',
      steps: ['Find a color you like or keep noticing', 'Listen for the clearest sound nearby', 'Touch something and notice its texture'],
      notePrompt: 'The detail I noticed most was...'
    },
    {
      kind: 'reflection',
      title: 'What helped before?',
      minutes: 4,
      detail: 'You have made it through other hard or tired moments. See if one old support still fits.',
      steps: ['Think of another time you felt something like this', 'Remember one thing that made it a little easier', 'Decide whether you want to try it today'],
      notePrompt: 'Something I could try again is...'
    },
    {
      kind: 'reflection',
      title: 'Set one worry down',
      minutes: 4,
      detail: 'You do not have to solve the whole worry now. Give it somewhere else to sit for a while.',
      steps: ['Write the worry in one plain sentence', 'Circle any piece you can respond to today', 'Give the rest a time to revisit, or mark it not for today'],
      notePrompt: 'The part I can handle today is...'
    }
  ],
  [
    {
      kind: 'action',
      title: 'Just the first step',
      minutes: 4,
      detail: 'Pick one thing you have been avoiding and make the beginning small enough to do now.',
      steps: ['Name the task', 'Choose its first visible action, like opening the file or moving one item', 'Do only that much before deciding whether to continue'],
      notePrompt: 'The first step is...'
    },
    {
      kind: 'action',
      title: 'Clear one little spot',
      minutes: 5,
      detail: 'You do not need to clean the whole room. Make one small patch of it easier to be in.',
      steps: ['Choose one corner, chair, or part of your desk', 'Clear away any rubbish', 'Put three things back where they belong'],
      notePrompt: 'The spot I made calmer was...'
    },
    {
      kind: 'action',
      title: 'Say what you need',
      minutes: 4,
      detail: 'One clear sentence can be easier than carrying a request around in your head.',
      steps: ['Choose who needs to hear from you', 'Write the request or update in one sentence', 'Send it, or save it until you feel ready'],
      notePrompt: 'What I need to say is...'
    },
    {
      kind: 'action',
      title: 'What can wait?',
      minutes: 4,
      detail: 'Not everything asking for your attention has to be handled today.',
      steps: ['Write down the three loudest demands', 'Choose the one that truly needs today', 'Move the others to another day, or ask someone for help'],
      notePrompt: 'I am letting this wait...'
    },
    {
      kind: 'action',
      title: 'Make later easier',
      minutes: 5,
      detail: 'Do one small favor for the version of you who will be here later.',
      steps: ['Think of something you will need to do', 'Put the first thing you will need where you can see it', 'Leave yourself a simple note about when to begin'],
      notePrompt: 'Later will be easier because...'
    },
    {
      kind: 'action',
      title: 'Give it two minutes',
      minutes: 2,
      detail: 'You are only agreeing to begin, not to finish the whole thing.',
      steps: ['Choose one task', 'Start the first physical part of it', 'Stop when the timer ends, or keep going only if it feels okay'],
      notePrompt: 'I gave two minutes to...'
    }
  ]
];

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
  default: quickActivityGroups.flat()
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
  admin: 'Admin',
  settings: 'Settings'
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
  primary: false,
  bookmarked: false
});

export const createFreeWriteEntry = () => ({
  ...createEntry(),
  type: 'journal',
  mood: 'Content',
  specificFeeling: '',
  intensity: 5,
  tags: ['free-write']
});
