export function normalizeReminder(value) {
  const supplied = Array.isArray(value?.times) && value.times.length ? value.times : [value?.time];
  const times = [...new Set(supplied.filter((time) => typeof time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)))].sort();
  if (!times.length) times.push('19:00');
  return { enabled: value?.enabled === true, time: times[0], times };
}

const slotKey = (date, time) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}:${time}`;

export function nextReminder(value, now, delivered = new Set()) {
  const preferences = normalizeReminder(value);
  if (!preferences.enabled) return null;
  const candidates = preferences.times.map((time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const at = new Date(now);
    at.setHours(hours, minutes, 0, 0);
    // Construct each next day in local time, including daylight-saving transitions.
    while (at <= now || delivered.has(slotKey(at, time))) {
      at.setDate(at.getDate() + 1);
      at.setHours(hours, minutes, 0, 0);
    }
    return { at, key: slotKey(at, time) };
  });
  return candidates.sort((a, b) => a.at - b.at)[0];
}

export function scheduleReminders({ preferences, notify, permission, onError, delivered = new Set(), now = () => new Date(), setTimer = setTimeout, clearTimer = clearTimeout }) {
  let timer;
  let stopped = false;
  const refresh = () => {
    clearTimer(timer);
    if (stopped || permission() !== 'granted') return;
    const slot = nextReminder(preferences, now(), delivered);
    if (!slot) return;
    timer = setTimer(() => {
      if (stopped) return;
      const lateness = now() - slot.at;
      // A suspended tab must not replay old slots when it wakes up.
      if (lateness >= 0 && lateness < 60000 && permission() === 'granted' && !delivered.has(slot.key)) {
        delivered.add(slot.key);
        try { notify(); }
        catch (error) { stopped = true; onError(error); return; }
      }
      refresh();
    }, Math.max(0, slot.at - now()));
  };
  refresh();
  return { refresh, stop: () => { stopped = true; clearTimer(timer); } };
}

export const reminderPermission = () => typeof globalThis.Notification === 'function' ? globalThis.Notification.permission : 'unsupported';

export async function requestReminderPermission(api = globalThis.Notification) {
  if (typeof api !== 'function') return 'unsupported';
  return api.permission === 'default' ? api.requestPermission() : api.permission;
}

export function reminderStatus(enabled, permission, error) {
  if (error) return error;
  if (permission === 'unsupported') return 'Notifications are not supported in this browser.';
  if (permission === 'denied') return 'Notifications are blocked. Change this site\'s browser permission to allow them.';
  if (!enabled) return 'Reminders are off.';
  if (permission !== 'granted') return 'Notification permission is needed before reminders can be delivered.';
  return 'Reminders are on while this app is open.';
}
