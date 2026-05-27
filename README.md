# Mood Journal

Mood Journal is a React web app for tracking emotions, journaling, and building healthy regulation habits.

The app is still a work in progress. The current version is frontend-only and stores data in the user's browser with `localStorage`.

## Features

- Daily mood check-in with emotion labels and specific feelings
- Dashboard with today's mood, current streak, and quick check-in
- Mood intensity tracking from 1 to 10
- Context factors like sleep, school, work, family, body, food, and social media
- Journal entries with tags and one small next step
- Search and mood filtering for saved entries
- Entry filtering by keyword, mood, tag, and date
- Edit and delete journal entries
- Monthly calendar with mood emoji markers
- Weekly summary with mood trends, common factors, and average intensity
- Mood intensity chart and pattern summaries
- Mood-based activity suggestions with one main completion checkbox and optional timers
- Home mini games for mood matching, grounding scavenger hunts, and breathing practice
- Guided journaling prompt modes
- Browser notification reminders
- Simple local PIN lock
- Home, About, How It Helps, and resource links before the main app tools
- Separate newsletter sign-up view
- Embedded breathing/mindfulness YouTube video
- Mood-based activities shown immediately after saving a check-in
- Activity timers
- Dark mode, reduced motion, and font settings
- Export/import journal data as JSON

## Tech Stack

- Vite
- React
- CSS
- Browser `localStorage`

## Commands

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Test:

```bash
npm test
```

## Project Structure

- `index.html` - Vite app entry point
- `src/main.jsx` - React startup file
- `src/App.jsx` - main app views and local data logic
- `src/styles.css` - app styling
- `img/` - app images and visual assets
- `vercel.json` - Vercel deployment settings

Older standalone HTML files are still in the repo while the project is being migrated, but the main app now runs through React/Vite. The first screen is the homepage experience, and users enter the journal tools from there.

## Hosting

This project is ready for Vercel.

Use these Vercel settings:

- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

The `vercel.json` file also sets these values and rewrites app routes back to `index.html`, which keeps the single-page app working on refresh.

## Notes

- Data is currently stored locally in each browser.
- For synced accounts and multiple users later, add a backend such as Supabase or Firebase.
- This app is not a crisis service. If someone might hurt themselves or someone else in the U.S., they should call or text 988.
