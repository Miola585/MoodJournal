import { useState } from 'react';

export function ReminderBell({ reminder, setReminder }) {
  const [open, setOpen] = useState(false);
  const updateFirstTime = (time) => setReminder({ ...reminder, time, times: [time, ...(reminder.times || []).slice(1)] });
  return (
    <section className="reminder-widget">
      <button className={reminder.enabled ? 'bell-button active' : 'bell-button'} onClick={() => setOpen(!open)} type="button" aria-label="Reminder settings">{'\uD83D\uDD14'}</button>
      {open && <div className="reminder-menu">
        <label>Daily reminder
          <input onChange={(event) => updateFirstTime(event.target.value)} type="time" value={reminder.times?.[0] || reminder.time || '19:00'} />
        </label>
        <button onClick={async () => {
          if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
          setReminder({ ...reminder, enabled: !reminder.enabled });
        }} type="button">{reminder.enabled ? 'Turn off' : 'Turn on'}</button>
      </div>}
    </section>
  );
}
