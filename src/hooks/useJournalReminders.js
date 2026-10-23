import { useEffect, useRef, useState } from 'react';
import { normalizeReminder, reminderPermission, reminderStatus, requestReminderPermission, scheduleReminders } from '../utils/reminders.js';

export function useJournalReminders() {
  const [initial] = useState(() => {
    try { return { reminder: normalizeReminder(JSON.parse(localStorage.getItem('journalReminder'))), error: '' }; }
    catch { return { reminder: normalizeReminder(null), error: 'Saved reminder preferences could not be read. Review and save your reminder settings.' }; }
  });
  const [reminder, setReminder] = useState(initial.reminder);
  const [permission, setPermission] = useState(reminderPermission);
  const [error, setError] = useState(initial.error);
  const [busy, setBusy] = useState(false);
  const delivered = useRef(new Set());
  const pending = useRef(false);
  const latest = useRef(reminder);
  latest.current = reminder;
  const deliveryError = () => setError('The browser could not deliver a reminder. Check browser notifications, then try again.');
  const update = (value) => {
    const normalized = normalizeReminder(value);
    try {
      localStorage.setItem('journalReminder', JSON.stringify(normalized));
      setReminder(normalized);
      setError('');
    } catch { setError('Reminder preferences could not be saved. Your previous settings are unchanged.'); }
  };
  const enable = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const next = await requestReminderPermission();
      setPermission(next);
      setError('');
      if (next === 'granted') update({ ...latest.current, enabled: true });
    } catch { setError('Notification permission could not be requested. Please try again.'); }
    finally { pending.current = false; setBusy(false); }
  };
  useEffect(() => {
    const scheduler = scheduleReminders({
      preferences: error ? { ...reminder, enabled: false } : reminder,
      permission: reminderPermission, delivered: delivered.current, onError: deliveryError,
      notify: () => {
        const notification = new Notification('Mood Journal', { body: 'A moment for yourself, whenever you are ready.' });
        notification.onerror = deliveryError;
      }
    });
    const resume = () => { setPermission(reminderPermission()); scheduler.refresh(); };
    const visibility = () => { if (document.visibilityState === 'visible') resume(); };
    const storage = (event) => {
      if (event.key !== 'journalReminder') return;
      try { setReminder(normalizeReminder(JSON.parse(event.newValue))); setError(''); }
      catch { setError('Reminder preferences could not be read. Review your settings.'); }
    };
    window.addEventListener('focus', resume);
    window.addEventListener('pageshow', resume);
    window.addEventListener('storage', storage);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      scheduler.stop();
      window.removeEventListener('focus', resume);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('storage', storage);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [reminder, permission, error]);
  return {
    reminder, update,
    controls: { busy, enable, toggle: () => reminder.enabled ? update({ ...reminder, enabled: false }) : enable(),
      needsAttention: reminder.enabled && (permission !== 'granted' || Boolean(error)),
      status: reminderStatus(reminder.enabled, permission, error) }
  };
}
