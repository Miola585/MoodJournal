# Journal security release checklist

## Current status

Repository hardening only. The paused Supabase project has not been contacted, resumed, migrated, or deployed. Database permission and concurrent-write tests are a cloud-release blocker until they pass on an approved disposable Supabase-compatible database. Static SQL tests and mocked RPC tests do not prove database enforcement.

## Storage contract

- `get_journal_snapshot()` returns `{ revision: string, rows: JournalRow[] }` from one consistent snapshot.
- `save_journal_changes(changed_rows, deleted_ids, expected_revision)` atomically writes changed encrypted entries, explicit deletions, and the next revision. Key initialization and rewrapping use this same path. It returns the revision as a decimal string.
- `replace_journal_entries(replacement_rows, expected_revision, dry_run)` is only for confirmed, nonempty imports. Dry runs execute conversion and constraints inside a rolled-back subtransaction; neither rows nor revisions persist. Preview is not a reservation: execution checks again.
- SQLSTATE `MJ409` means stale revision. The browser preserves the unsaved draft; it does not retry or overwrite automatically. Normal saves are blocked until the conflict is reviewed. Entry drafts can be saved under a fresh ID; deletions/imports must be reviewed again.
- Old direct journal writes and the old two-argument replacement RPC are disabled. Missing upgrade functions produce an explicit unavailable state, not a compatibility fallback.
- Local journals compare complete stored records under a same-origin Web Lock. Plaintext legacy arrays migrate to `{ version: 2, revision, entries }` on a successful save. Encrypted records retain their version-1 format with an added revision. Read/export remains available without Web Locks, but writes require a supporting browser on HTTPS or localhost.
- A browser storage event is not an authorization control. Cloud writes enforce ownership and revision in PostgreSQL. Older local app tabs do not implement the new locking contract: close/reload all old tabs when adopting this version.

## Privacy boundaries

Local guest encryption remains optional. PINs cover the interface, not storage. JSON exports are readable, including the safety export before replacement. Encrypted drafts are account- and tab-scoped; unencrypted drafts are not persisted. Lost browser data cannot be recovered merely by knowing the encryption key.

Support diagnostics are off by default and allow only known page/theme/mode/browser labels and bounded viewport dimensions. Query strings, fragments, raw user agents and storage dumps are excluded. Users can still voluntarily type sensitive information into a support message; diagnostic filtering is not a content scrubber for messages.

## Verification commands

```powershell
npm test
npm run test:e2e
```

For actual database tests, use an existing `psql` installation and an approved disposable Supabase-compatible database. Supply connection credentials through the normal libpq `PG*` environment variables, never frontend variables or committed files. Install the schema there first, then explicitly set `JOURNAL_TEST_DATABASE=disposable` and run:

```powershell
node backend/scripts/verify-journal-database.mjs
```

The role/validation test uses transactional fixtures and rolls back. The concurrency test creates a uniquely identified temporary auth user, races two revision-zero writes in separate connections, and deletes that exact fixture in `finally`. Do not run it against a real-user database. Tests use fake encryption envelope strings only to exercise SQL behavior; browser tests separately exercise real cryptography.

## Later cloud rollout

1. Back up the existing database and export any local journals before changing configuration. Do not delete the paused project as part of this work.
2. Test a fresh schema with `backend/supabase/supabase-schema.sql`. For an existing compatible schema, apply `backend/supabase/supabase-security-upgrade.sql` instead; the embedded upgrade is identical. No journal contents are deleted by the migration.
3. Run the database harness as a privileged test operator. Verify owner, other-user, support-admin and signed-out access; stale writes; atomic rollback; signup normalization/collisions; and diagnostics rejection.
4. Existing invalid diagnostics are retained by a `NOT VALID` constraint. Review them deliberately before validating the constraint; updates to such old reports can be rejected until cleaned. Do not silently delete reports.
5. Apply the approved upgrade before publishing this client. Old clients will lose write access rather than bypass revision checks. Smoke-test sign-in, recovery, two-device conflicts, imports and support triage before declaring cloud ready.

No service-role key belongs in the frontend. No paid service or new dependency is required by this patch.
