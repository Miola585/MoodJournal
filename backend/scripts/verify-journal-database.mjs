import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

// Explicit database verification uses existing psql and libpq PG* variables.
// This script deliberately does not create projects or apply migrations.
if (process.env.JOURNAL_TEST_DATABASE !== 'disposable') {
  throw new Error('Use only an isolated test database. Set JOURNAL_TEST_DATABASE=disposable and the PG* connection variables explicitly.');
}
const run = (sql) => new Promise((resolve, reject) => {
  const child = spawn('psql', ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1'], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  child.on('error', reject);
  child.on('close', (code) => code === 0 ? resolve(output) : reject(new Error(output)));
  child.stdin.end(sql);
});
await run(await readFile(new URL('../tests/journal-security.sql', import.meta.url), 'utf8'));
const owner = randomUUID();
const configId = `journal-encryption-config:${owner}`;
const row = { id: configId, user_id: owner, entry_type: 'checkin', created: '1970-01-01T00:00:00Z', date_key: '1970-01-01', mood: 'Encrypted', specific_feeling: '', intensity: 5, factors: [], tags: [], note: 'mj-e2ee-config:v1:test-only', coping_step: '', meals: '', water: '', sleep: '', primary: false, mood_score: null, updated_at: '1970-01-01T00:00:00Z' };
try {
  await run(`insert into auth.users(id,email) values ('${owner}','${owner}@security.invalid');`);
  const statement = `begin; set local role authenticated; select set_config('request.jwt.claim.sub','${owner}',true); select public.save_journal_changes('${JSON.stringify([row])}'::jsonb,'{}',0); select pg_sleep(0.3); commit;`;
  const results = await Promise.allSettled([run(statement), run(statement)]);
  if (results.filter((result) => result.status === 'fulfilled').length !== 1
    || !results.some((result) => result.status === 'rejected' && /journal changed/i.test(result.reason.message))) {
    throw new Error('Concurrent stale writes did not produce exactly one commit and one conflict.');
  }
  console.log('Database role, validation, rollback, signup, diagnostics and concurrent-write checks passed.');
} finally {
  await run(`delete from auth.users where id='${owner}';`);
}
