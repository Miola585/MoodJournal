# Database backend

Supabase provides the backend; this folder is not a separate application server.
The browser client remains in `src/supabaseClient.js`.

## Files

- `supabase/supabase-schema.sql`: complete schema for a fresh database, including row-level security and journal RPCs.
- `supabase/supabase-security-upgrade.sql`: non-destructive security upgrade for an existing compatible schema. The fresh schema includes the same upgrade.
- `tests/journal-security.sql`: transactional database permission and validation checks.
- `scripts/verify-journal-database.mjs`: runs the SQL checks and simultaneous-write verification using an existing `psql` installation.

## Verification

From the repository root, run `npm test` for Node tests and the production build. These do not contact Supabase.

Real database tests require an approved disposable Supabase-compatible database with the schema installed, connection settings supplied through libpq `PG*` environment variables, and `JOURNAL_TEST_DATABASE=disposable`:

```powershell
node backend/scripts/verify-journal-database.mjs
```

Do not run the database harness against a real-user database. No credentials belong in this folder or in the frontend.

Supabase remains paused. Moving these files does not apply SQL or deploy anything. Real database permission and concurrency tests remain a cloud-release blocker. Follow the [security release checklist](../docs/journal-security-release.md) before any cloud rollout.
