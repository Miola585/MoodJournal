# Mood Journal

Mood Journal is a React web app for tracking emotions, journaling, and building healthy regulation habits.

The app is still a work in progress. The current version supports Supabase email/password accounts for synced journal entries, while display settings still use browser `localStorage`.

## Features

- Daily mood check-in with emotion labels and specific feelings
- Email/password accounts with Supabase and user-selected display usernames
- Auth gate that keeps app tools hidden until sign-in when Supabase is configured
- Password recovery with Supabase reset emails
- Personal admin role support for private testing without journal browsing
- Optional local journal lock to hide entries until a passphrase or PIN is entered
- Private per-user journal entries using Supabase Row Level Security
- Optional import for older local browser entries
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
- Dedicated Games tab with daily breathing, daily scavenger hunt prompts, and one rotating featured game
- Featured games include emotional match, constellation builder, mood garden, memory jar, orbit simulator, and night sky reflection
- Personal night sky, saved constellation gallery, and visual memory jar collection
- Guided journaling prompt modes
- Browser notification reminders
- Simple local PIN lock
- Home, About, How It Helps, and resource links before the main app tools
- Separate newsletter sign-up view
- Embedded breathing/mindfulness YouTube video
- Mood-based activities shown immediately after saving a check-in
- Activity timers
- Dark mode, reduced motion, font settings, and CSS theme choices
- Export/import journal data as JSON

## Tech Stack

- Vite
- React
- CSS
- Supabase Auth and Postgres
- Browser `localStorage` for display settings and local fallback

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

## Supabase Setup

1. Create a Supabase project.
2. In Supabase, open the SQL editor and run `supabase-schema.sql`.
3. In Supabase Auth, keep email/password sign-in enabled.
4. Add these environment variables in Vercel and in a local `.env` file:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. Redeploy on Vercel after adding the environment variables.

Find the Supabase values in **Project Settings > API**:

- Project URL -> `VITE_SUPABASE_URL`
- anon public or publishable key -> `VITE_SUPABASE_ANON_KEY`

Do not use the service role key in this frontend app.

Before testing users, confirm:

- `journal_entries` and `profiles` exist.
- Row Level Security is enabled on both tables.
- The policies from `supabase-schema.sql` are listed under each table.
- Email/password auth is enabled.
- Phone/SMS auth is off unless you intentionally want SMS costs.
- If email confirmation is on, test users must confirm their email before signing in.

To make your own account an admin after signing up, run this in Supabase SQL Editor with your username:

```sql
update public.profiles
set role = 'admin'
where username = 'your_username';
```

The frontend only shows the Admin tab when the signed-in profile has `role = 'admin'`. Admins do not get a normal UI to browse private journal entries.

For password recovery, add both local and deployed app URLs in Supabase under **Authentication > URL Configuration** so reset links can return to the app:

- Local: `http://127.0.0.1:5173/*`
- Deployed: your Vercel URL

## Notes

- Journal entries are cloud-synced only after Supabase environment variables are configured and the user signs in.
- Supabase RLS only allows authenticated users to read, create, update, and delete their own `journal_entries` rows.
- The optional journal lock is a beginner-friendly UI privacy layer on the user's device. It hides/reveals journal content, but it is not full encryption.
- Passwords are handled by Supabase Auth. Do not store passwords in app tables.
- Emails remain part of Supabase Auth for login and account recovery. Usernames are stored in the `profiles` table for display.
- Theme, reduced motion, font settings, reminders, and the local PIN remain local to the browser.
- This app is not a crisis service. If someone might hurt themselves or someone else in the U.S., they should call or text 988.
- `AGENTS.md` and `ROADMAP.md` are intended to stay local and ignored by git.
