# Mood Journal

Mood Journal is a calming journaling and emotional wellness web app built with React, Vite, and Supabase.

The goal of the app is to create a warm, personal space where users can reflect on emotions, build healthy habits, and interact with relaxing activities designed around mindfulness and emotional awareness.

## Features

### Journaling & Mood Tracking

* Daily mood check-ins
* Mood intensity tracking
* Journal entries with tags and reflections
* Search and filtering
* Calendar-based mood history
* Weekly summaries and mood insights

### Wellness Activities & Games

* Guided breathing exercises
* Daily scavenger hunts
* Emotional matching game
* Memory jar
* Mood garden
* Constellation builder
* Orbit simulator
* Night sky reflection activities

### Accounts & Privacy

* Supabase email/password authentication
* Per-user private journal entries
* Row Level Security (RLS)
* Optional local journal PIN/passphrase lock
* Password recovery support

### Customization

* Multiple visual themes
* Dark mode
* Reduced motion mode
* Font settings
* Responsive design

## Local Output

Local generated files live under the ignored `.cache/` folder: npm data in `npm/`, temporary browser profiles in `browser-profiles/`, and screenshots and Playwright output in `visual-check/`. Keep future manual browser captures there as well. Existing private illustrated guides are also retained in `visual-check/`; do not delete that folder wholesale. Standard tool folders such as `node_modules/` and `dist/` remain at the root.

## Tech Stack

* React
* Vite
* CSS
* Supabase Auth
* Supabase Postgres
* Vercel

## Local Setup

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Automated Checks

Use Node.js 24 (the supported range is `>=22 <25`). `npm test` runs the Node tests and production build. Browser tests are separate:

```bash
npx playwright install chromium
npm run test:e2e
```

GitHub Actions runs both commands on pushes and pull requests, using `npm ci`, cached npm downloads, and Chromium with its Linux system dependencies. Playwright starts Vite on port 5181; do not start a second server for CI. Failed browser runs retain traces, and reports are available in the `chromium-test-results` workflow artifact for seven days. No Supabase secrets or live database are needed for this suite.

Weekly Summary loads on demand through the existing route loading boundary. Its Recharts code is built into the separate `Summary-*.js` chunk. The browser tests cover deferred loading, direct links, mobile charts, and previous/next week navigation.

## Supabase Setup

Create a `.env` file:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Then run the SQL schema inside Supabase SQL Editor.
Database files and verification instructions are in [backend/README.md](backend/README.md).
The fresh-install schema is [backend/supabase/supabase-schema.sql](backend/supabase/supabase-schema.sql).

The feedback inbox uses the `support_requests` and `support_messages` tables in that schema. After applying it, assign your own account the `admin` role in the Supabase SQL Editor or dashboard; the browser cannot grant admin access. Requests and replies are delivered through Supabase only when accounts are configured. No screenshots, journal entries, or device details are sent automatically.

## Deployment

This project is configured for Vercel deployment.

Recommended settings:

* Framework Preset: Vite
* Build Command: `npm run build`
* Output Directory: `dist`

## Privacy Notes

* Journal entries are private to the authenticated user.
* Supabase Row Level Security prevents users from accessing other users’ data.
* The optional local lock feature is a UI privacy layer and not full encryption.
* Passwords are handled securely through Supabase Auth.

## Project Status

Mood Journal is currently in active development.

Planned improvements include:
* Enhanced analytics
* More relaxing activities and games
* Additional theme systems
* Mobile optimization

## Documentation

Additional documentation can be found in the `docs/` folder.

## Disclaimer

Mood Journal is not a crisis or emergency service.

If someone may harm themselves or others in the U.S., call or text 988.
