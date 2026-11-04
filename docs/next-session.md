# Next pickup

Requested November 1, 2026. These are follow-ups, not features to start in this pass.
Do not push, merge, or deploy without explicit permission.

## Memory Jar follow-up

Core refresh implemented November 4, 2026 on `feature/memory-jar-refresh`.
Monthly jars, 24-memory capacity, contained Matter.js movement, touch/mouse dragging,
Shuffle, reduced motion, accessible memory lists, and Library links are included.
Existing records remain in owner-scoped private storage; positions are transient.

- Explore optional shake/tilt interaction on supported phones. Ask for sensor
  permission only after the user enables it. Never require a shake to access a memory.
- Provide touch/drag and a labeled Shuffle fallback for denied/unavailable sensors,
  desktop use, and accessibility. Respect reduced motion and stop simulation when
  hidden or locked. Do not collect or store sensor readings.
- Browser motion APIs need a secure context; permission requests require a user
  gesture where supported. Test on actual iOS and Android devices before claiming
  support. Matter.js was approved for the core refresh; sensors remain deferred.
- Reference: https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent/requestPermission_static

## Monthly Personal Night Sky

Clarified November 3, 2026. Planned behavior, not implemented yet.

- The active Personal Night Sky grows from saved days in the current local calendar
  month, rather than gathering all months into one sky.
- At the month boundary, automatically preserve the completed month's sky in that
  month's library book and start a fresh active sky for the new month. No manual
  Save action is required. Resetting the active view must never delete journal entries.
- Handle rollover while the app is open and catch up on the next visit if it was
  closed at month-end. Do not depend on a browser task running while the app is closed.
- Preserve the archived sky's appearance and its links to saved days. Respect owner
  isolation, journal locks, and encryption. If archival needs a storage write, retain
  the source data on failure and offer retry; never clear first or claim a failed save
  succeeded. Repeated rollover checks must not create duplicate archives.
- Before implementation, settle how later edits/deletions of entries affect an
  archived sky, consistent with the library's existing live-data behavior and privacy.

## Sign-in, sign-up, and Profile

- Review the existing Supabase authentication flows and improve sign-in/sign-up.
- Complete sign-out and account-management flows, including clear loading, error,
  recovery, and confirmation states across desktop, tablet, and mobile.
- Add an explicit account-deletion flow, separate from signing out or unlinking.
  Require appropriate identity verification and a clear explanation of what is
  deleted, including the distinction between synced data and device-only keepsakes.
  Offer export before deletion where available. Perform privileged deletion on the
  server, never expose administrative credentials in the browser, and handle partial
  failures without falsely reporting success. Do not delete any account during planning.
- Add clear account connection controls in Profile. Clarify whether "disconnect"
  means signing out of this device or unlinking a Google/Apple identity before
  implementing it. It must not silently delete an account or journal data.
- Before unlinking an identity, verify another usable sign-in/recovery path remains.
  Handle unsaved writing, lock/encryption state, owner changes, and shared devices.
- Refresh Profile's hierarchy and mobile/tablet layout while keeping real data and
  accurate storage wording. Do not imply sign-in alone backs up device-only keepsakes.
- Google/Apple provider setup and cloud-backup coverage remain separate planned work.

## Breathing and journaling time

- Let users choose an optional breathing duration: 1, 3, or 5 minutes, plus a
  scrollable time picker for another duration. Keep the picker usable with keyboard
  and touch input, with clear units and a readable selected value.
- Keep breathing timing consistent with the chosen duration. Preserve pause,
  resume, and finish-early controls; no pressure to complete a session or lose progress.
- Add a way to choose a time to journal. Before implementation, confirm whether this
  means a scheduled time/reminder, an optional writing-session duration, or both.
  Keep this separate from the inactivity lock timeout and avoid forced deadlines.

## Admin dashboard

- Review and improve the real admin dashboard and its supported workflows.
  Agree on the specific dashboard tasks before implementation.
- Preserve authorization checks and keep demo support previews separate from real
  admin tools and data. Do not expose private journal content through dashboard work.

## Navigation and Little breaks polish

- Simplify the Little breaks dropdown to two destinations: All activities and
  Sticker collection. Keep individual games and pauses accessible from the activities
  hub instead of duplicating them in the menu. Apply the same destination list to
  the mobile sheet, while preserving existing direct URLs and active states.
- Simplify the profile-icon menu to three destinations: Profile, Help & feedback,
  and Reminders. Place Preferences, Privacy, and account controls within Profile
  rather than repeating them in the dropdown. Keep About/credits reachable there
  and preserve authorized-only access to real admin tools outside this public menu.
- Review navigation across the app for confusing destinations, duplicate paths,
  missing Back controls, menu dismissal, and correct active states. Preserve browser
  history, direct links, draft warnings, and privacy gates.
- Revisit empty-looking areas in the Little breaks and individual pause screens.
  Compare their hierarchy, spacing, artwork, and controls with the supplied Figma
  references. Preserve intentional breathing room without oversized blank sections
  or filler text, and retain the user's artwork.
- Inspect and correct desktop, tablet, and mobile layouts, including narrow screens,
  reachable actions, menu focus, and bottom-navigation clearance.

## Emotion details and check-in refinement

- Revisit the part of check-in where users add more detail about their emotion.
  Review the current flow together before deciding which fields or interactions
  need changing; the user has flagged this area as needing more work.
- Improve prompts, spacing, and optional-detail controls with concise wording.
  Keep mood-only saving available and avoid making reflection feel like a long form.
- Make selected emotions and specific feelings clearly noticeable across all five
  themes and both modes, without relying on color alone. Reserve dedicated space
  for radio/check indicators so they never cover labels (the supplied screenshot
  shows the checkmark overlapping "Detached"). Keep focus and selected states distinct.
- Review repeated emotion icons, especially Bright, Content, Calm, Excited, Low,
  Overwhelmed, Lonely, and Panic. Use distinct, recognizable expressions with visible
  text labels while preserving the app's cartoon art style; avoid ambiguous symbols.
- Add an "I don't know how I feel" choice so a check-in does not require a precise
  emotion label. Allow optional personal wording without forcing a narrower choice.
  Keep uncertainty distinct from Neutral or Numb, and review how it appears in
  summaries, filters, library pages, and the night sky without assigning an invented
  positive/negative score. Preserve compatibility with existing saved moods.
- Add regression checks for selection visibility, indicator/label separation,
  keyboard and screen-reader states, narrow screens, enlarged text, and saving and
  reopening an uncertain-feeling check-in.
- Preserve existing mood values, exact saved intensity, notes, draft recovery, and
  save/error behavior. Check the experience on desktop, tablet, and mobile.

## Other deferred ideas

- Add an Anger emotion in a later pass. First check existing mood values and labels
  so older entries, check-ins, charts, and filters stay compatible.
- Simple free drawing/coloring with nine selectable colors, including black/white,
  Undo/Clear and explicit saving; not limited to emotional color labels.
- Optional inactivity timeout for the journal interface lock.
- Saved constellation decals as placeable editor stickers.

## Security integration still pending

- `fix/journal-lock-coverage` / `7d99b24`: security diff reviewed; remote CI succeeded;
  eleven privacy/settings browser tests passed locally. GitHub PR creation returned
  403 (integration permission), so no PR was created and nothing was merged.
- Comparison: https://github.com/Miola585/MoodJournal/compare/main...fix/journal-lock-coverage?expand=1
- Ready PR text: `.cache/review-deliverables/journal-lock-pr.md` (local artifact).
- `fix/activity-completion-scope` / `3275db4`: isolated fix for the older Quick
  Activities screen on `main`, with account/day separation, guest migration and
  explicit retry. 102 unit and 76 browser tests passed. Do not restore retired timer
  activities into the studio/library branch when integrating this fix.
- Patch: `.cache/review-deliverables/activity-completion-scope.patch` (local artifact).
  It passed `git apply --check` against the security branch.
- `main` was unprotected when inspected. CI already runs on pull requests, but an
  owner must require **Unit, build, and Chromium**, require an up-to-date branch,
  and disable admin bypass under branch protection. The integration cannot configure
  this. Setup guide: `docs/required-merge-checks.md` on the activity-fix branch.
- Older Grounding Tools still have shared progress keys on `main`; the activity fix
  is limited to Quick Activities. Production Supabase/RLS verification remains open.

## Current studio/library checkpoint

Monthly books, taped keepsakes, page turns, saved constellation previews, smaller
sticky notes, the consolidated Little breaks list, additional constellation stars,
orbit collision avoidance, and compact mobile controls are implemented locally.
Saved free writes are included on ruled notebook paper with a margin line.
Daily check-ins appear as taped notes alongside the
writing, and each entry's stickers stay on that writing page, not the keepsake page.
Keep unrelated artwork source drafts/workbooks and their deletions outside app commits.
The running studio URL is normally http://127.0.0.1:5181/.

Inspected local visual galleries from the implementation pass:
- `.cache/visual-check/monthly-library/gallery.html`
- `.cache/visual-check/game-controls/gallery.html`
