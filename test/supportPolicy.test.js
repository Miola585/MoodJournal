import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('support schema restricts requests and replies to owners and admins', async () => {
  const schema = await readFile(new URL('../docs/supabase-schema.sql', import.meta.url), 'utf8');
  for (const table of ['support_requests', 'support_messages']) {
    assert.match(schema, new RegExp(`alter table public\\.${table} enable row level security`, 'u'));
    assert.match(schema, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`, 'u'));
  }
  assert.match(schema, /grant insert \(user_id, category, title, body, steps, diagnostics\) on table public\.support_requests to authenticated/u);
  assert.match(schema, /grant update \(status, priority\) on table public\.support_requests to authenticated/u);
  assert.doesNotMatch(schema, /grant update on table public\.support_requests to authenticated/u);
  assert.match(schema, /using \(user_id = \(select auth\.uid\(\)\) or \(select public\.current_user_is_admin\(\)\)\)/u);
  assert.match(schema, /with check \(user_id = \(select auth\.uid\(\)\) and status = 'new' and priority = 'normal'\)/u);
  assert.match(schema, /with check \(sender_id = \(select auth\.uid\(\)\) and exists \(/u);
  assert.match(schema, /request\.user_id = \(select auth\.uid\(\)\) or \(select public\.current_user_is_admin\(\)\)/u);
  assert.doesNotMatch(schema, /grant (?:update|delete) on table public\.support_messages to authenticated/u);
});
