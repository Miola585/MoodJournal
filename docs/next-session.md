# Next pickup

Requested November 1, 2026. These are follow-ups, not features to start in this pass.
Do not push, merge, or deploy without explicit permission.

## Memory Jar overhaul

- Refresh the whole jar experience, preserving existing saved memories, dates,
  owner isolation, encryption, and monthly-library links.
- Make the marbles move and settle more naturally, with contained collisions and
  smooth motion that works on phones, tablets, and desktop.
- Explore optional shake/tilt interaction on supported phones. Ask for sensor
  permission only after the user enables it. Never require a shake to access a memory.
- Provide touch/drag and a labeled Shuffle fallback for denied/unavailable sensors,
  desktop use, and accessibility. Respect reduced motion and stop simulation when
  hidden or locked. Do not collect or store sensor readings.
- Browser motion APIs need a secure context; permission requests require a user
  gesture where supported. Test on actual iOS and Android devices before claiming
  support. No new physics dependency without approval.
- Reference: https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent/requestPermission_static

## Sign-in, sign-up, and Profile

- Review the existing Supabase authentication flows and improve sign-in/sign-up.
- Add clear account connection controls in Profile. Clarify whether "disconnect"
  means signing out of this device or unlinking a Google/Apple identity before
  implementing it. It must not silently delete an account or journal data.
- Before unlinking an identity, verify another usable sign-in/recovery path remains.
  Handle unsaved writing, lock/encryption state, owner changes, and shared devices.
- Refresh Profile's hierarchy and mobile/tablet layout while keeping real data and
  accurate storage wording. Do not imply sign-in alone backs up device-only keepsakes.
- Google/Apple provider setup and cloud-backup coverage remain separate planned work.

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
