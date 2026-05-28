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

## Supabase Setup

Create a `.env` file:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Then run the SQL schema inside Supabase SQL Editor.

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
