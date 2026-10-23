export function ReminderStatus({ controls }) {
  return <div className="reminder-status">
    <p role="status">{controls.status}</p>
    <p>Keep the app open. Browser delivery can be delayed; missed reminders are skipped. Multiple open tabs may each send a reminder.</p>
    {controls.needsAttention && <button disabled={controls.busy} onClick={controls.enable} type="button">Check notifications</button>}
  </div>;
}
