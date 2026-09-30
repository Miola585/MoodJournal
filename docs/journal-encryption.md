# Journal encryption

Mood Journal encrypts authenticated users' journal entries in the browser before writing them to Supabase. New accounts use their account password to wrap a random journal data key automatically. Existing accounts without an encryption configuration are stopped before the journal opens and migrated to encrypted storage after account-password confirmation. Local-only browser journals can still enable the same protection in Settings > Privacy.

## What is protected

- A random 256-bit data key encrypts each complete entry with AES-GCM.
- Every entry uses a new random 96-bit IV and authenticates the entry ID as additional data.
- The user's account password (or a separately chosen legacy journal passphrase) derives a wrapping key with PBKDF2-SHA-256 (600,000 iterations).
- A separately generated recovery key wraps the same data key independently.
- The raw data key and passphrase are held only in page memory while the journal is unlocked.
- Mood, title, writing, tags, factors, journal date, entry type, and other entry fields are inside the encrypted payload.
- Reflective data kept only on the device, including activity notes, Memory Jar text, constellation names, and Mood Orbit state, is encrypted with the same unlocked data key and separated by account.
- Supabase receives neutral placeholder values for required searchable columns.
- Plaintext is never written to application logs by the encryption code.
- Enabling encryption, changing the passphrase, or manually locking sends a same-origin storage notification so other open tabs reload into the locked state.

Encryption envelopes are versioned so a future migration can retain backward compatibility.

## Recovery behavior

The recovery key is displayed once when encryption is created, and the user must confirm that it was stored somewhere private and safe before entering the journal. It is not stored in the database or localStorage. Losing both the password/passphrase and recovery key makes the journal contents unrecoverable, including by the app administrator.

Account-password resets require the recovery key when an encrypted journal already exists. The browser uses it to recover the journal data key, updates the Supabase Auth password, and re-wraps the journal key with the new password. The recovery key itself does not change.

After unlocking with a recovery key, the user can set a new passphrase in Settings without re-encrypting every entry or changing the recovery key.

## Multiple devices

No additional sync provider is required. Supabase stores the encrypted entry rows and wrapped journal key configuration. A second phone or computer signs into the same account, downloads the ciphertext, and unwraps the journal key locally with the account password or recovery key. Account sessions remain independent per device when the app uses local-scope sign-out.

Activity and game reflections described below remain device-local and do not yet migrate between devices.

## Account passwords

Mood Journal never stores an account password in its own tables or browser storage. Supabase Auth receives it over HTTPS and stores a salted bcrypt hash. The browser holds the password briefly in component memory during sign-in and journal-key derivation, then clears it. Passwords are not reversibly encrypted or copied into journal rows.

If an authenticated account still has older local-only plaintext entries waiting to be imported, setup stops and asks the user to import them first. A successful import removes that old browser copy before encryption can be enabled. Local-only encrypted data stores the wrapped-key configuration and ciphertext rows in one versioned localStorage record to avoid a partial two-write state.

Older plaintext activity notes and game reflections are migrated into encrypted, account-scoped browser storage when encryption is enabled. These game/activity records remain device-local and do not sync through Supabase. The recovery key can decrypt them only when their ciphertext is still present on that device or in a device backup.

## What is not hidden

The storage provider can still observe the account, number of encrypted records, padded ciphertext sizes, and service usage timing. An unlocked journal can also be read by malicious browser extensions, malware, or JavaScript delivered by a compromised deployment. These are limitations of a hosted browser application, not failures of AES-GCM.

The Vercel configuration adds a restrictive Content Security Policy and related response headers to reduce script-injection exposure. Deployment access, dependencies, Supabase keys, and account security still need normal operational review.

The optional app PIN and journal lock are screen-hiding conveniences, not cryptographic controls. Activity completion flags and display preferences remain readable local metadata. JSON exports are intentionally readable after unlock and must be stored as carefully as the journal itself.

## Database access

Supabase Row Level Security remains enabled and restricts normal browser access to rows owned by `auth.uid()`. Encryption is a separate defense because privileged database roles can bypass RLS. Database administrators should see ciphertext and neutral placeholders, not readable journal content.

## Verification

The dependency-free Node tests cover:

- encryption/decryption round trips
- absence of sensitive entry fields in serialized rows
- neutralized date metadata
- wrong-passphrase failure
- recovery-key unlock
- passphrase changes that preserve existing entries and recovery access
- versioned configuration serialization
- rejection of malformed or unreasonable encryption settings before expensive key derivation
- encrypted, account-separated local reflection storage and legacy migration
- bounded, normalized journal backup imports
