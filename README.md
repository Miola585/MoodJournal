# Mood Journal

A static wellness website for tracking daily moods, journaling, and healthy habits.

## Features

- Daily mood selection with emoji-based emotion options
- Mood-linked journaling prompts
- Activity and positivity tip generation
- Journal entry saving with local storage
- Daily logs for meals, water, and sleep
- Calendar view with mood badges and editable day details
- Weekly summary with mood counts and health stats
- Export/import data as JSON
- Dark mode and reduced motion toggles

## Files

- `index.html` — homepage with main navigation
- `daily.html` — daily mood selection and inline journaling
- `activities.html` — activity suggestions based on mood
- `tips.html` — positive tips generator
- `journal.html` — journal entry page with dropdown tracking
- `view_entries.html` — browse saved journal entries
- `calendar.html` — calendar overview of mood and daily log history
- `weekly_summary.html` — weekly summary view
- `site.js` — shared JavaScript logic for app features
- `style.css` — site styling and theme variables

## How to use

1. Open `index.html` in a browser to start.
2. Use the navigation buttons to check in, journal, and review your history.
3. Save journal entries to make them available on the calendar and weekly summary.
4. Export data to backup your entries, or import a JSON backup file.

## Hosting

This is a static website and can be hosted on GitHub Pages, Netlify, Vercel, or any static file host.

## Notes

- Data is stored locally in the browser using `localStorage`.
- For multi-user support, add a backend database and authentication.
