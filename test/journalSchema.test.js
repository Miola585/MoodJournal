import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('fresh schema and standalone upgrade install identical security functions', () => {
  const schema = readFileSync('backend/supabase/supabase-schema.sql', 'utf8').replaceAll('\r\n', '\n');
  const upgrade = readFileSync('backend/supabase/supabase-security-upgrade.sql', 'utf8').replaceAll('\r\n', '\n').trim();
  assert.equal(schema.slice(schema.indexOf('-- Journal security upgrade.')).trim(), upgrade);
  assert.match(upgrade, /revoke all on public\.journal_entries from public, anon, authenticated/);
  assert.match(upgrade, /for update/);
  assert.match(upgrade, /current_revision <> expected_revision/);
  assert.match(upgrade, /exception when sqlstate 'MJDRY'/);
  assert.match(upgrade, /drop function if exists public\.replace_journal_entries\(jsonb, boolean\)/);
  assert.doesNotMatch(schema, /lower\(regexp_replace/);
});
