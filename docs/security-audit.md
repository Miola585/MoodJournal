# Security audit

Audit date: 2026-09-30

This is an application-level review of the current client, browser storage, Supabase schema, deployment headers, imports/exports, and dependency tree. It is not an independent penetration test or formal cryptographic certification.

## Fixed findings

### Critical: profile role self-promotion

The previous profile update policy allowed a signed-in user to update every column in their own row, including `role`. Because the app uses that role to expose the admin route, a user could promote themselves to admin through the Supabase API.

The schema now:

- limits profile updates to the `username` column
- requires newly inserted profiles to use the `user` role
- limits profile reads to the owner or a verified admin
- uses a protected `current_user_is_admin()` database function for admin checks

Run the complete `docs/supabase-schema.sql` in the Supabase SQL Editor before launch. Updating this repository does not change an already deployed database by itself.

### High: vulnerable locked dependencies

The lockfile contained advisories affecting Vite, PostCSS/Nanoid, and React Router. The affected packages were updated within their existing major versions. `npm audit --omit=dev` now reports zero known vulnerabilities.

### Medium: unbounded encrypted configuration

Encrypted configuration and ciphertext envelopes were accepted with too little structural validation. A modified PBKDF2 iteration count could cause excessive browser work. KDF settings, key-wrap sizes, IVs, payload versions, and encrypted payload sizes are now bounded and validated before cryptographic work.

### Medium: unsafe backup imports

Imports previously accepted any JSON array without size, shape, date, field, or duplicate-ID checks. Imports are now limited to 5 MB and 5,000 entries, normalized to known fields, and rejected when malformed.

### Medium: reflective browser data outside encryption

Activity notes, Memory Jar text, constellation names, and Mood Orbit state used ordinary shared localStorage keys. They now use account-scoped storage and the journal data key when stored-content encryption is on. Existing values migrate when encryption is enabled or when a feature is next opened.

### Defense in depth

The Vercel policy now blocks object embedding and inline script attributes, isolates the top-level browsing context, denies framing, limits connections to the app and Supabase, and disables camera, microphone, and geolocation access.

## Required deployment checks

1. Run `docs/supabase-schema.sql` against the production project and verify RLS is enabled on both tables.
2. Test with two ordinary accounts: each account must be unable to select, update, or delete the other account's entries and profile.
3. Confirm an ordinary account cannot update `profiles.role`; only a trusted server/service process or manual administrator operation should assign admins.
4. Enable email verification, a server-side password minimum of at least eight characters, leaked-password protection, and appropriate auth rate limits in Supabase.
5. Require MFA for Supabase, Vercel, source-control, and domain accounts. Keep production access limited to people who need it.
6. Keep preview deployments and environment variables private. Never place the Supabase service-role key in a `VITE_` variable or browser bundle.
7. Test the deployed response headers, password recovery flow, encrypted setup/unlock/recovery, export warnings, and cross-account isolation.
8. Arrange an independent security review before making a public claim that the product is audited or guarantees end-to-end encryption.

## Remaining limitations

- A compromised deployment can serve JavaScript that reads content after the user unlocks it. Browser extensions and malware can do the same.
- Account existence, encrypted record count, access timing, and padded ciphertext size remain visible to infrastructure providers.
- App PIN and journal-lock values are local interface barriers, not encryption keys.
- Readable JSON exports leave the encrypted boundary.
- Activity completion flags, display preferences, and reminder times remain local plaintext metadata.
- Lost passphrases and recovery keys cannot be recovered by administrators.
