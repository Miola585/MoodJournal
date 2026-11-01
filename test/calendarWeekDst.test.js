import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('calendar-week dates stay local across New York DST transitions', () => {
  const source = `import { calendarWeekDays, formatDateKey } from './src/utils/journalUtils.js';
    const weeks = [new Date(2026, 2, 8, 12), new Date(2026, 10, 1, 12)];
    console.log(JSON.stringify(weeks.map((day) => calendarWeekDays(day).map(formatDateKey))));`;
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', source], {
    cwd: process.cwd(),
    env: { ...process.env, TZ: 'America/New_York' },
    encoding: 'utf8'
  });
  assert.deepEqual(JSON.parse(output), [
    ['2026-03-08', '2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-14'],
    ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07']
  ]);
});
