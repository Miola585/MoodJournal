import test from 'node:test';
import assert from 'node:assert/strict';
import { nextReminder, normalizeReminder, reminderStatus, requestReminderPermission, scheduleReminders } from '../src/utils/reminders.js';

const date = (day, hour, minute = 0, second = 0) => new Date(2026, 0, day, hour, minute, second);
function clock(start, options = {}) {
  let current = start;
  let task;
  const notices = [];
  const errors = [];
  const delivered = new Set();
  const scheduler = scheduleReminders({
    preferences: { enabled: true, times: ['09:00', '19:00'] },
    now: () => current, permission: () => 'granted', delivered,
    setTimer: (run, delay) => { task = { run, at: new Date(+current + delay) }; return task; },
    clearTimer: () => { task = undefined; },
    notify: () => notices.push(current), onError: (error) => errors.push(error), ...options
  });
  return { scheduler, notices, errors, delivered, next: () => task?.at,
    move: (at) => { current = at; }, fire: () => { const run = task?.run; task = undefined; run?.(); } };
}

test('reminder preferences validate, deduplicate and preserve legacy time', () => {
  assert.deepEqual(normalizeReminder({ enabled: true, times: ['25:00', '09:00', '09:00', '4:20', null, '19:70'] }), { enabled: true, time: '09:00', times: ['09:00'] });
  assert.deepEqual(normalizeReminder({ time: '08:30', enabled: true }).times, ['08:30']);
  assert.deepEqual(normalizeReminder({ times: [false], enabled: 'false' }), { enabled: false, time: '19:00', times: ['19:00'] });
});
test('multiple daily deliveries reschedule for the next slot and next local day', () => {
  const c = clock(date(1, 8));
  assert.deepEqual(c.next(), date(1, 9));
  c.move(date(1, 9)); c.fire();
  assert.deepEqual(c.next(), date(1, 19));
  c.move(date(1, 19)); c.fire();
  assert.deepEqual(c.next(), date(2, 9));
  assert.equal(c.notices.length, 2);
});
test('sleep skips missed notifications both on delayed timers and resume', () => {
  const c = clock(date(1, 8));
  c.move(date(1, 15)); c.fire();
  assert.equal(c.notices.length, 0);
  assert.deepEqual(c.next(), date(1, 19));
  c.move(date(2, 10)); c.scheduler.refresh();
  assert.deepEqual(c.next(), date(2, 19));
});
test('disabling, stopping and denied permissions do not schedule delivery', () => {
  assert.equal(nextReminder({ enabled: false }, date(1, 8)), null);
  assert.equal(clock(date(1, 8), { permission: () => 'denied' }).next(), undefined);
  const c = clock(date(1, 8)); c.scheduler.stop(); c.move(date(1, 9)); c.fire();
  assert.equal(c.notices.length, 0);
});
test('same-tab delivered slots are not repeated after clock changes or settings refresh', () => {
  const c = clock(date(1, 8)); c.move(date(1, 9)); c.fire();
  c.move(date(1, 8, 59)); c.scheduler.refresh();
  assert.deepEqual(c.next(), date(1, 19));
  assert.equal(c.notices.length, 1);
});
test('notification construction failure is visible and stops the schedule', () => {
  const c = clock(date(1, 8), { notify: () => { throw new Error('delivery failed'); } });
  c.move(date(1, 9)); c.fire();
  assert.equal(c.errors[0].message, 'delivery failed');
  assert.equal(c.next(), undefined);
  assert.equal(reminderStatus(true, 'granted', 'Delivery failed'), 'Delivery failed');
});
test('permission is requested only explicitly and denial is not treated as enabled', async () => {
  let requests = 0;
  class API { static permission = 'default'; static requestPermission() { requests++; return Promise.resolve('denied'); } }
  clock(date(1, 8), { permission: () => API.permission });
  assert.equal(requests, 0);
  assert.equal(await requestReminderPermission(API), 'denied');
  assert.equal(requests, 1);
  API.permission = 'denied';
  assert.equal(await requestReminderPermission(API), 'denied');
  assert.equal(requests, 1);
  assert.equal(await requestReminderPermission(null), 'unsupported');
  assert.match(reminderStatus(true, 'denied'), /blocked/);
});
test('permission revoked before a timer fires prevents notification', () => {
  let permission = 'granted';
  const c = clock(date(1, 8), { permission: () => permission });
  permission = 'denied'; c.move(date(1, 9)); c.fire();
  assert.equal(c.notices.length, 0);
  assert.equal(c.next(), undefined);
});

function inNewYork(run) {
  const previousTimezone = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try { run(); }
  finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
}

test('fall-back schedules the second 1:30 AM but never delivers one daily slot twice', () => inNewYork(() => {
  const preferences = { enabled: true, times: ['01:30'] };
  const first = new Date('2026-11-01T05:30:00Z');
  const second = new Date('2026-11-01T06:30:00Z');
  const tomorrow = new Date('2026-11-02T06:30:00Z');
  assert.deepEqual(nextReminder(preferences, new Date('2026-11-01T05:10:00Z')).at, first);
  assert.deepEqual(nextReminder(preferences, new Date('2026-11-01T06:10:00Z')).at, second);

  const c = clock(new Date('2026-11-01T05:10:00Z'), { preferences });
  c.move(first); c.fire();
  assert.deepEqual(c.next(), tomorrow);
  c.move(new Date('2026-11-01T06:10:00Z')); c.scheduler.refresh();
  assert.deepEqual(c.next(), tomorrow);
  assert.equal(c.notices.length, 1);
  assert.deepEqual(nextReminder(preferences, new Date('2026-11-01T06:10:00Z'), c.delivered).at, tomorrow);
}));

test('spring-forward keeps the local reminder at the first available 3:30 AM', () => inNewYork(() => {
  const preferences = { enabled: true, times: ['02:30'] };
  const shifted = new Date('2026-03-08T07:30:00Z');
  const tomorrow = new Date('2026-03-09T06:30:00Z');
  assert.deepEqual(nextReminder(preferences, new Date('2026-03-08T06:50:00Z')).at, shifted);
  assert.deepEqual(nextReminder(preferences, new Date('2026-03-08T07:10:00Z')).at, shifted);
  assert.deepEqual(nextReminder(preferences, new Date('2026-03-08T07:40:00Z')).at, tomorrow);
}));
