import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Supabase profile policy prevents client-side role promotion', async () => {
  const schema = await readFile(new URL('../docs/supabase-schema.sql', import.meta.url), 'utf8');

  assert.match(schema, /with check \(auth\.uid\(\) = user_id and role = 'user'\)/u);
  assert.match(schema, /revoke update on table public\.profiles from anon, authenticated/u);
  assert.match(schema, /grant update \(username\) on table public\.profiles to authenticated/u);
  assert.doesNotMatch(schema, /create policy "Anyone can read profile usernames"[\s\S]*?using \(true\)/u);
});
