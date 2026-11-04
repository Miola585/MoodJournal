# Activity completion storage

Quick Activities progress belongs to a private-storage owner and a local calendar day.
The logical key remains `activityCompletions:YYYY-MM-DD`; private storage adds the
owner namespace and encrypts the record when stored-entry encryption is enabled.

- Loading progress never writes an empty snapshot. Only explicit completion changes
  (including finishing the existing timer) write progress, using the private-store lock.
- A local-midnight timer and foreground checks refresh the date. The screen remounts
  on owner/day changes, resetting activity timers and state. Event handlers also check
  the current date before saving, so a suspended tab cannot copy yesterday into today.
- Pending reads and queued mutations are invalidated when the owner/day changes.
  An already-started encrypted write retains its original owner/day key.
- Unknown legacy, unscoped records are never attributed to a signed-in account.
  They remain available to the local guest through the existing guest migration.
  Existing scoped records take precedence. No legacy account identity is guessed.
- Read failures disable completion changes and offer Retry. Failed writes leave the
  saved checkmark unchanged and offer Retry for the requested change.
- This patch does not migrate the older Grounding Tools progress keys or change
  journal data, authentication, RLS, or cloud storage.

## Verification

```powershell
npm test
npm run lint
npm run test:e2e -- --workers=1 --forbid-only
```

`e2e/activityCompletionScope.spec.js` mounts the real Activities screen and private
storage with distinct owner IDs; it does not contact Supabase or create test accounts.
It covers guest/owner separation, local midnight, stale clicks, delayed operations,
read/write failures, and same-day persistence. `e2e/activities.spec.js` still exercises
the normal application route. Private-storage unit tests cover encrypted migration.

The local studio/library branch has retired timed Quick Activities. This fix targets
the older implementation on `main`; do not restore the retired screen when porting it.
